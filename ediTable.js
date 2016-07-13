//(function(){
    "use strict";

    // UTILITIES
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
            var rows = that.getRowCount(),
                cols = that.getColCount();

            for (var i = 0; i < rows; i++) {
                var row = that.rows[i];
                for (var j = 0; j < cols; j++) {
                    var cell = row.cells[j],
                        cellDom = $(cell.dom);

                    if (!cell.selected) continue;

                    // Top border
                    cellDom.toggleClass("ediTable-cell-selected-top",
                        (i == 0 || !that.rows[i - 1].cells[j].selected));
                    // Bottom border
                    cellDom.toggleClass("ediTable-cell-selected-bottom",
                        (i == (rows - 1) || !that.rows[i + 1].cells[j].selected));
                    // Left border
                    cellDom.toggleClass("ediTable-cell-selected-left",
                        (j == 0 || !row.cells[j - 1].selected));
                    // Right border
                    cellDom.toggleClass("ediTable-cell-selected-right",
                        (j == (cols - 1) || !row.cells[j + 1].selected));
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

        /**
         * Represents an individual cell of a table by wrapping around a <td> or <th>.
         *
         * @param{HTMLTableDataCellElement|HTMLTableHeaderCellElement} - element to wrap around
         */
        var Cell = function (dom) {
            this.dom = dom;
            this.selected = false;
            this.editMode = false;
        };
        Cell.prototype = {
            setEditable: function (optEdit) {
                // Normalize parameters
                if (typeof optEdit == "undefined") optEdit = true;

                // Set editable
                $(this.dom).prop("contenteditable", optEdit);
            },
            isEditable: function () {
                return $(this.dom).prop("contenteditable") == "true";
            },
            setEditMode: function(edit){
                this.editMode = edit;

                var t = this;
                function onKeyDown(e){
                    t.setValue(t.getValue());
                }
                if (edit){
                    this.dom.focus();
                    //selectText(this.dom);

                    $(this.dom).on("keypress", onKeyDown);
                } else {
                    $(this.dom).detach("keypress", onKeyDown);
                }
            },
            setHeader: function (header) {
                var type = (header ? "th" : "td"),
                    oldDom = this.dom,
                    children = $(oldDom).contents().detach(),
                    newDom = document.createElement(type);

                // Transfer attributes
                $.each(oldDom.attributes, function (index) {
                    $(newDom).attr(oldDom.attributes[index].name, oldDom.attributes[index].value);
                });

                // Append children
                $(newDom).append(children);

                // Replace oldDom with newDom
                $(oldDom).replaceWith(newDom);
                this.dom = newDom;
            },
            isHeader: function () {
                return this.dom.tagName.toLowerCase() == "th";
            },
            select: function (ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.first == "undefined") ops.first = true;
                if (typeof ops.last == "undefined") ops.last = true;

                // Mark as selected
                this.selected = true;
                $(this.dom).addClass("ediTable-cell-selected");

                // Perform other updates
                if (ops.first) {
                    that.setRenderEnabled(false);

                    that.Selection.originCell = this;
                }
                if (ops.last) {
                    that.Selection.terminalCell = this;
                    updateSelectionBorder();

                    that.setRenderEnabled(true);
                }

                // Enter edit mode
                this.setEditMode(ops.first && ops.last && this.isEditable());
            },
            deselect: function () {
                this.selected = false;
                $(this.dom)
                    .removeClass("ediTable-cell-selected")
                    .removeClass("ediTable-cell-selected-left")
                    .removeClass("ediTable-cell-selected-right")
                    .removeClass("ediTable-cell-selected-top")
                    .removeClass("ediTable-cell-selected-bottom");
            },
            isClear: function () {
                return this.dom.innerHTML == "";
            },
            getValue: function () {
                return this.dom.innerText;
            },
            setValue: function (value, ops) {
                // Only set value if editable
                if (!this.isEditable()) return;

                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.first == "undefined") ops.first = true;
                if (typeof ops.last == "undefined") ops.last = true;
                if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;

                // Set value
                $(this.dom).html(value);
                if (!ops.noUpdate) updateRowColCount();

                // Fire change event
                if (ops.last){
                    that.fireEvent("change");
                }
            },
            clear: function () {
                this.setValue("");
            }
        };
        this.Cell = Cell;

        /**
         * Represents a single row or column of a table.  Note that no DOM objects are wrapped
         * because HTML tables only store data in rows, not both.
         *
         * @param{Array<Cell>} - collection of Cell objects to be in the new Vector
         * @param{String} - either "row" or "col", whichever is applicable
         */
        var Vector = function (cells, type) {
            this.cells = cells;
            this.type = ((type == "row" || type == "col") ? type : "row");
        };
        Vector.prototype = {
            getCellCount: function () {
                return this.cells.length;
            },
            setEditable: function (optEdit, ops) {
                // Normalize parameters
                if (typeof optEdit == "undefined") optEdit = true;
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.start == "undefined") ops.start = 0;
                if (typeof ops.end == "undefined") ops.end = this.getCellCount() - 1;

                // Set editable
                var cells = this.cells;
                forEach({
                    arr: cells,
                    start: ops.start,
                    end: ops.end,
                    func: function (cell) {
                        cell.setEditable(optEdit);
                    }
                });
            },
            isEditable: function () {
                for (var i = 0; i < this.getCellCount(); i++) {
                    if (!this.cells[i].isEditable()) return false;
                }
                return true;
            },
            setHeader: function (header) {
                for (var i = 0; i < this.getCellCount(); i++) {
                    this.cells[i].setHeader(header);
                }
            },
            isHeader: function () {
                for (var i = 0; i < this.getCellCount(); i++) {
                    if (!this.cells[i].isHeader()) return false;
                }
                return true;
            },
            select: function (ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.start == "undefined") ops.start = 0;
                if (typeof ops.end == "undefined") ops.end = this.getCellCount() - 1;
                if (typeof ops.first == "undefined") ops.first = true;
                if (typeof ops.last == "undefined") ops.last = true;

                // Loop this.cells and select/deselect
                this.deselect();
                var dir = (ops.end - ops.start > 0) ? 1 : -1,
                    min = Math.min(ops.start, ops.end),
                    max = Math.max(ops.start, ops.end),
                    cells = this.cells;
                forEach({
                    arr: cells,
                    start: ops.start,
                    end: ops.end,
                    func: function (cell, i) {
                        var cellOps = {first: false, last: false};
                        if (ops.first) {
                            if ((dir == 1 && i == min) || (dir == -1 && i == max)) {
                                cellOps.first = true;
                            }
                        }
                        if (ops.last) {
                            if ((dir == 1 && i == max) || (dir == -1 && i == min)) {
                                cellOps.last = true;
                            }
                        }
                        cell.select(cellOps);
                    }
                });
            },
            deselect: function (ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.start == "undefined") ops.start = 0;
                if (typeof ops.end == "undefined") ops.end = this.getCellCount() - 1;

                // Loop this.cells and deselect
                var cells = this.cells;
                forEach({
                    arr: cells,
                    start: ops.start,
                    end: ops.end,
                    func: function (cell) {
                        cell.deselect();
                    }
                });
            },
            setValues: function (values, ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.first == "undefined") ops.first = true;
                if (typeof ops.last == "undefined") ops.last = true;
                if (typeof ops.offset == "undefined") ops.offset = 0;

                // Set values
                for (var i = 0; i < values.length && i < this.cells.length - ops.offset; i++) {
                    var cellOps = {
                        first: false,
                        last: false
                    }
                    if (i == 0 && ops.first) cellOps.first = true;
                    if (ops.last){
                        if (i == this.cells.length - ops.offset - 1 || i == values.length - 1){
                            if (this.canInsertCell()){
                                if (i == values.length - 1) cellOps.last = true;
                            } else {
                                cellOps.last = true;
                            }
                        }
                    }

                    this.cells[i + ops.offset].setValue(values[i], cellOps);
                }
            },
            clear: function (ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.start == "undefined") ops.start = 0;
                if (typeof ops.end == "undefined") ops.end = this.getCellCount() - 1;

                // Clear cells
                var cells = this.cells;
                forEach({
                    arr: cells,
                    start: ops.start,
                    end: ops.end,
                    func: function (cell) {
                        cell.clear();
                    }
                });
            },
            isClear: function (ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.start == "undefined") ops.start = 0;
                if (typeof ops.end == "undefined") ops.end = this.getCellCount() - 1;

                // Check cells
                var cells = this.cells,
                    clear = true;
                forEach({
                    arr: cells,
                    start: ops.start,
                    end: ops.end,
                    func: function (cell) {
                        if (!cell.isClear()) clear = false;
                    }
                });
                return clear;
            },
            getValues: function (ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.start == "undefined") ops.start = 0;
                if (typeof ops.end == "undefined") ops.end = this.getCellCount() - 1;

                // Loop this.cells and return values in an array
                var cells = this.cells,
                    values = [];
                forEach({
                    arr: cells,
                    start: ops.start,
                    end: ops.end,
                    func: function (cell) {
                        values.push(cell.getValue());
                    }
                });

                return values;
            },
            getSelection: function () {
                return new Vector(
                    this.cells.filter(function (cell) {
                        return cell.selected;
                    }),
                    this.type
                );
            },
            getSelectedValues: function () {
                return this.getSelection().cells.map(function (cell) {
                    return cell.getValue();
                });
            },
            hasSelection: function () {
                return this.getSelection().cells.length > 0;
            },
            canInsertCell: function(){
                var options = that.options;

                if (this.type == "row") {
                    var maxCols = options.maxCols;
                    if (!options.growRows) return false;
                    if (maxCols != -1 && (this.getCellCount() >= maxCols)) return false;
                } else {
                    var maxRows = options.maxRows;
                    if (!options.growCols) return false;
                    if (maxRows != -1 && (this.getCellCount() >= maxRows)) return false;
                }

                return true;
            },
            insertCell: function (index, ops) {
                if (!this.canInsertCell()) return;

                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;
                if (typeof ops.value == "undefined") ops.value = options.initialCellValue;

                // Insert into row
                var insertOps = {
                    first: false,
                    last: false,
                    noUpdate: true
                }
                if (this.type == "row") {
                    // Create new col
                    var newCol = new Vector([], "col");
                    that.cols.splice(index, 0, newCol);

                    // Make cells, add them to rows and col
                    for (var i = 0; i < that.getRowCount(); i++) {
                        var row = that.rows[i],
                            rowDom = that.table.rows[i],
                            edit = row.isEditable(),
                            header = row.isHeader(),
                            cellDom = rowDom.insertCell(index),
                            cell = new Cell(cellDom);

                        // Configure cell
                        cell.setEditable(edit);
                        cell.setHeader(header);
                        if (row == this) cell.setValue(ops.value, insertOps);

                        // Add cell to rows and col
                        row.cells.splice(index, 0, cell);
                        newCol.cells.push(cell);
                    }
                }
                // Insert into col
                else {
                    // Create new row
                    var newRow = new Vector([], "row"),
                        rowDom = that.table.insertRow(index);
                    that.rows.splice(index, 0, newRow);

                    // Make cells, and them to cols and row
                    for (var i = 0; i < that.getColCount(); i++) {
                        var col = that.cols[i],
                            edit = col.isEditable(),
                            header = col.isHeader(),
                            cellDom = rowDom.insertCell(i),
                            cell = new Cell(cellDom);

                        // Configure cell
                        cell.setEditable(edit);
                        cell.setHeader(header);
                        if (col == this) cell.setValue(ops.value, insertOps);

                        // Add cell to cols and row
                        col.cells.splice(index, 0, cell);
                        newRow.cells.push(cell);
                    }
                }
            },
            removeCell: function (index) {
                // Check that options allow for removal
                var ops = that.options;
                if (this.type == "row") {
                    var minCols = ops.minCols;
                    if (minCols != -1 && (this.getCellCount() <= minCols)) return;
                } else {
                    var minRows = ops.minRows;
                    if (minRows != -1 && (this.getCellCount() <= minRows)) return;
                }

                // Remove from row
                if (this.type == "row") {
                    // Remove cells from rows and dom
                    for (var i = 0; i < that.getRowCount(); i++) {
                        that.table.rows[i].deleteCell(index);
                        that.rows[i].cells.splice(index, 1);
                    }

                    // Remove col
                    that.cols.splice(index, 1);

                    // Remove all trs if no cols are left
                    if (that.cols.length == 0) {
                        (that.table.tBodies[0] || that.table).innerHTML = "";
                    }
                }
                // Remove from col
                else {
                    // Remove cells from cols
                    for (var i = 0; i < that.getColCount(); i++) {
                        that.cols[i].cells.splice(index, 1);
                    }

                    // Remove dom and row
                    that.table.deleteRow(index);
                    that.rows.splice(index, 1);

                    // Remove all cols if no rows are left
                    if (that.rows.length == 0) {
                        that.cols = [];
                    }
                }
            },
            setCell: function (index, value, ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;

                // Set value
                this.cells[index].setValue(value, ops);
            }
        };
        this.Vector = Vector;


        // Actual EdiTable properties and init begin here
        this.table = table;
        this.options = optOptions || {};
        this.rows = [];
        this.cols = [];
        this.events = {
            change: []
        };

        normalizeTable(this.table);
        normalizeOptions(this.options);

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

        // Setup rows
        this.rows = $("tr", this.table).toArray().map(function (tr) {
            var cells = $(tr.cells).toArray().map(function (td) {
                return new Cell(td);
            });
            return new Vector(cells, "row");
        });
        // Setup cols
        if (this.getRowCount() > 0) {
            for (var i = 0; i < this.rows[0].cells.length; i++) {
                var cells = [];
                for (var j = 0; j < this.getRowCount(); j++) {
                    cells.push(this.rows[j].cells[i]);
                }
                this.cols.push(new Vector(cells, "col"));
            }
        }
        // Fix rows and cols
        updateRowColCount();

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

                console.log("COPYING");

                //TODO prevent default on table 'focus'.
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

                    that.setRowValues(data, {rowOffset: firstCellCoords[0], colOffset: firstCellCoords[1]});
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
            return this.rows.length;
        },
        getColCount: function () {
            return this.cols.length;
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
            var rows = this.rows;
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row) {
                    row.setEditable(optEdit, {start: ops.colStart, end: ops.colEnd});
                }
            })
        },
        isEditable: function () {
            for (var i = 0; i < this.getRowCount(); i++) {
                if (!this.rows[i].isEditable()) return false;
            }
            return true;
        },
        select: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Do selection
            this.deselect();
            var rows = this.rows,
                dir = (ops.rowEnd - ops.rowStart > 0) ? 1 : -1,
                min = Math.min(ops.rowStart, ops.rowEnd),
                max = Math.max(ops.rowStart, ops.rowEnd);
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row, i) {
                    var rowOps = {
                        start: ops.colStart,
                        end: ops.colEnd,
                        first: false,
                        last: false
                    };

                    if ((dir == 1 && i == min) || (dir == -1 && i == max)) {
                        rowOps.first = true;
                    }
                    if ((dir == 1 && i == max) || (dir == -1 && i == min)) {
                        rowOps.last = true;
                    }

                    row.select(rowOps);
                }
            });
        },
        deselect: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Do deselection
            var rows = this.rows;
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row) {
                    row.deselect({start: ops.colStart, end: ops.colEnd});
                }
            });
        },
        setRowValues: function (values, ops) {
            // Normalize paramters
            if (!isArrayOfArrays(values)) throw new TypeError("values parameter must be an Array of Arrays");
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowOffset == "undefined") ops.rowOffset = 0;
            if (typeof ops.colOffset == "undefined") ops.colOffset = 0;

            // Set values
            for (var i = 0; i < values.length && i < this.rows.length - ops.rowOffset; i ++){
                var rowOps = {
                    first: false,
                    last: false,
                    offset: ops.colOffset
                };
                if (i == 0) rowOps.first = true;
                if (i == this.rows.length - ops.rowOffet - 1 || i == values.length - 1){
                    if (this.rowsCanGrow()){
                        if (i == values.length - 1) rowOps.last = true;
                    } else {
                        rowOps.last = true;
                    }
                }

                this.rows[i + ops.rowOffset].setValues(values[i], rowOps);
            }
        },
        setColValues: function (values, ops) {
            // Normalize paramters
            if (!isArrayOfArrays(values)) throw new TypeError("values parameter must be an Array of Arrays");
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowOffset == "undefined") ops.rowOffset = 0;
            if (typeof ops.colOffset == "undefined") ops.colOffset = 0;

            // Set values
            for (var i = 0; i < values.length && i < this.cols.length - ops.colOffset; i ++){
                var colOps = {
                    first: false,
                    last: false,
                    offset: ops.rowOffset
                };
                if (i == 0) colOps.first = true;
                if (i == this.cols.length - ops.colOffet - 1 || i == values.length - 1){
                    if (this.colCanGrow()){
                        if (i == values.length - 1) colOps.last = true;
                    } else {
                        colOps.last = true;
                    }
                }

                this.cols[i + ops.colOffset].setValues(values[i], colOps);
            }
        },
        clear: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Clear
            var rows = this.rows;
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row) {
                    row.clear({start: ops.colStart, end: ops.colEnd});
                }
            });
        },
        isClear: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Check rows
            var rows = this.rows,
                clear = true;
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row) {
                    if (!row.isClear(ops.colStart, ops.colEnd)) clear = false;
                }
            });
            return clear;
        },
        getRowValues: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Get values
            var rows = this.rows,
                rowVals = [];
            forEach({
                arr: rows,
                start: ops.rowStart,
                end: ops.rowEnd,
                func: function (row) {
                    rowVals.push(row.getValues({start: ops.colStart, end: ops.colEnd}));
                }
            });

            return rowVals;
        },
        getColValues: function (ops) {
            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.rowStart == "undefined") ops.rowStart = 0;
            if (typeof ops.rowEnd == "undefined") ops.rowEnd = (this.getRowCount() - 1);
            if (typeof ops.colStart == "undefined") ops.colStart = 0;
            if (typeof ops.colEnd == "undefined") ops.colEnd = (this.getColCount() - 1);

            // Get values
            var cols = this.cols,
                colVals = [];
            forEach({
                arr: cols,
                start: ops.colStart,
                end: ops.colEnd,
                func: function (col) {
                    colVals.push(col.getValues({start: ops.rowStart, end: ops.rowEnd}))
                }
            });

            return colVals;
        },
        getSelectedRows: function () {
            var rows = [];
            for (var i = 0; i < this.getRowCount(); i++) {
                if (this.rows[i].hasSelection()) {
                    rows.push(this.rows[i].getSelection());
                }
            }
            return rows;
        },
        getSelectedCols: function () {
            var cols = [];
            for (var i = 0; i < this.getColCount(); i++) {
                if (this.cols[i].hasSelection()) {
                    cols.push(this.cols[i].getSelection());
                }
            }
            return cols;
        },
        getSelectedRowValues: function () {
            return this.getSelectedRows().map(function (row) {
                return row.getValues();
            });
        },
        getSelectedColValues: function () {
            return this.getSelectedCols().map(function (col) {
                return col.getValues();
            });
        },
        hasFocus: function () {
            var activeElement = document.activeElement;
            var lastClicked = this.lastClicked;

            return $(activeElement).closest(this.table).length == 1 || $(lastClicked).closest(this.table).length == 1;
        },
        hasSelection: function () {
            return this.getSelectedRows().length > 0;
        },
        rowsCanGrow: function(){
            return this.cols[0].canInsertCell();
        },
        insertRow: function (index, ops) {
            var colCount = this.getColCount();

            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;
            if (typeof ops.values == "undefined") ops.values = [];
            while (ops.values.length < colCount) ops.values.push(this.options.initialCellValue);

            // Insert row
            var cellOps = {
                noUpdate: ops.noUpdate,
                first: false,
                last: false
            };
            if (colCount > 0) {
                this.cols[0].insertCell(index, {value: ops.values[0], noUpdate: ops.noUpdate});

                for (var i = 1; i < colCount; i++) {
                    var col = this.cols[i];
                    col.setCell(index, ops.values[i], cellOps);
                }
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
        colsCanGrow: function(){
            return this.rows[0].canInsertCell();
        },
        insertCol: function (index, ops) {
            var rowCount = this.getRowCount();

            // Normalize parameters
            if (typeof ops == "undefined") ops = {};
            if (typeof ops.noUpdate == "undefined") ops.noUpdate = false;
            if (typeof ops.values == "undefined") ops.values = [];
            while (ops.values.length < rowCount) ops.values.push(this.options.initialCellValue);

            // Insert row
            var cellOps = {
                noUpdate: ops.noUpdate,
                first: false,
                last: false
            }
            if (rowCount > 0) {
                this.rows[0].insertCell(index, {value: ops.values[0], noUpdate: ops.noUpdate});

                for (var i = 1; i < rowCount; i++) {
                    var row = this.rows[i];
                    row.setCell(index, ops.values[i], cellOps);
                }
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
        removeRow: function (index) {
            this.cols[0].removeCell(index);
        },
        removeCol: function (index) {
            this.rows[0].removeCell(index);
        }
    };
    window.EdiTable = EdiTable;
//})();

