/** === ediTable.js ===
 * A simple MS Excel-like table editor for HTML
 * Copyright (c) 2016 Jordan Hendrickson, Tanner Nielsen
 *
 * DEPENDENCIES:
 *     jQuery - https://jquery.com
 */
(function () {
    "use strict";

    // FIX STUPID STUFF
    Number.prototype.mod = function (n) {
        return ((this % n) + n) % n;
    };

    // UTILITIES
    function arrayTranspose(array) {
        array = array[0].map(function (col, i) {
            return array.map(function (row) {
                return row[i]
            });
        });

        return array;
    }

    function toArray(arrayLikeItem) {
        return Array.apply(null, arrayLikeItem);
    }

    function tableToArray(table) {
        var rows = table.rows,
            arr = [];

        for (var i = 0; i < rows.length; i++) arr[i] = toArray(rows[i].cells);

        return arr;
    }

    function forEach(ops) {
        // Normalize ops
        if (typeof ops == "undefined" ||
            typeof ops.func == "undefined" ||
            typeof ops.arr == "undefined" ||
            ops.arr.length == 0) return;
        if (typeof ops.start == "undefined") ops.start = 0;
        if (typeof ops.end == "undefined") ops.end = ops.arr.length - 1;
        if (typeof ops.dir == "undefined") ops.dir = (ops.end > ops.start) ? 1 : -1;
        if (typeof ops.funcContext == "undefined") ops.funcContext = null;

        // Loop through and run ops.func for each item in ops.arr
        var min = Math.min(ops.start, ops.end),
            max = Math.max(ops.start, ops.end),
            i = (ops.dir > 0) ? min : max;
        while (i >= min && i <= max) {
            ops.func.apply(ops.funcContext, [ops.arr[i], i]);
            i += ops.dir;
        }
    }

    function forEach2D(ops) {
        // Normalize parameters
        if (typeof ops == "undefined" ||
            typeof ops.func == "undefined" ||
            typeof ops.arr == "undefined" ||
            ops.arr.length == 0 || !is2DArray(ops.arr)) return;
        if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
        if (typeof ops.colStart == "undefined") ops.colStart = 0;
        if (typeof ops.rowEnd == "undefined") ops.rowEnd = ops.arr.length - 1;
        if (typeof ops.colEnd == "undefined") ops.colEnd = ops.arr[0].length - 1;
        if (typeof ops.rowDir == "undefined") ops.rowDir = (ops.rowEnd > ops.rowStart) ? 1 : -1;
        if (typeof ops.colDir == "undefined") ops.colDir = (ops.colEnd > ops.colStart) ? 1 : -1;
        if (typeof ops.funcContext == "undefined") ops.funcContext = null;

        forEach({
            arr: ops.arr,
            start: ops.rowStart,
            end: ops.rowEnd,
            dir: ops.rowDir,
            func: function (row) {
                forEach({
                    arr: row,
                    start: ops.colStart,
                    end: ops.colEnd,
                    dir: ops.colDir,
                    func: function (cell) {
                        ops.func.apply(ops.funcContext, [cell]);
                    }
                });
            }
        })
    }

    function flatten(array, mutable) {
        var toString = Object.prototype.toString;
        var arrayTypeStr = '[object Array]';

        var result = [];
        var nodes = (mutable && array) || array.slice();
        var node;

        if (!array.length) {
            return result;
        }

        node = nodes.pop();

        do {
            if (toString.call(node) === arrayTypeStr) {
                nodes.push.apply(nodes, node);
            } else {
                result.push(node);
            }
        } while (nodes.length && (node = nodes.pop()) !== undefined);

        result.reverse();
        return result;
    }

    function forEachTableCell(ops) {
        if (typeof ops.table != "undefined") ops.arr = tableToArray(ops.table);

        var first = null,
            last = null,
            userFunc = ops.func,
            func = function (cell, index) {
                last = cell;

                if (!first) first = cell;

                userFunc(cell, index);
            };
        ops.func = func;
        forEach2D(ops);

        return {
            first: first,
            last: last
        }
    }

    function is2DArray(thing) {
        if (!(thing instanceof Array)) return false;

        var length = (thing.length > 0 && thing[0] instanceof Array) ? thing[0].length : 0;
        for (var i = 1; i < thing.length; i++) {
            var innerThing = thing[i];
            if (!(innerThing instanceof Array)) return false;
            if (innerThing.length != length) return false;
        }

        return true;
    }

    function selectText(element) {
        if (document.body.createTextRange) {
            var range = document.body.createTextRange();
            range.moveToElementText(element);
            range.select();
        } else if (window.getSelection) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    function getCaretPosition(editableDiv) {
        var caretPos = 0, containerEl = null, sel, range;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount) {
                range = sel.getRangeAt(0);
                if (range.commonAncestorContainer.parentNode == editableDiv) {
                    caretPos = range.endOffset;
                }
            }
        } else if (document.selection && document.selection.createRange) {
            range = document.selection.createRange();
            if (range.parentElement() == editableDiv) {
                var tempEl = document.createElement("span");
                editableDiv.insertBefore(tempEl, editableDiv.firstChild);
                var tempRange = range.duplicate();
                tempRange.moveToElementText(tempEl);
                tempRange.setEndPoint("EndToEnd", range);
                caretPos = tempRange.text.length;
            }
        }
        return caretPos;
    }

    function deselectText() {
        if (document.selection) {
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    function normalizeTable(table) {
        var rows = $("tr", table).toArray(),
            lengths = rows.map(function (row) {
                return row.cells.length;
            }),
            max = Math.max.apply(null, lengths);

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i],
                tds = $("td", row).toArray(),
                ths = $("th", row).toArray(),
                diff = max - (tds.length + ths.length);

            if (diff > 0) {
                var type = (tds.length == 0 ? "th" : "td"),
                    cells = new Array(diff);
                for (var j = 0; j < diff; j++) {
                    cells[j] = document.createElement(type);
                }
                $(row).append(cells);
            }
        }
    }

    function fixTableMinMax(ctx) {
        var ops = ctx.options;

        // Ensure maxes are good
        if (ops.maxRows > -1) {
            while (ctx.getRowCount() > ops.maxRows) {
                ctx.removeRow(ctx.getRowCount() - 1);
            }
        }
        if (ops.maxCols > -1) {
            while (ctx.getColCount() > ops.maxCols) {
                ctx.removeCol(ctx.getColCount() - 1);
            }
        }

        // Ensure mins are good
        while (ctx.getRowCount() < ops.minRows) {
            ctx.insertRow(ctx.getRowCount());
        }
        while (ctx.getColCount() < ops.minCols) {
            ctx.insertCol(ctx.getColCount());
        }
    }

    function growTable(ctx) {
        var ops = ctx.options,
            vm = ctx.VectorManager;

        // Grow rows
        var lastRowClear = vm.isClear(ctx.getRow(ctx.getRowCount() - 1));
        if (!lastRowClear && ctx.rowsCanGrow()) ctx.insertRow(ctx.getRowCount());
        // Grow cols
        var lastColClear = vm.isClear(ctx.getCol(ctx.getColCount() - 1));
        if (!lastColClear && ctx.colsCanGrow()) ctx.insertCol(ctx.getColCount());
    }

    function shrinkTable(ctx) {
        var ops = ctx.options,
            vm = ctx.VectorManager;

        // Shrink rows
        if (ops.shrinkRows) {
            if (ops.rowsAllowMiddleShrink) {
                var i = 0;
                while (ctx.getRowCount() > ops.minRows) {
                    var rowStart = ctx.getRowCount() - (ops.growRows ? 2 : 1),
                        rowIndex = rowStart - i;
                    if (rowIndex >= 0 && vm.isClear(ctx.getRow(rowIndex))) {
                        ctx.removeRow(rowIndex);
                    } else {
                        i++;
                    }

                    if (rowIndex == 0) break;
                }
            } else {
                while (ctx.getRowCount() > ops.minRows) {
                    var rowIndex = ctx.getRowCount() - (ops.growRows ? 2 : 1);
                    if (rowIndex >= 0 && vm.isClear(ctx.getRow(rowIndex))) {
                        ctx.removeRow(rowIndex);
                    } else {
                        break;
                    }
                }
            }
        }
        // Shrink cols
        if (ops.shrinkCols) {
            if (ops.colsAllowMiddleShrink) {
                var i = 0;
                while (ctx.getColCount() > ops.minCols) {
                    var colStart = ctx.getColCount() - (ops.growCols ? 2 : 1),
                        colIndex = colStart - i;
                    if (colIndex >= 0 && vm.isClear(ctx.getCol(colIndex))) {
                        ctx.removeCol(colIndex);
                    } else {
                        i++;
                    }

                    if (colIndex == 0) break;
                }
            } else {
                while (ctx.getColCount() > ops.minCols) {
                    var colIndex = ctx.getColCount() - (ops.growCols ? 2 : 1);
                    if (colIndex >= 0 && vm.isClear(ctx.getCol(colIndex))) {
                        ctx.removeCol(colIndex);
                    } else {
                        break;
                    }
                }
            }
        }
    }

    function elementIsInViewport(el) {
        if (typeof jQuery === "function" && el instanceof jQuery) el = el[0];

        var rect = el.getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= $(window).height() &&
            rect.right <= $(window).width()
        );
    }

    function scrollIntoViewIfNecessary(el) {
        if (!elementIsInViewport(el)) el.scrollIntoView();
    }

    /**
     * Represents a table by wrapping around an HTML table.
     *
     * @param{HTMLTableElement} - HTML table for the new EdiTable to wrap around
     * @param{Object} - contains various options for the new EdiTable
     */
    var EdiTable = function (table, optOptions) {
        // Utitilites
        function normalizeOptions(ops) {
            // Define the undefined
            if (typeof ops.minRows == "undefined") ops.minRows = 1;
            if (typeof ops.minCols == "undefined") ops.minCols = 1;
            if (typeof ops.maxRows == "undefined") ops.maxRows = -1;
            if (typeof ops.maxCols == "undefined") ops.maxCols = -1;
            if (typeof ops.growRows == "undefined") ops.growRows = false;
            if (typeof ops.growCols == "undefined") ops.growCols = false;
            if (typeof ops.shrinkRows == "undefined") ops.shrinkRows = false;
            if (typeof ops.shrinkCols == "undefined") ops.shrinkCols = false;
            if (typeof ops.rowsAllowMiddleShrink == "undefined") ops.rowsAllowMiddleShrink = false;
            if (typeof ops.colsAllowMiddleShrink == "undefined") ops.colsAllowMiddleShrink = false;
            if (typeof ops.copyAsHTML == "undefined") ops.copyAsHTML = false;
            if (typeof ops.pasteAsHTML == "undefined") ops.pasteAsHTML = false;
            if (typeof ops.scrollSelectionIntoView == "undefined") ops.scrollSelectionIntoView = true;

            // Correct logical errors
            if (ops.minRows < 0) ops.minRows = 0;
            if (ops.minCols < 0) ops.minCols = 0;
            if (ops.maxRows != -1 && ops.minRows > ops.maxRows) ops.maxRows = ops.minRows;
            if (ops.maxCols != -1 && ops.minCols > ops.maxCols) ops.maxCols = ops.minCols;
        }

        function getTarget(e) {
            var target,
                wasHidden = cover.is(":hidden");

            cover.hide();
            target = document.elementFromPoint(e.clientX, e.clientY);
            if (!wasHidden) cover.show();

            return target;
        }

        // Context variable
        var that = this;

        // EdiTable properties
        this.table = table;
        this.options = optOptions || {};
        this.events = {
            change: []
        };

        normalizeTable(this.table);
        normalizeOptions(this.options);

        var cover = $("<div contenteditable></div>")
            .css({
                "cursor": "default",
                "display": "table-row",
                "opacity": "0",
                "position": "absolute",
                "z-index": "1",
                "top": "0",
                "bottom": "0",
                "width": "100%"
            });

        $(this.table)
            .css({
                "position": "relative"
            })
            .append(cover);

        this.CellManager = {
            setEditable: function (cell, optEdit) {
                // Normalize parameters
                if (typeof optEdit == "undefined") optEdit = true;

                // Set editable
                cell.contentEditable = optEdit;
            },
            isEditable: function (cell) {
                //Checks both isContentEditable and contentEditable to prevent cell being un-modifiable when display is none
                return cell.isContentEditable || cell.contentEditable == "true";
            },
            setHeader: function (cell, optHeader) {
                if (typeof optHeader == "undefined") optHeader = true;

                // Return if element already is/isn't header
                if (optHeader == this.isHeader(cell)) return;

                var type = (optHeader ? "th" : "td"),
                    oldDom = cell,
                    children = $(oldDom).contents().detach(),
                    newDom = document.createElement(type);

                // Transfer attributes
                $.each(oldDom.attributes, function (index) {
                    $(newDom).attr(oldDom.attributes[index].name, oldDom.attributes[index].value);
                });

                $(newDom).append(children);

                $(oldDom).replaceWith(newDom);
            },
            isHeader: function (cell) {
                return cell.tagName.toLowerCase() == "th";
            },
            select: function (cell) {
                $(cell).addClass("ediTable-cell-selected");
            },
            deselect: function (cell) {
                $(cell)
                    .removeClass("ediTable-cell-selected")
                    .removeClass("ediTable-cell-selected-left")
                    .removeClass("ediTable-cell-selected-right")
                    .removeClass("ediTable-cell-selected-top")
                    .removeClass("ediTable-cell-selected-bottom");
            },
            isSelected: function (cell) {
                return $(cell).hasClass("ediTable-cell-selected");
            },
            getValue: function (cell) {
                return cell.innerText;
            },
            setValue: function (cell, value) {
                // Only set value if editable
                if (!this.isEditable(cell)) return;

                // Set value
                if (that.options.pasteAsHTML) {
                    $(cell).html(value);
                } else {
                    $(cell).text(value);
                }
            },
            clear: function (cell) {
                this.setValue(cell, "");
            },
            isClear: function (cell) {
                return cell.innerHTML == "";
            }
        };
        this.VectorManager = {
            getSelection: function (cells) {
                return cells.filter(function (cell) {
                    return that.CellManager.isSelected(cell);
                });
            },
            getValues: function (cells) {
                return cells.map(function (cell) {
                    return that.CellManager.getValue(cell);
                });
            },
            isHeader: function (cells) {
                for (var i = 0; i < cells.length; i++) {
                    if (!that.CellManager.isHeader(cells[i])) return false;
                }

                return true;
            },
            isEditable: function (cells) {
                for (var i = 0; i < cells.length; i++) {
                    if (!that.CellManager.isEditable(cells[i])) return false;
                }

                return true;
            },
            isClear: function (cells) {
                for (var i = 0; i < cells.length; i++) {
                    if (!that.CellManager.isClear(cells[i])) return false;
                }

                return true;
            }
        };
        this.Selection = function () {
            var selection,
                table = $(that.table),
                startCoords = [];

            // Keeps track of double touch
            var lastTap;
            var ifDoubleTap = function () {
                var now = new Date().getTime(),
                    timeSince = now - lastTap;

                lastTap = new Date().getTime();

                return timeSince < 600 && timeSince > 0;
            };

            var handleMouseDown = function (e) {
                var target = getTarget(e),
                    targetCoords = selection.getCoords(target);

                that.lastClicked = target;

                console.log(target == e.target);

                var hasFocus = that.hasFocus();

                // Clicked outside
                if (!targetCoords || !hasFocus) {
                    that.deselect();
                    selection.exitEditMode();
                }

                // Don't interfere
                if (!hasFocus) return;

                // Check for double touch
                if (e.type == "touchstart" && ifDoubleTap()) {
                    handleDoubleClick(e);
                    return;
                }
                // Check for right click
                var right = e.which == 3;

                if (targetCoords) {
                    var makeSelection = !right || (right && !that.hasSelection());

                    if (!that.hasSelection() || !e.shiftKey && that.hasSelection()) startCoords = targetCoords;

                    if (target != selection.editingCell) {
                        selection.exitEditMode();

                        if (makeSelection) {
                            that.select({
                                rowStart: startCoords[0],
                                rowEnd: targetCoords[0],
                                colStart: startCoords[1],
                                colEnd: targetCoords[1]
                            });
                        }

                        e.preventDefault();
                    }

                    if (makeSelection) {
                        $(document)
                            .on("mousemove", handleMouseMove)
                            .on("touchmove", handleMouseMove);
                    }
                }
            };
            var handleContextMenu = function (e) {
                if (!selection.isEditing()) hiddenInput.select();
            };
            var handleDoubleClick = function (e) {
                if (!that.hasFocus()) return;

                var target = getTarget(e),
                    targetCoords = selection.getCoords(target);

                if (targetCoords) {
                    selection.setEditMode(target);
                }
            };
            var handleMouseUp = function (e) {
                $(document)
                    .unbind("mousemove", handleMouseMove)
                    .unbind("touchmove", handleMouseMove)
            };
            var handleMouseMove = function (e) {
                var targetCoords = selection.getCoords(getTarget(e));

                if (e.changedTouches) {
                    var changedTouches = e.changedTouches,
                        clientX,
                        clientY;

                    if (changedTouches.length > 0) {
                        var touch = changedTouches.item(0);

                        clientX = touch.clientX;
                        clientY = touch.clientY;

                        targetCoords = selection.getCoords(document.elementFromPoint(clientX, clientY));
                    }
                }

                if (!selection.isEditing() && targetCoords) {
                    that.select({
                        rowStart: startCoords[0],
                        rowEnd: targetCoords[0],
                        colStart: startCoords[1],
                        colEnd: targetCoords[1]
                    });

                    e.preventDefault();
                }
            };

            var handleKeyDown = function (e) {
                //PREVENT SNEAKY MANIPULATION OF HIDDEN INPUT
                hiddenInput.blur();

                var hasFocus = that.hasFocus();
                if (!hasFocus) return;

                var hasSelection = that.hasSelection(),
                    singleCell = selection.originCell == selection.terminalCell,
                    code = e.keyCode,
                    ctrl = e.ctrlKey,
                    shift = e.shiftKey,
                    tab = code == 9,
                    enter = code == 13,
                    esc = code == 27,
                    del = code == 46,
                    backspace = code == 8,
                    left = code == 37,
                    up = code == 38,
                    right = code == 39,
                    down = code == 40,
                    home = code == 36,
                    end = code == 35;

                // Save editingCell since certain keys exit editing mode
                var editingCell = selection.editingCell,
                    wasEditing = selection.isEditing();

                // Ways to exit edit mode
                if (tab || enter || esc || up || down ||
                    (left && (editingCell && getCaretPosition(editingCell) == 0)) ||
                    (right && (editingCell && getCaretPosition(editingCell) == editingCell.innerText.length))) {

                    e.preventDefault();
                    selection.exitEditMode();
                }

                if (!selection.isEditing()) {
                    // Special case: select all
                    if (ctrl && code == 65) {
                        e.preventDefault();
                        if (shift) that.deselect(); else that.select();
                    }
                    // Alter selection
                    else if (hasSelection) {
                        if (e.keyCode == 93) {
                            selection.originCell.focus();
                            return;
                        }
                        var moveEditing = !singleCell && (tab || enter),
                            moveOrigin = !shift && !moveEditing,
                            moveTerminal = !moveEditing,
                            jumpTerminal = !shift && !moveEditing,
                            originCoords = selection.getCoords(selection.originCell),
                            terminalCoords = selection.getCoords(selection.terminalCell);

                        // ESCAPE
                        if (esc && !wasEditing) {
                            that.deselect();
                        }
                        // DELETE / BACKSPACE
                        else if (del || backspace) {
                            e.preventDefault();
                            if (that.hasSelection()) {
                                that.clearSelection();
                            }
                        }
                        // ENTER / TAB
                        else if (enter || tab) {
                            var cells;
                            if (tab) {
                                cells = flatten(singleCell ? that.getRows() : that.getSelectedRows());
                            }
                            else if (enter) {
                                cells = flatten(singleCell ? that.getCols() : that.getSelectedCols())
                            }

                            var index = cells.indexOf(singleCell ? selection.originCell : editingCell);
                            if (singleCell) {
                                var newCoords = selection.getCoords(
                                    cells[(index + (shift ? -1 : 1)).mod(cells.length)]
                                );

                                that.select({
                                    rowStart: newCoords[0],
                                    rowEnd: newCoords[0],
                                    colStart: newCoords[1],
                                    colEnd: newCoords[1]
                                });
                            } else if (moveEditing) {
                                selection.setEditMode(cells[(index + (shift ? -1 : 1)).mod(cells.length)]);
                            }
                        }
                        // ARROW KEYS, HOME / END
                        else if (left || up || right || down || home || end) {
                            // Assign deltaCoords
                            var deltaCoords = {x: 0, y: 0},
                                moveCoords = moveTerminal && !jumpTerminal ? terminalCoords : originCoords;
                            switch (code) {
                                // END
                                case 35:
                                    deltaCoords.x = that.getColCount() - moveCoords[1] - 1;
                                    if (ctrl) deltaCoords.y = that.getRowCount() - moveCoords[0] - 1;
                                    break;
                                // HOME
                                case 36:
                                    deltaCoords.x = -moveCoords[1];
                                    if (ctrl) deltaCoords.y = -moveCoords[0];
                                    break;
                                // LEFT
                                case 37:
                                    deltaCoords.x = ctrl ? deltaCoords.x = -moveCoords[1] : -1;
                                    break;
                                // UP
                                case 38:
                                    deltaCoords.y = ctrl ? deltaCoords.y = -moveCoords[0] : -1;
                                    break;
                                // RIGHT
                                case 39:
                                    deltaCoords.x = ctrl ? that.getColCount() - moveCoords[1] - 1 : 1;
                                    break;
                                // DOWN
                                case 40:
                                    deltaCoords.y = ctrl ? that.getRowCount() - moveCoords[0] - 1 : 1;
                                    break;
                            }

                            // Translate according to deltaCoords
                            if (originCoords && terminalCoords) {
                                var testCoords = function (coords) {
                                    return !(
                                        coords[0] < 0 ||
                                        coords[0] >= that.getRowCount() ||
                                        coords[1] < 0 ||
                                        coords[1] >= that.getColCount()
                                    );
                                };

                                if (moveOrigin) {
                                    var newCoords = [originCoords[0] + deltaCoords.y, originCoords[1] + deltaCoords.x];
                                    if (testCoords(newCoords)) originCoords = newCoords;
                                }

                                if (jumpTerminal) {
                                    terminalCoords = originCoords;
                                } else if (moveTerminal) {
                                    var newCoords = [terminalCoords[0] + deltaCoords.y, terminalCoords[1] + deltaCoords.x];
                                    if (testCoords(newCoords)) terminalCoords = newCoords;
                                }

                                that.select({
                                    rowStart: originCoords[0],
                                    rowEnd: terminalCoords[0],
                                    colStart: originCoords[1],
                                    colEnd: terminalCoords[1]
                                });
                            }
                        }
                    }
                    // NO SELECTION
                    else {
                        if (tab || enter || home || end || left || up || right || down) {
                            var coords = [0, 0];

                            // End / Ctrl-End
                            if (end) {
                                coords[1] = that.getColCount() - 1;
                                if (ctrl) coords[0] = that.getRowCount() - 1;
                            }

                            that.select({
                                rowStart: coords[0],
                                rowEnd: coords[0],
                                colStart: coords[1],
                                colEnd: coords[1]
                            });
                        }
                    }
                }
            };
            var handleKeyPress = function (e) {
                var hasFocus = that.hasFocus(),
                    editing = selection.isEditing(),
                    hasSelection = that.hasSelection();

                if (hasFocus && hasSelection && !editing) {
                    selection.setEditMode(selection.originCell);
                }
            };
            var handleCellInput = function (e) {
                // Call updates
                shrinkTable(that);
                growTable(that);

                var coords = that.Selection.getCoords(e.target);
                that.fireEvent("change", {
                    rowStart: coords[0],
                    rowEnd: coords[0],
                    colStart: coords[1],
                    colEnd: coords[1]
                });
            };

            $(document)
                .on("mousedown", handleMouseDown)
                .on("touchstart", handleMouseDown)
                .on("contextmenu", handleContextMenu)
                .on("dblclick", handleDoubleClick)
                .on("mouseup", handleMouseUp)
                .on("touchend", handleMouseUp)
                .on("keydown", handleKeyDown)
                .on("keypress", handleKeyPress);

            selection = {
                originCell: null,
                terminalCell: null,
                editingCell: null,
                isEditing: function () {
                    return this.editingCell != null;
                },
                setEditMode: function (cell) {
                    var jCell = $(cell);

                    // Clear editing cell
                    this.exitEditMode();

                    // Quit if not editable
                    if (!that.CellManager.isEditable(cell)) return;

                    // Set edit mode
                    cover.hide();
                    cell.focus();
                    selectText(cell);
                    jCell.addClass("ediTable-cell-editing");

                    // Attach temporary listener
                    jCell.on("input", handleCellInput);

                    // Save current editing cell
                    that.Selection.editingCell = cell;
                },
                exitEditMode: function () {
                    if (this.isEditing()) {
                        // Remove focus
                        this.editingCell.blur();
                        document.body.focus();
                        deselectText();

                        // Remove temporary class and listener
                        $(this.editingCell)
                            .removeClass("ediTable-cell-editing")
                            .unbind("input", handleCellInput);

                        // Reset editing cell
                        this.editingCell = null;
                        cover.show();
                    }
                },
                getCoords: function (element) {
                    var el = $(element),
                        cell = el.closest("tr > td, tr > th")[0],
                        row = el.closest("tr")[0],
                        coords = null;

                    if (cell && row && $.contains(that.table, row)) {
                        coords = [row.rowIndex, cell.cellIndex];
                    }

                    return coords;
                }
            };

            return selection;
        }();

        // Fix rows and cols
        fixTableMinMax(this);
        growTable(this);
        shrinkTable(this);

        // Init table
        $(this.table)
            .addClass("ediTable")
            .focusin(function (e) {
                if (!that.hasSelection()) {
                    var coords = that.Selection.getCoords(e.target);
                    if (!coords) return;

                    e.target.blur();
                    that.lastClicked = e.target;
                    deselectText();

                    that.select({
                        rowStart: coords[0],
                        rowEnd: coords[0],
                        colStart: coords[1],
                        colEnd: coords[1]
                    });
                }
            });


        function onCopy(event) {
            // Don't interfere
            if (!that.hasFocus() || that.Selection.isEditing()) return;

            if (that.options.copyAsHTML) {
                // Get html of selected.
                var rows = that.getSelectedRows(),
                    table = document.createElement("table");

                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i],
                        rowDom = document.createElement("tr");

                    for (var j = 0; j < row.length; j++) {
                        var cell = row[j];

                        rowDom.appendChild($(cell).clone()[0]);
                    }

                    table.appendChild(rowDom);
                }

                event.clipboardData.setData("text/html", table.outerHTML);
            }

            // Get text of selected
            var tableText = "",
                selectedValues = that.getSelectedRowValues();

            for (var i = 0; i < selectedValues.length; i++) {
                var rowValues = selectedValues[i];

                for (var j = 0; j < rowValues.length; j++) {
                    var value = rowValues[j];

                    tableText += value;

                    if (j != rowValues.length - 1) tableText += "\t";
                }

                if (i != selectedValues.length - 1) {
                    tableText += "\n";
                }
            }

            event.clipboardData.setData("text/plain", tableText);

            event.preventDefault();
        }

        function onCut(event) {
            if (that.hasFocus()) {
                // Copy
                onCopy(event);

                // Clear
                that.clearSelection();
            }
        }

        function onPaste(event) {
            // Don't interfere
            if (!that.hasFocus()) return;

            if (!that.Selection.isEditing()) {
                event.preventDefault();

                var html,
                    table,
                    data = [];
                var htmlText = event.clipboardData.getData("text/html"),
                    plainText = event.clipboardData.getData("text/plain");

                var selectedRows = that.getSelectedRows();

                if (htmlText && htmlText != "") {
                    if (window.DOMParser) {
                        //DOMParser is more secure, but less widely supported.
                        var parser = new DOMParser();

                        html = parser.parseFromString(htmlText, "text/html");
                    } else {
                        //DOMImplementation.createHTMLDocument is widely supported by browsers but I'm unsure how exploitable it is.
                        html = document.implementation.createHTMLDocument();

                        html.write(htmlText);
                    }

                    //Get data from table instead of searching for tr's because semantics.
                    var tables = html.getElementsByTagName("table");
                    //Use first table if there is more than one copied.
                    table = tables.length > 0 ? tables[0] : null;
                }

                if (table) {
                    var rows = table.rows;

                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i],
                            cells = row.cells;

                        data[i] = [];

                        for (var j = 0; j < cells.length; j++) {
                            var cell = cells[j];

                            data[i][j] = cell.innerText;
                        }
                    }
                } else if (plainText) {
                    //Parse text in the format of columns separated by tabs and rows separated by new lines.
                    var rows = plainText.split("\n");

                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i],
                            cols = row.split("\t");

                        data[i] = [];

                        for (var j = 0; j < cols.length; j++) {
                            var text = cols[j];

                            data[i][j] = text;
                        }
                    }
                }

                //If there is a selection
                if (data.length > 0 && selectedRows.length > 0) {
                    //Set the values
                    var firstCellCoords = that.Selection.getCoords(selectedRows[0][0]);
                    //TODO solve issue when pasting multiple cells of data "" (columns being removed because they are empty
                    that.setRowValues(data, {rowStart: firstCellCoords[0], colStart: firstCellCoords[1]});
                }
            }
            // IS EDITING
            else if (!that.options.pasteAsHTML) {
                event.preventDefault();
                // get text representation of clipboard
                var text = event.clipboardData.getData("text/plain");

                // insert text manually
                document.execCommand("insertHTML", false, text);
            }
        }

        this.lastClicked = null;
        this.table.addEventListener("dragstart", function (e) {
            e.preventDefault();
        });
        this.table.addEventListener("drop", function (e) {
            e.preventDefault();
        });

        document.addEventListener("copy", onCopy);
        document.addEventListener("cut", onCut);
        document.addEventListener("paste", onPaste);
    };
    EdiTable.prototype = {
        addEventListener: function (type, func) {
            this.events[type].push(func);
        },
        removeEventListener: function (type, func) {
            var index = this.events[type].indexOf(func);
            if (index != -1) this.events[type].splice(index, 1);
        },
        fireEvent: function (type, eventObj) {
            var event = this.events[type];
            if (event) {
                for (var i = 0; i < event.length; i++) {
                    event[i](eventObj);
                }
            }
        },
        hasFocus: function () {
            var activeElement = document.activeElement,
                lastClicked = this.lastClicked;

            //TODO determine if having a selection is proof of ediTable having focus
            return $(activeElement).closest(this.table).length == 1 || $(lastClicked).closest(this.table).length == 1
                || this.hasSelection();
        },
        getRowCount: function () {
            return this.table.rows.length;
        },
        getColCount: function () {
            var max = 0,
                rows = this.table.rows;

            for (var i = 0; i < rows.length; i++) {
                max = Math.max(max, rows[i].cells.length);
            }

            return max;
        },
        setEditable: function (optEdit, ops) {
            // Normalize parameters
            if (typeof optEdit == "undefined") optEdit = true;
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Set editable
            var that = this;
            ops.table = this.table;
            ops.func = function (cell) {
                that.CellManager.setEditable(cell, optEdit);
            };
            forEachTableCell(ops);
        },
        isEditable: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            var editable = true,
                that = this;
            ops.table = this.table;
            ops.func = function (cell) {
                if (!that.CellManager.isEditable(cell)) editable = false;
            };
            forEachTableCell(ops);
            return editable;
        },
        setHeader: function (optHeader, ops) {
            // Normalize parameters
            if (typeof optHeader == "undefined") optHeader = true;
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Set editable
            var that = this;
            ops.table = this.table;
            ops.func = function (cell) {
                that.CellManager.setHeader(cell, optHeader);
            };
            forEachTableCell(ops);
        },
        isHeader: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            var header = true,
                that = this;
            ops.table = this.table;
            ops.func = function (cell) {
                if (!that.CellManager.isHeader(cell)) header = false;
            };
            forEachTableCell(ops);
            return header;
        },
        select: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Do selection
            var that = this;
            this.deselect();
            ops.table = this.table;
            ops.func = function (cell) {
                that.CellManager.select(cell);
            };
            var ends = forEachTableCell(ops);

            this.Selection.originCell = ends.first;
            this.Selection.terminalCell = ends.last;

            var that = this;
            (function updateSelectionBorder() {
                var table = that.table,
                    rows = that.table.rows,
                    rowCount = that.getRowCount(),
                    colCount = that.getColCount(),
                    cm = that.CellManager;

                for (var i = 0; i < rowCount; i++) {
                    var row = that.table.rows[i];
                    for (var j = 0; j < colCount; j++) {
                        var cell = row.cells[j],
                            jqCell = $(cell);

                        if (!cm.isSelected(cell)) continue;

                        // Top border
                        jqCell.toggleClass("ediTable-cell-selected-top",
                            (i == 0 || !cm.isSelected(rows[i - 1].cells[j])));
                        // Bottom border
                        jqCell.toggleClass("ediTable-cell-selected-bottom",
                            (i == (rowCount - 1) || !cm.isSelected(rows[i + 1].cells[j])));
                        // Left border
                        jqCell.toggleClass("ediTable-cell-selected-left",
                            (j == 0 || !cm.isSelected(row.cells[j - 1])));
                        // Right border
                        jqCell.toggleClass("ediTable-cell-selected-right",
                            (j == (colCount - 1) || !cm.isSelected(row.cells[j + 1])));
                    }
                }
            })();

            // Scroll selection into view
            if (this.options.scrollSelectionIntoView) {
                var orig = this.Selection.originCell,
                    term = this.Selection.terminalCell;

                if (orig != term) {
                    scrollIntoViewIfNecessary(term);
                } else {
                    scrollIntoViewIfNecessary(orig);
                }
            }
        },
        deselect: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Do deselection
            var that = this;
            ops.table = this.table;
            ops.func = function (cell) {
                that.CellManager.deselect(cell);
            };
            forEachTableCell(ops);
        },
        setRowValues: function (values, ops) {
            // Normalize paramters
            if (!is2DArray(values)) throw new TypeError("values parameter must be 2D Array");
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.silent == "undefined") ops.silent = false;

            //Add rows
            var rowEnd = ops.rowStart + values.length,
                maxRows = this.options.maxRows,
                rowCount = this.getRowCount(),
                rowDiff = rowEnd - rowCount;

            while ((maxRows == -1 || rowCount < maxRows) && rowDiff > 0 && this.options.growRows) {
                rowCount = this.getRowCount();
                rowDiff = rowEnd - rowCount;

                this.insertRow(rowCount);
            }

            //Add cols
            var colEnd = ops.colStart + values[0].length,
                maxCols = this.options.maxCols,
                colCount = this.getColCount(),
                colDiff = colEnd - colCount;

            while ((maxCols == -1 || colCount < maxCols) && colDiff > 0 && this.options.growCols) {
                colCount = this.getColCount();
                colDiff = colEnd - colCount;

                this.insertCol(colCount);
            }

            // Set values
            var rows = this.table.rows,
                rowEnd = 0, colEnd = 0;
            for (var i = 0; i < values.length && i < rows.length - ops.rowStart; i++) {
                var rowIndex = i + ops.rowStart,
                    row = rows[rowIndex];

                for (var j = 0; j < values[i].length && j < row.cells.length - ops.colStart; j++) {
                    var colIndex = j + ops.colStart,
                        cell = row.cells[colIndex];
                    this.CellManager.setValue(cell, values[i][j]);

                    colEnd = Math.max(colEnd, colIndex);
                }

                rowEnd = Math.max(rowEnd, rowIndex);
            }

            // Call updates
            shrinkTable(this);
            growTable(this);
            if (!ops.silent) this.fireEvent("change", {
                rowStart: ops.rowStart,
                rowEnd: rowEnd,
                colStart: ops.colStart,
                colEnd: colEnd
            });
        },
        setColValues: function (values, ops) {
            // Normalize paramters
            if (!is2DArray(values)) throw new TypeError("values parameter must be 2D Array");
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.silent == "undefined") ops.silent = false;

            values = arrayTranspose(values);

            if (values.length == 0) values[0] = [];

            // Feed to setRowValues
            this.setRowValues(values, ops);
        },
        clear: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);
            if (typeof ops.silent == "undefined") ops.silent = false;

            // Clear
            var that = this;
            ops.table = this.table;
            ops.func = function (cell) {
                that.CellManager.clear(cell);
            };
            forEachTableCell(ops);

            // Call updates
            shrinkTable(this);

            if (!ops.silent) this.fireEvent("change", {
                rowStart: ops.rowStart,
                rowEnd: ops.rowEnd,
                colStart: ops.colStart,
                colEnd: ops.colEnd
            });
        },
        clearSelection: function () {
            var s = this.Selection,
                originCoords = s.getCoords(s.originCell),
                termCoords = s.getCoords(s.terminalCell);
            if (originCoords && termCoords) {
                this.clear({
                    rowStart: originCoords[0],
                    colStart: originCoords[1],
                    rowEnd: termCoords[0],
                    colEnd: termCoords[1]
                });
            }
        },
        isClear: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Check rows
            var clear = true;
            ops.table = this.table;
            ops.func = function (cell) {
                if (!ctx.CellManager.isClear(cell)) clear = false;
            };
            forEachTableCell(ops);

            return clear;
        },
        hasSelection: function () {
            return $(this.table).find(".ediTable-cell-selected").length > 0;
            // return this.getSelectedRows().length > 0;
        },
        getSelectionBounds: function () {
            var selection = this.Selection;

            var originCoords = selection.getCoords(selection.originCell),
                terminalCoords = selection.getCoords(selection.terminalCell);

            return {
                origin: originCoords,
                terminal: terminalCoords
            };
        },
        getRow: function (index, ops) {
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            var cells = [],
                row = this.table.rows[index];

            forEach({
                arr: row.cells,
                start: ops.colStart,
                end: ops.colEnd,
                func: function (cell) {
                    cells.push(cell);
                }
            });

            return cells;
        },
        getRows: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Get values
            var rows = this.table.rows,
                rowVals = [],
                that = this;

            // For each row
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row, index) {
                    rowVals.push(that.getRow(index, ops));
                }
            });

            return rowVals;
        },
        getSelectedRows: function () {
            var that = this;
            return this.getRows().map(function (row) {
                return that.VectorManager.getSelection(row);
            }).filter(function (row) {
                return row.length > 0;
            });
        },
        getRowValues: function (ops) {
            var that = this;
            return this.getRows(ops).map(function (row) {
                return that.VectorManager.getValues(row);
            });
        },
        getSelectedRowValues: function () {
            var that = this;
            return this.getSelectedRows().map(function (row) {
                return that.VectorManager.getValues(row);
            });
        },
        getCol: function (index, ops) {
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);

            var cells = [];

            ops.table = this.table;
            ops.colStart = index;
            ops.colEnd = index;
            ops.func = function (cell) {
                cells.push(cell);
            };
            forEachTableCell(ops);

            return cells;
        },
        getCols: function (ops) {
            return arrayTranspose(this.getRows(ops));
        },
        getSelectedCols: function () {
            return arrayTranspose(this.getSelectedRows());
        },
        getColValues: function (ops) {
            return arrayTranspose(this.getRowValues(ops));
        },
        getSelectedColValues: function () {
            return arrayTranspose(this.getSelectedRowValues());
        },
        canInsertRow: function () {
            return (this.options.maxRows == -1 || this.table.rows.length < this.options.maxRows);
        },
        canInsertCol: function () {
            return (this.options.maxCols == -1 || this.table.rows[0].cells.length < this.options.maxCols)
        },
        rowsCanGrow: function () {
            return this.options.growRows && this.canInsertRow();
        },
        colsCanGrow: function () {
            var ops = this.options;
            return ops.growCols && this.canInsertCol();
        },
        insertRow: function (index) {
            if (!this.canInsertRow()) return;

            var vm = this.VectorManager,
                preInsertCols = this.getCols();

            // Insert row
            var newRow = this.table.insertRow(index),
                prevRow = index > 0 ? this.getRow(index - 1) : null,
                nextRow = index < this.getRowCount() - 1 ? this.getRow(index + 1) : null,
                rowIsEditable = (prevRow ? vm.isEditable(prevRow) : true) &&
                    (nextRow ? vm.isEditable(nextRow) : true),
                rowIsHeader = (prevRow ? vm.isHeader(prevRow) : true) &&
                    (nextRow ? vm.isHeader(nextRow) : true);

            // Add cells
            for (var i = 0; i < this.getColCount(); i++) {
                var cell = newRow.insertCell(i),
                    col = preInsertCols[i],
                    colIsEditable = vm.isEditable(col),
                    colIsHeader = vm.isHeader(col);

                this.CellManager.setEditable(cell, rowIsEditable || colIsEditable);
                // Call set header last to not lose cell reference
                this.CellManager.setHeader(cell, rowIsHeader || colIsHeader);
            }
        },
        insertCol: function (index) {
            if (!this.canInsertCol()) return;

            var vm = this.VectorManager,
                preInsertRows = this.getRows();

            // Insert col
            var prevCol = index > 0 ? this.getCol(index - 1) : null,
                nextCol = index < this.getColCount() - 1 ? this.getCol(index + 1) : null,
                colIsEditable = (prevCol ? vm.isEditable(prevCol) : true) &&
                    (nextCol ? vm.isEditable(nextCol) : true),
                colIsHeader = (prevCol ? vm.isHeader(prevCol) : true) &&
                    (nextCol ? vm.isHeader(nextCol) : true);

            // Add cells
            for (var i = 0; i < this.getRowCount(); i++) {
                var cell = this.table.rows[i].insertCell(index),
                    row = preInsertRows[i],
                    rowIsEditable = vm.isEditable(row),
                    rowIsHeader = vm.isHeader(row);

                this.CellManager.setEditable(cell, colIsEditable || rowIsEditable);
                // Call set header last to not lose cell reference
                this.CellManager.setHeader(cell, colIsHeader || rowIsHeader);
            }
        },
        removeRow: function (index) {
            var selectionBounds = this.getSelectionBounds();

            this.table.deleteRow(index);

            if (selectionBounds) {
                var originCoords = selectionBounds.origin,
                    terminalCoords = selectionBounds.terminal;

                if (originCoords && terminalCoords) {
                    var originCol = originCoords[1],
                        originRow = originCoords[0],
                        terminalCol = terminalCoords[1],
                        terminalRow = terminalCoords[0];

                    var topRow = Math.min(originRow, terminalRow),
                        botRow = Math.max(originRow, terminalRow);

                    //Determine if deleted row is within selection
                    if (index <= botRow && index >= topRow) {
                        //Keep selection at same coords unless coords do not exist
                        var rowCount = this.getRowCount(),
                            botClipped = botRow >= rowCount,
                            newSelectionBounds = {
                                colStart: originCol,
                                colEnd: terminalCol
                            };

                        if (botClipped) {
                            newSelectionBounds.rowStart = originRow - 1 >= 0 ? originRow - 1 : 0;
                            newSelectionBounds.rowEnd = terminalRow - 1 >= 0 ? terminalRow - 1 : 0;
                        } else {
                            newSelectionBounds.rowStart = originRow;
                            newSelectionBounds.rowEnd = terminalRow;
                        }

                        this.select(newSelectionBounds);
                    }
                }
            }
        },
        removeCol: function (index) {
            var selectionBounds = this.getSelectionBounds();
            var rows = this.table.rows;

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];

                row.deleteCell(index);
            }

            if (selectionBounds) {
                var originCoords = selectionBounds.origin,
                    terminalCoords = selectionBounds.terminal;

                if (originCoords && terminalCoords) {
                    var originCol = originCoords[1],
                        originRow = originCoords[0],
                        terminalCol = terminalCoords[1],
                        terminalRow = terminalCoords[0];

                    var leftCol = Math.min(originCol, terminalCol),
                        rightCol = Math.max(originCol, terminalCol);

                    //Determine if deleted row is within selection
                    if (index <= rightCol && index >= leftCol) {
                        //Keep selection at same coords unless coords do not exist
                        var colCount = this.getColCount(),
                            rightClipped = rightCol >= colCount,
                            newSelectionBounds = {
                                rowStart: originRow,
                                rowEnd: terminalRow
                            };

                        if (rightClipped) {
                            newSelectionBounds.colStart = originCol - 1 >= 0 ? originCol - 1 : 0;
                            newSelectionBounds.colEnd = terminalCol - 1 >= 0 ? terminalCol - 1 : 0;
                        } else {
                            newSelectionBounds.colStart = originCol;
                            newSelectionBounds.colEnd = terminalCol;
                        }

                        this.select(newSelectionBounds);
                    }
                }
            }
        }
    };
    window.EdiTable = EdiTable;

    // HIDDEN INPUT FOR DEFAULT CONTEXT MENU FUNCTIONALITY
    var hiddenInput = document.createElement("input");
    hiddenInput.defaultValue = "ediTable";
    $(hiddenInput)
        .prop("type", "text")
        .css({
            "position": "fixed",
            "opacity": "0"
        });
    document.body.appendChild(hiddenInput);
})();
