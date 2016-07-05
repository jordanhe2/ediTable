(function(){
    // UTILITIES
    function forEach(ops) {
        // Normalize ops
        if (typeof ops == "undefined" ||
            typeof ops.func == "undefined" ||
            typeof ops.arr == "undefined") return;
        if (typeof ops.start == "undefined") ops.start = 0;
        if (typeof ops.end == "undefined") ops.end = ops.arr.length - 1;
        if (typeof ops.dir == "undefined") ops.dir = (ops.end > ops.start) ? 1 : -1;
        if (typeof ops.funcContext == "undefined") ops.funcContext = null;

        // Loop through and run ops.func for each item in ops.arr
        var min = Math.min(ops.start, ops.end),
            max = Math.max(ops.start, ops.end),
            i = (ops.dir > 0) ? min : max;
        while (i >= min && i <= max) {
            ;
            ops.func.apply(ops.funcContext, [ops.arr[i], i]);
            i += ops.dir;
        }
    }

    /**
     * <Class description here>
     *
     * @param{HTMLTable} -
     * @param{Object} -
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
                    var type = (tds.length == 0 ? "th" : "td");
                    for (var j = 0; j < diff; j++) {
                        $(row).append(document.createElement(type));
                    }
                }
            }
        }

        function normalizeOptions(options) {
            options.minRows = options.minRows || 1;
            options.minCols = options.minCols || 1;
            options.maxRows = options.maxRows || -1;
            options.maxCols = options.maxCols || -1;
            options.growRows = options.growRows || false;
            options.growCols = options.growCols || false;
            options.shrinkRows = options.shrinkRows || false;
            options.shrinkCols = options.shrinkCols || false;
        }

        // Context variable
        var that = this;

        var Cell = function (dom) {
            this.dom = dom;
            this.selected = false;
        };
        Cell.prototype = {
            setEditable: function (edit) {
                $(this.dom).prop("contenteditable", edit);
            },
            isEditable: function () {
                return $(this.dom).prop("contenteditable") == "true";
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
                    that.Selection.originCell = this;
                }
                if (ops.last) {
                    that.Selection.terminalCell = this;

                    // Update border
                    var rows = that.getRowCount(),
                        cols = that.getColCount();

                    function useClass(cell, className, use) {
                        if (use) {
                            $(cell.dom).addClass(className);
                        } else {
                            $(cell.dom).removeClass(className);
                        }
                    }

                    for (var i = 0; i < rows; i++) {
                        var row = that.rows[i];
                        for (var j = 0; j < cols; j++) {
                            var cell = row.cells[j];

                            if (!cell.selected) continue;

                            // Top border
                            useClass(cell, "ediTable-cell-selected-top",
                                (i == 0 || !that.rows[i - 1].cells[j].selected));
                            // Bottom border
                            useClass(cell, "ediTable-cell-selected-bottom",
                                (i == (rows - 1) || !that.rows[i + 1].cells[j].selected));
                            // Left border
                            useClass(cell, "ediTable-cell-selected-left",
                                (j == 0 || !row.cells[j - 1].selected));
                            // Right border
                            useClass(cell, "ediTable-cell-selected-right",
                                (j == (cols - 1) || !row.cells[j + 1].selected));
                        }
                    }
                }
            },
            deselect: function () {
                this.selected = false;
                $(this.dom).removeClass("ediTable-cell-selected");
                $(this.dom).removeClass("ediTable-cell-selected-left");
                $(this.dom).removeClass("ediTable-cell-selected-right");
                $(this.dom).removeClass("ediTable-cell-selected-top");
                $(this.dom).removeClass("ediTable-cell-selected-bottom");
            },
            isClear: function () {
                return this.dom.innerHTML == "";
            },
            getValue: function () {
                return this.dom.innerText;
            },
            setValue: function (value, ops) {
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.last == "undefined") ops.last = true;

                // Set value
                $(this.dom).html(value);

                // Perform updates
                if (ops.last){
                    that.updateRowColCount();
                }
            },
            clear: function () {
                this.setValue("");
            }
        };
        this.Cell = Cell;

        var Vector = function (cells, type) {
            this.cells = cells;
            this.type = ((type == "row" || type == "col") ? type : "row");
        };
        Vector.prototype = {
            getCellCount: function () {
                return this.cells.length;
            },
            setEditable: function (edit, ops) {
                // Normalize parameters
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
                        cell.setEditable(edit);
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
                var dir = (ops.end - ops.start > 0) ? 1 : -1,
                    min = Math.min(ops.start, ops.end),
                    max = Math.max(ops.start, ops.end),
                    cells = this.cells;
                forEach({
                    arr: cells,
                    start: 0,
                    end: cells.length - 1,
                    dir: dir,
                    func: function (cell, i) {
                        if (i >= min && i <= max) {
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
                        } else {
                            cell.deselect();
                        }
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
            setValues: function(values, ops){
                // Normalize parameters
                if (typeof ops == "undefined") ops = {};
                if (typeof ops.offset == "undefined") ops.offset = 0;
                if (typeof ops.last == "undefined") ops.last = true;

                // Set values
                for (var i = 0; i < values.length && i < this.cells.length; i ++){
                    var cellOps = {
                        last: false
                    };
                    if (ops.last /*&& somethingElse */){
                        cellOps.last = true;
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
                })
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
            insertCell: function (index, optValue) {
                // Check that options allow for insertion
                var ops = that.options;
                if (this.type == "row") {
                    var maxCols = ops.maxCols;
                    if (maxCols != -1 && (this.getCellCount() >= maxCols)) return;
                } else {
                    var maxRows = ops.maxRows;
                    if (maxRows != -1 && (this.getCellCount() >= maxRows)) return;
                }

                // Normalize parameters
                optValue = optValue || "";

                // Insert into row
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
                        if (row == this) cell.setValue(optValue);

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
                        if (col == this) cell.setValue(optValue);

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
            setCell: function (index, value) {
                this.cells[index].setValue(value);
            }
        };
        this.Vector = Vector;


        // Actual EdiTable properties and init begin here
        this.table = table;
        this.options = optOptions || {};
        this.rows = [];
        this.cols = [];

        normalizeTable(this.table);
        normalizeOptions(this.options);

        this.Selection = {
            originCell: null,
            terminalCell: null,
            getCoords: function (element) {
                var el = $(element);
                var coords = null;

                if ($(that.table).find(el).length > 0) {
                    var cell = el.closest("tr > *");
                    var row = el.closest("tr");

                    var rowIndex = row.index();
                    var colIndex = cell.index();

                    coords = [rowIndex, colIndex];
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
                    var targetCoords = selection.getCoords(e.target);

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
                    // Prevent default if table has focus
                    if (false /* TODO */) {
                        e.preventDefault();
                    }

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


        function copyTest(event) {
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

            //TODO prevent default on table 'focus'.
            event.preventDefault();
        }

        function cutTest(event) {
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

        function pasteTest(event) {
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

                for (var i = 0; i < tableHeight - firstCellCoords[0] && i < data.length; i++) {
                    var row = that.rows[i + firstCellCoords[0]];

                    for (var j = 0; j < tableWidth - firstCellCoords[1] && j < data[i].length; j++) {
                        var cell = row.cells[j + firstCellCoords[1]];

                        cell.setValue(data[i][j]);
                    }
                }
            }

            event.preventDefault();
        }

        document.addEventListener("copy", copyTest);
        document.addEventListener("cut", cutTest);
        document.addEventListener("paste", pasteTest);
    };
    EdiTable.prototype = {
        getRowCount: function () {
            return this.rows.length;
        },
        getColCount: function () {
            return this.cols.length;
        },
        setEditable: function (edit, ops) {
            // Normalize parameters
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
                    row.setEditable(edit, {start: ops.colStart, end: ops.colEnd});
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
            var rows = this.rows,
                dir = (ops.rowEnd - ops.rowStart > 0) ? 1 : -1,
                min = Math.min(ops.rowStart, ops.rowEnd),
                max = Math.max(ops.rowStart, ops.rowEnd);
            forEach({
                arr: rows,
                start: 0,
                end: rows.length - 1,
                dir: dir,
                func: function (row, i) {
                    if (i >= min && i <= max) {
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
                    } else {
                        row.deselect();
                    }
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
        setRowValues : function(values){
            // TODO
        },
        setColValues : function(values){
            // TODO
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
        hasSelection: function () {
            return this.getSelectedRows().length > 0;
        },
        insertRow: function (index, optValues) {
            var colCount = this.getColCount();

            // Normalize parameters
            if (typeof optValues == "undefined") optValues = [];
            while (optValues.length < colCount) optValues.push("");

            // Insert row
            if (colCount > 0) {
                this.cols[0].insertCell(index, optValues[0]);
                for (var i = 1; i < colCount; i++) {
                    var col = this.cols[i];
                    col.setCell(index, optValues[i]);
                }
            } else {
                // Renormalize parameters
                if (optValues.length == 0) optValues.push("");

                // Create row and row dom
                var rowDom = this.table.insertRow(0),
                    row = new Vector([], "row");
                this.rows.push(row);

                // Add row, and add column for each optValue
                for (var i = 0; i < optValues.length; i++) {
                    var td = this.table.rows[0].insertCell(-1),
                        cell = new Cell(td),
                        col = new Vector([cell], "col");

                    // Set cell value
                    cell.setValue(optValues[i]);

                    // Add cell to row
                    row.cells.push(cell);

                    // Push col to cols
                    this.cols.push(col);
                }
            }
        },
        insertCol: function (index, optValues) {
            var rowCount = this.getRowCount();

            // Normalize parameters
            if (typeof optValues == "undefined") optValues = [];
            while (optValues.length < rowCount) optValues.push("");

            // Insert row
            if (rowCount > 0) {
                this.rows[0].insertCell(index, optValues[0]);
                for (var i = 1; i < rowCount; i++) {
                    var row = this.rows[i];
                    row.setCell(index, optValues[i]);
                }
            } else {
                // Renormalize parameters
                if (optValues.length == 0) optValues.push("");

                // Create col
                var col = new Vector([], "col");
                this.cols.push(col);

                for (var i = 0; i < optValues.length; i++) {
                    var rowDom = this.table.insertRow(-1),
                        cellDom = rowDom.insertCell(-1),
                        cell = new Cell(cellDom),
                        row = new Vector([cell], "row");

                    // Set cell value
                    cell.setValue(optValues[i]);

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
        },
        updateRowColCount: function(){
            var options = this.options,
                rowCount = this.getRowCount(),
                colCount = this.getColCount(),
                lastRowClear = this.rows[rowCount - 1].isClear(),
                lastColClear = this.cols[colCount - 1].isClear(),
                secondLastRowClear = this.rows[rowCount - 2].isClear(),
                secondLastColClear = this.cols[colCount - 2].isClear();

            // Grow rows
            if (options.growRows){
                // TODO
            }
            // Grow cols
            if (options.growCols){
                // YOLO
            }
            // Shrink rows
            if (options.shrinkRows){
                // TODO
            }
            // Shrink cols
            if (options.shrinkCols){
                // TODO
            }
        }
    };
    window.EdiTable = EdiTable;
})();


// Testing
var editable = new EdiTable(document.getElementById("table"), {growRows: true});

