//(function(){
    "use strict";

    // UTILITIES
    function arrayTranspose(array) {
        array = array[0].map(function(col, i) {
            return array.map(function(row) {
                return row[i]
            });
        });

        return array;
    }
    function tableToArray(table){
        var rows = table.rows,
            arr = [];

        for (var i = 0; i < rows.length; i ++){
            var row = rows[i];

            arr[i] = [];
            for (var j = 0; j < row.cells.length; j ++) {
                var cell = row.cells[j];

                arr[i][j] = cell;
            }
        }

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
    function forEach2D(ops){
        // Normalize parameters
        if (typeof ops == "undefined" ||
            typeof ops.func == "undefined" ||
            typeof ops.arr == "undefined" ||
            ops.arr.length == 0 ||
            !isArrayOfArrays(ops.arr)) return;
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
                    func: function(cell){
                        ops.func.apply(ops.funcContext, [cell]);
                    }
                });
            }
        })
    }
    function forEachTableCell(ops){
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
    function isArrayOfArrays(thing){
        if (!(thing instanceof Array)) return false;
        for (var i = 0; i < thing.length; i ++){
            if (!(thing[i] instanceof Array)) return false;
        }

        return true;
    }

    /**
     * Represents a table by wrapping around an HTML table.
     *
     * @param{HTMLTableElement} - HTML table for the new EdiTable to wrap around
     * @param{Object} - contains various options for the new EdiTable
     */
    var EdiTable = function (table, optOptions) {
        // Utitilites
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
        function updateSelectionBorder() {
            // Update border
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
        }
        function updateRowColCount() {
            var ops = that.options,
                insertOps = {noUpdate: true};

            // Ensure maxes are good
            if (ops.maxRows > -1) {
                while (that.getRowCount() > ops.maxRows) {
                    that.removeRow(that.getRowCount() - 1);
                }
            }
            if (ops.maxCols > -1) {
                while (that.getColCount() > ops.maxCols) {
                    that.removeCol(that.getColCount() - 1);
                }
            }

            // Ensure mins are good
            while (that.getRowCount() < ops.minRows) {
                that.insertRow(that.getRowCount(), insertOps);
            }
            while (that.getColCount() < ops.minCols) {
                that.insertCol(that.getColCount(), insertOps);
            }

            // Grow rows
            if (ops.growRows) {
                var lastRowClear = that.rows[that.getRowCount() - 1].isClear();
                if (!lastRowClear && (ops.maxRows == -1 || that.getRowCount() < ops.maxRows)) {
                    that.insertRow(that.getRowCount(), insertOps);
                }
            }
            // Grow cols
            if (ops.growCols){
                var lastColClear = that.cols[that.getColCount() - 1].isClear();
                if (!lastColClear && (ops.maxCols == -1 || that.getColCount() < ops.maxCols)){
                    that.insertCol(that.getColCount(), insertOps);
                }
            }
            // Shrink rows
            if (ops.shrinkRows) {
                if (ops.rowsAllowMiddleShrink){
                    var i = 0;
                    while (that.getRowCount() > ops.minRows){
                        var rowStart = that.getRowCount() - (ops.growRows ? 2 : 1),
                            rowIndex = rowStart - i;
                        if (rowIndex >= 0 && that.rows[rowIndex].isClear()){
                            that.removeRow(rowIndex);
                        } else {
                            i ++;
                        }

                        if (rowIndex == 0) break;
                    }
                } else {
                    while (that.getRowCount() > ops.minRows){
                        var rowIndex = that.getRowCount() - (ops.growRows ? 2 : 1);
                        if (rowIndex >= 0 && that.rows[rowIndex].isClear()){
                            that.removeRow(rowIndex);
                        } else {
                            break;
                        }
                    }
                }
            }
            // Shrink cols
            if (ops.shrinkCols) {
                if (ops.colsAllowMiddleShrink){
                    var i = 0;
                    while (that.getColCount() > ops.minCols){
                        var colStart = that.getColCount() - (ops.growCols ? 2 : 1),
                            colIndex = colStart - i;
                        if (colIndex >= 0 && that.cols[colIndex].isClear()){
                            that.removeCol(colIndex);
                        } else {
                            i ++;
                        }

                        if (colIndex == 0) break;
                    }
                } else {
                    while (that.getColCount() > ops.minCols){
                        var colIndex = that.getColCount() - (ops.growCols ? 2 : 1);
                        if (colIndex >= 0 && that.cols[colIndex].isClear()){
                            that.removeCol(colIndex);
                        } else {
                            break;
                        }
                    }
                }
            }
        }
        function normalizeOptions(ops) {
            // Define the undefined
            if (typeof ops.initialCellValue == "undefined") ops.initialCellValue = "";
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

            // Correct logical errors
            if (ops.minRows < 0) ops.minRows = 0;
            if (ops.minCols < 0) ops.minCols = 0;
            if (ops.maxRows != -1 && ops.minRows > ops.maxRows) ops.maxRows = ops.minRows;
            if (ops.maxCols != -1 && ops.minCols > ops.maxCols) ops.maxCols = ops.minCols;
        }

        // Context variable
        var that = this;

        // Actual EdiTable properties and init begin here
        this.table = table;
        this.options = optOptions || {};
        this.events = {
            change: []
        };

        normalizeTable(this.table);
        normalizeOptions(this.options);

        this.CellManager = {
            setEditable: function (cell, optEdit) {
                // Normalize parameters
                if (typeof optEdit == "undefined") optEdit = true;

                // Set editable
                cell.contenteditable = optEdit ? "true" : "false";
            },
            isEditable: function (cell) {
                return cell.contenteditable == "true";
            },
            setHeader: function (cell, optHeader) {
                if (typeof optHeader == "undefined") optHeader = true;

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
                $(cell).html(value);
            },
            clear: function (cell) {
                this.setValue(cell, "");
            },
            isClear: function (cell) {
                return cell.innerHTML == "";
            }
        };
        this.Selection = {
            originCell: null,
            terminalCell: null,
            getCoords: function (element) {
                var el = $(element),
                    cell = el.closest("tr > *")[0],
                    row = el.closest("tr")[0],
                    coords = null;

                if (cell && row) {
                    coords = [row.rowIndex, cell.cellIndex];
                }

                return coords;
            },
            init: function () {
                var selection = that.Selection,
                    table = $(that.table),
                    startCoords = [];

                var handleMouseDown = function (e) {
                    var targetCoords = selection.getCoords(e.target);

                    if (targetCoords) {
                        startCoords = targetCoords;

                        if (targetCoords) {
                            that.select({
                                rowStart: startCoords[0],
                                rowEnd: targetCoords[0],
                                colStart: startCoords[1],
                                colEnd: targetCoords[1]
                            });
                        } else {
                            that.deselect();
                        }

                        $(document)
                            .on("mousemove", handleMouseMove);
                    }
                };
                var handleMouseUp = function (e) {
                    $(document)
                        .unbind("mousemove", handleMouseMove);
                };
                var handleMouseMove = function (e) {
                    var targetCoords = selection.getCoords(e.target);

                    if (targetCoords) {
                        that.select({
                            rowStart: startCoords[0],
                            rowEnd: targetCoords[0],
                            colStart: startCoords[1],
                            colEnd: targetCoords[1]
                        });
                    }

                    e.preventDefault();
                };

                var handleKeyDown = function (e) {
                    // Special case: select all
                    if (e.ctrlKey && e.keyCode == 65) {
                        if (e.shiftKey) {
                            that.deselect();
                        } else {
                            that.select();
                        }
                    }

                    // Handle arrow keys
                    if (that.hasSelection()) {
                        var moveOrigin = !e.shiftKey,
                            jumpTerminal = !(e.shiftKey || e.ctrlKey),
                            originCoords = selection.getCoords(selection.originCell.dom),
                            terminalCoords = selection.getCoords(selection.terminalCell.dom);

                        var deltaCoords = {
                            x: 0,
                            y: 0
                        };

                        switch (e.keyCode) {
                            // TAB
                            case 9:
                                if (that.hasFocus()) e.preventDefault();
                                var notOnTheEnd = originCoords[1] < that.getColCount() - 1;
                                deltaCoords.x = (notOnTheEnd ? 1 : -originCoords[1]);
                                deltaCoords.y = (notOnTheEnd ? 0 : 1);
                                break;
                            //LEFT
                            case 37:
                                deltaCoords.x = -1;
                                break;
                            //UP
                            case 38:
                                deltaCoords.y = -1;
                                break;
                            //RIGHT
                            case 39:
                                deltaCoords.x = 1;
                                break;
                            //DOWN
                            case 40:
                                deltaCoords.y = 1;
                                break;
                        }

                        if (originCoords && terminalCoords) {
                            function testCoords(coords) {
                                return !(
                                    coords[0] < 0 ||
                                    coords[0] >= that.getRowCount() ||
                                    coords[1] < 0 ||
                                    coords[1] >= that.getColCount()
                                );
                            }

                            if (moveOrigin) {
                                originCoords[1] += deltaCoords.x;
                                originCoords[0] += deltaCoords.y;
                            }

                            if (jumpTerminal) {
                                terminalCoords = originCoords;
                            } else {
                                terminalCoords[1] += deltaCoords.x;
                                terminalCoords[0] += deltaCoords.y;
                            }

                            if (testCoords(originCoords) && testCoords(terminalCoords)) {
                                that.select({
                                    rowStart: originCoords[0],
                                    rowEnd: terminalCoords[0],
                                    colStart: originCoords[1],
                                    colEnd: terminalCoords[1]
                                });
                            }
                        }
                    }
                };

                $(document)
                    .on("mousedown", handleMouseDown)
                    .on("mouseup", handleMouseUp)
                    .on("keydown", handleKeyDown);
            }
        };
        this.Selection.init();

        // Fix rows and cols
        //updateRowColCount();

        // Add CSS
        $(this.table).addClass("ediTable");


        function copyTest(event) {
            if (that.hasFocus()) {
                //Get html of selected.
                var rows = that.getSelectedRows();
                var table = document.createElement("table");

                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var selection = row.getSelection();
                    var rowDom = document.createElement("tr");

                    for (var j = 0; j < selection.getCellCount(); j++) {
                        var cell = selection.cells[j];
                        var cellDom = cell.dom;

                        rowDom.appendChild($(cellDom).clone()[0]);
                    }

                    table.appendChild(rowDom);
                }

                var tableText = "";
                var selectedValues = that.getSelectedRowValues();

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

                event.clipboardData.setData("text/html", table.outerHTML);
                event.clipboardData.setData("text/plain", tableText);

                event.preventDefault();
            }
        }
        function cutTest(event) {
            if (that.hasFocus()) {
                copyTest(event);
                //TODO clear selected cells.
                var selectedRows = that.getSelectedRows();

                for (var i = 0; i < selectedRows.length; i++) {
                    var row = selectedRows[i];
                    var selection = row.getSelection();

                    for (var j = 0; j < selection.getCellCount(); j++) {
                        var cell = selection.cells[j];

                        cell.clear();
                    }
                }
            }
        }
        function pasteTest(event) {
            if (that.hasFocus()) {
                var html, data = [];
                var htmlText = event.clipboardData.getData("text/html");
                var plainText = event.clipboardData.getData("text/plain");

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
                    var table = tables.length > 0 ? tables[0] : null;

                    if (table) {
                        var rows = table.rows;

                        for (var i = 0; i < rows.length; i++) {
                            var row = rows[i];
                            var cells = row.cells;

                            data[i] = [];

                            for (var j = 0; j < cells.length; j++) {
                                var cell = cells[j];

                                data[i][j] = cell.innerText;
                            }
                        }
                    }
                } else if (plainText && plainText != "") {
                    //Parse text in the format of columns separated by tabs and rows separated by new lines.
                    var rows = plainText.split("\n");

                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        var cols = row.split("\t");

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
                    var firstCellCoords = that.Selection.getCoords(selectedRows[0].getSelection().cells[0].dom);
                    var tableWidth = that.getColCount();
                    var tableHeight = that.getRowCount();

                    that.setRowValues(data, {rowStart: firstCellCoords[0], colStart: firstCellCoords[1]});
                }

                event.preventDefault();
            }
        }

        this.lastClicked = null;

        function focusTracker(e) {
            that.lastClicked = e.target;

            if (that.hasFocus()) {
                e.preventDefault();
            } else {
                that.deselect();
            }
        }

        document.addEventListener("click", focusTracker)
        document.addEventListener("copy", copyTest);
        document.addEventListener("cut", cutTest);
        document.addEventListener("paste", pasteTest);
    };
    EdiTable.prototype = {
        addEventListener: function(type, func){
            this.events[type].push(func);
        },
        removeEventListener: function(type, func){
            var index = this.events[type].indexOf(func);
            if (index != -1) this.events[type].splice(index, 1);
        },
        fireEvent: function(type){
            var event = this.events[type],
                e = {};
            if (event){
                for (var i = 0; i < event.length; i ++){
                    event[i](e);
                }
            }
        },
        hasFocus: function () {
            var activeElement = document.activeElement;
            var lastClicked = this.lastClicked;

            return $(activeElement).closest(this.table).length == 1 || $(lastClicked).closest(this.table).length == 1;
        },
        setRenderEnabled: function () {
            var lastStyle,
                enabled = true;
            var setRenderEnabled = function(enable){
                if (enable != enabled){
                    if (!enable) lastStyle = this.table.style.display;
                    this.table.style.display = enable ? lastStyle : "none";

                    enabled = enable;
                }
            }

            return setRenderEnabled;
        }(),
        getRowCount: function () {
            return this.table.rows.length;
        },
        getColCount: function () {
            var row = this.table.rows[0];
            return (row ? row.cells.length : 0);
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
            ops.table = this.table;
            ops.func = function(cell){
                cell.contenteditable = (optEdit ? "true" : "false");
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

            var editable = true;
            ops.table = this.table;
            ops.func = function(cell){
                if (cell.contenteditable != "true") editable = false;
            };
            forEachTableCell(ops);
            return editable;
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
            ops.func = function(cell){
                that.CellManager.select(cell);
            };

            this.setRenderEnabled(false);
            var ends = forEachTableCell(ops);

            this.Selection.originCell = ends.first;
            this.Selection.terminalCell = ends.last;

            //updateSelectionBorder();
            this.setRenderEnabled(true);
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
            ops.func = function(cell){
                that.CellManager.deselect(cell);
            };
            forEachTableCell(ops);
        },
        setRowValues: function (values, ops) {
            // Normalize paramters
            if (!isArrayOfArrays(values)) throw new TypeError("values parameter must be an Array of Arrays");
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.colStart == "undefined") ops.colStart = 0;

            // Set values
            var rows = this.table.rows;
            for (var i = 0; i < values.length && i < rows.length - ops.rowStart; i ++){
                if (i == rows.length - ops.rowStart - 1 || i == values.length - 1){
                    if (this.rowsCanGrow()) this.insertRow(i + 1);
                }

                var row = rows[i];
                for (var j = 0; j < values[i].length && row.cells.length - ops.colStart; j ++){
                    if (j == row.cells.length - ops.colStart - 1 || j == values[i].length - 1){
                        if (this.colsCanGrow()) this.insertCol(j + 1);

                        var cell = row.cells[j];
                        this.CellManager.setValue(cell, values[i][j]);
                    }
                }

                this.fireEvent("change");
            }
        },
        setColValues: function (values, ops) {
            // Normalize paramters
            if (!isArrayOfArrays(values)) throw new TypeError("values parameter must be an Array of Arrays");
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.colStart == "undefined") ops.colStart = 0;

            // Flip flop parameters
            var temp = ops.rowStart;
            ops.rowStart = ops.colStart;
            ops.colStart = temp;
            values = arrayTranspose(values);

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

            // Clear
            var that = this;
            ops.table = this.table;
            ops.func = function(cell){
                that.CellManager.clear(cell);
            }
            forEachTableCell(ops);

            // Call updates
            // ....
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
            ops.func = function(cell){
                if (!that.CellManager.isClear(cell)) clear = false;
            }
            forEachTableCell(ops);

            return clear;
        },

        // <not_done>
        insertRow: function (index, ops) {
            var colCount = this.getColCount();

            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;
            if (typeof ops.values == "undefined") ops.values = [];
            while (ops.values.length < colCount) ops.values.push(this.options.initialCellValue);

            // Insert row
            if (colCount > 0) {
                this.cols[0].insertCell(index, {value: ops.values[0], noUpdate: ops.noUpdate});
                this.rows[index].setValues(ops.values, ops);
            }
            // If no rows
            else {
                // Renormalize parameters
                if (ops.values.length == 0) ops.values.push(this.options.initialCellValue);

                // Create row and row dom
                var rowDom = this.table.insertRow(0),
                    row = new Vector([], "row");
                this.rows.push(row);

                // Add row, and add column for each optValue
                for (var i = 0; i < ops.values.length; i++) {
                    var td = this.table.rows[0].insertCell(-1),
                        cell = new Cell(td),
                        col = new Vector([cell], "col");

                    // Set cell value
                    cell.setValue(ops.values[i], cellOps);

                    // Add cell to row
                    row.cells.push(cell);

                    // Push col to cols
                    this.cols.push(col);
                }
            }
        },
        insertCol: function (index, ops) {
            var rowCount = this.getRowCount();

            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;
            if (typeof ops.values == "undefined") ops.values = [];
            while (ops.values.length < rowCount) ops.values.push(this.options.initialCellValue);

            // Insert row
            if (rowCount > 0) {
                this.rows[0].insertCell(index, {value: ops.values[0], noUpdate: ops.noUpdate});
                this.cols[index].setValues(ops.values, ops);
            }
            // If no cols
            else {
                // Renormalize parameters
                if (ops.values.length == 0) ops.values.push(this.options.initialCellValue);

                // Create col
                var col = new Vector([], "col");
                this.cols.push(col);

                for (var i = 0; i < ops.values.length; i++) {
                    var rowDom = this.table.insertRow(-1),
                        cellDom = rowDom.insertCell(-1),
                        cell = new Cell(cellDom),
                        row = new Vector([cell], "row");

                    // Set cell value
                    cell.setValue(ops.values[i], cellOps);

                    // Add cell to col
                    col.cells.push(cell);

                    // Push row to rows
                    this.rows.push(row);
                }
            }
        },
        // </not_done>

        getSelectedRows: function () {
            var rows = [];
            for (var i = 0; i < this.getRowCount(); i++) {
                var row = [],
                    cells = this.table.rows[i].cells;

                for (var j = 0; j < cells.length; j ++) {
                    if (this.CellManager.isSelected(cells[j])) row.push(cells[j]);
                }

                if (row.length > 0) rows.push(row);
            }
            return rows;
        },
        getSelectedCols: function () {
            return arrayTranspose(this.getSelectedRows());
        },
        getSelectedRowValues: function () {
            var that = this;
            return this.getSelectedRows().map(function(row) {
                return row.map(function(cell) {
                    return that.CellManager.getValue(cell);
                })
            });
        },
        getSelectedColValues: function () {
            var that = this;
            return this.getSelectedCols().map(function(col) {
                return col.map(function(cell) {
                    return that.CellManager.getValue(cell);
                })
            });
        },
        hasSelection: function () {
            return this.getSelectedRows().length > 0;
        },
        getRowValues: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Get values
            var rows = this.table.rows,
                rowVals = [];

            // For each row
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function(row){
                    // For each cell
                    var rowVal = [];
                    forEach({
                        arr: row,
                        start: ops.colStart,
                        end: ops.colEnd,
                        func: function(cell){
                            rowVal.push(cell.innerText);
                        }
                    })
                    rowVals.push(rowVal);
                }
            });

            return rowVals;
        },
        getColValues: function (ops) {
            return arrayTranspose(this.getRowValues(ops));
        },
        rowsCanGrow: function(){
            var ops = this.options;
            return ops.growRows && (ops.maxRows == -1 || this.table.rows.length < ops.maxRows);
        },
        colsCanGrow: function(){
            var ops = this.options;
            return ops.growCols && (ops.maxCols == -1 || this.table.rows[0].cells.length < ops.maxCols);
        },
        removeRow: function (index) {
            this.table.deleteRow(index);
        },
        removeCol: function (index) {
            var rows = this.table.rows;

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];

                row.deleteCell(index);
            }
        }
    };
    window.EdiTable = EdiTable;
//})();

