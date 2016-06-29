/**
 * <Class description here>
 *
 * @param{HTMLTable} -
 * @param{Object} -
 */
var EdiTable = function(table, optOptions) {
    // Utitilites
    function normalizeTable(table){
        var rows = $("tr", table).toArray(),
            lengths = rows.map(function(row){
                return row.cells.length;
            }),
            max = Math.max.apply(null, lengths);

        for (var i = 0; i < rows.length; i ++){
            var row = rows[i],
                tds = $("td", row).toArray(),
                ths = $("th", row).toArray(),
                diff = max - (tds.length + ths.length);

            if (diff > 0){
                var type = (tds.length == 0 ? "th" : "td");
                for (var j = 0; j < diff; j ++){
                    $(row).append(document.createElement(type));
                }
            }
        }
    }
    function normalizeOptions(options){
        // if (typeof options.prop == "undefined") options.prop = value;
        // ...
    }

    // Context variable
    var that = this;

    Cell = function (dom) {
        this.dom = dom;
        this.selected = false;
    };
    Cell.prototype = {
        setEditable : function(edit){
            $(this.dom).prop("contenteditable", edit);
        },
        isEditable : function(){
            return $(this.dom).prop("contenteditable") == "true";
        },
        setHeader : function(header){
            var type = (header ? "th" : "td"),
                oldDom = this.dom,
                children = $(oldDom).contents().detach(),
                newDom = document.createElement(type);

            // Transfer attributes
            $.each(oldDom.attributes, function(index) {
                $(newDom).attr(oldDom.attributes[index].name, oldDom.attributes[index].value);
            });

            // Append children
            $(newDom).append(children);

            // Replace oldDom with newDom
            $(oldDom).replaceWith(newDom);
            this.dom = newDom;
        },
        isHeader : function(){
            return this.dom.tagName.toLowerCase() == "th";
        },
        select : function(){
            this.selected = true;
            $(this.dom).addClass("ediTable-cell-selected");
        },
        deselect : function(){
            this.selected = false;
            $(this.dom).removeClass("ediTable-cell-selected");
        },
        clear : function(){
            this.dom.innerHTML = "";
        },
        getValue : function(){
            return this.dom.innerText;
        },
        setValue : function (value) {
            $(this.dom).html(value);
        },
        appendValue : function (value) {
            $(this.dom).append(value);
        }
    };
    this.Cell = Cell;

    Vector = function (cells, type) {
        this.cells = cells;
        this.type = ((type == "row" || type == "col") ? type : "row");
    };
    Vector.prototype = {
        getCellCount : function(){
            return this.cells.length;
        },
        setEditable : function(edit, optStart, optEnd){
            // Normalize parameters
            optStart = optStart || 0;
            optEnd = optEnd || (this.getCellCount() - 1);
            if (optStart > optEnd){
                var temp = optStart;
                optStart = optEnd;
                optEnd = temp;
            }

            // Set editable
            for (var i = optStart; i <= optEnd; i ++){
                this.cells[i].setEditable(edit);
            }
        },
        isEditable : function(){
            for (var i = 0; i < this.getCellCount(); i ++){
                if (!this.cells[i].isEditable()) return false;
            }
            return true;
        },
        setHeader : function(header){
            for (var i = 0; i < this.getCellCount(); i ++){
                this.cells[i].setHeader(header);
            }
        },
        isHeader : function(){
            for (var i = 0; i < this.getCellCount(); i ++){
                if (!this.cells[i].isHeader()) return false;
            }
            return true;
        },
        select : function(optStart, optEnd){
            // Normalize parameters
            optStart = optStart || 0;
            optEnd = optEnd || (this.getCellCount() - 1);
            if (optStart > optEnd){
                var temp = optStart;
                optStart = optEnd;
                optEnd = temp;
            }

            // Loop this.cells and select/deselect
            for (var i = 0; i < this.getCellCount(); i++) {
                if (i >= optStart && i <= optEnd){
                    this.cells[i].select();
                } else {
                    this.cells[i].deselect();
                }
            }
        },
        deselect : function(optStart, optEnd){
            // Normalize parameters
            optStart = optStart || 0;
            optEnd = optEnd || (this.getCellCount() - 1);
            if (optStart > optEnd){
                var temp = optStart;
                optStart = optEnd;
                optEnd = temp;
            }

            // Loop this.cells and deselect
            for (var i = 0; i < this.getCellCount(); i++) {
                if (i >= optStart && i <= optEnd){
                    this.cells[i].deselect();
                }
            }
        },
        clear : function(optStart, optEnd){
            // Normalize parameters
            optStart = optStart || 0;
            optEnd = optEnd || (this.getCellCount() - 1);
            if (optStart > optEnd){
                var temp = optStart;
                optStart = optEnd;
                optEnd = temp;
            }

            for (var i = optStart; i <= optEnd; i ++){
                this.cells[i].clear();
            }
        },
        getValues : function(optStart, optEnd){
            // Normalize parameters
            optStart = optStart || 0;
            optEnd = optEnd || (this.getCellCount() - 1);
            if (optStart > optEnd){
                var temp = optStart;
                optStart = optEnd;
                optEnd = temp;
            }

            // Loop this.cells and return values in an array
            var values = [];
            for (var i = optStart; i <= optEnd; i++) {
                values.push(this.cells[i].getValue());
            }

            return values;
        },
        getSelection : function(){
            return new Vector(
                this.cells.filter(function(cell){
                    return cell.selected;
                }),
                this.type
            );
        },
        getSelectedValues : function(){
            return this.getSelection().cells.map(function(cell){
                return cell.getValue();
            });
        },
        hasSelection : function(){
            return this.getSelection().cells.length > 0;
        },
        insertCell : function(index, optValue){
            // Normalize parameters
            optValue = optValue || "";

            // Insert into row
            if (this.type == "row"){
                // Create new col
                var newCol = new Vector([], "col");
                that.cols.splice(index, 0, newCol);

                // Make cells, add them to rows and col
                for (var i = 0; i < that.getRowCount(); i ++){
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
                for (var i = 0; i < that.getColCount(); i ++){
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
        removeCell : function(index){
            // Remove from row
            if (this.type == "row"){
                // Remove cells from rows and dom
                for (var i = 0; i < that.getRowCount(); i ++){
                    that.table.rows[i].deleteCell(index);
                    that.rows[i].cells.splice(index, 1);
                }

                // Remove col
                that.cols.splice(index, 1);

                // Remove all trs if no cols are left
                if (that.cols.length == 0){
                    (that.table.tBodies[0] || that.table).innerHTML = "";
                }
            }
            // Remove from col
            else {
                // Remove cells from cols
                for (var i = 0; i < that.getColCount(); i ++){
                    that.cols[i].cells.splice(index, 1);
                }

                // Remove dom and row
                that.table.deleteRow(index);
                that.rows.splice(index, 1);

                // Remove all cols if no rows are left
                if (that.rows.length == 0){
                    that.cols = [];
                }
            }
        },
        setCell : function(index, value){
            this.cells[index].setValue(value);
        },
        appendCell: function(index, value) {
            this.cells[index].appendValue(value);
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

    // Setup rows
    this.rows = $("tr", this.table).toArray().map(function(tr){
        var cells = $(tr.cells).toArray().map(function(td){
            return new Cell(td);
        });
        return new Vector(cells, "row");
    });

    // Setup cols
    if (this.getRowCount() > 0) {
        for (var i = 0; i < this.rows[0].cells.length; i ++){
            var cells = [];
            for (var j = 0; j < this.getRowCount(); j ++){
                cells.push(this.rows[j].cells[i]);
            }
            this.cols.push(new Vector(cells, "col"));
        }
    }


    function copyTest(event) {
        console.log(event, event.clipboardData);

        event.clipboardData.setData("text/plain", "oiewfj");

        event.preventDefault();
    }
    function cutTest(event){
        copyTest(event);
        //TODO clear selected cells.
    }
    function pasteTest(event){
        //Use innerText of tr's found in the template to paste stuff.

        var htmlText = event.clipboardData.getData("text/html");

        //DOMImplementation.createHTMLDocument is widely supported by browsers but I'm unsure how exploitable it is.
        var writtenDoc = document.implementation.createHTMLDocument();

        writtenDoc.write(htmlText);
        //DOMParser is more secure, but less widely supported.
        var parser = new DOMParser();
        var parsedDoc = parser.parseFromString(htmlText, "text/html");

        console.log("Using DOMImplementation.createHTMLDocument\n", writtenDoc, "\nUsing DOMParser\n", parsedDoc);

        //Whichever implementation we decide, we can refer to it as html.
        var html = parsedDoc;

        //Get data from table instead of searching for tr's because semantics.
        var tables = html.getElementsByTagName("table");
        //Use first table if there is more than one copied.
        var table = tables.length > 0 ? tables[0] : null;

        if (table) {
            var rows = table.rows;
            var data = [];

            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var cells = row.cells;

                data[i] = [];

                for (var j = 0; j < cells.length; j++) {
                    var cell = cells[j];

                    data[i][j] = cell.innerText;
                }
            }

            console.log("Data being pasted: ", data);
        }

        event.preventDefault();
    }
    document.addEventListener("copy", copyTest);
    document.addEventListener("cut", cutTest);
    document.addEventListener("paste", pasteTest);
};
EdiTable.prototype = {
    getRowCount : function(){
        return this.rows.length;
    },
    getColCount : function(){
        return this.cols.length;
    },
    setEditable : function(edit, optRowStart, optRowEnd, optColStart, optColEnd){
        // Normalize parameters
        optRowStart = optRowStart || 0;
        optRowEnd = optRowEnd || (this.getRowCount() - 1);
        optColStart = optColStart || 0;
        optColEnd = optColEnd || (this.getColCount() - 1);
        if (optRowStart > optRowEnd){
            var temp = optRowStart;
            optRowStart = optRowEnd;
            optRowEnd = temp;
        }
        if (optColStart > optColEnd){
            var temp = optColStart;
            optColStart = optColEnd;
            optColEnd = temp;
        }

        // Set editable
        for (var i = optRowStart; i <= optRowEnd; i ++){
            this.rows[i].setEditable(edit, optColStart, optColEnd);
        }
    },
    isEditable : function(){
        for (var i = 0; i < this.getRowCount(); i ++){
            if (!this.rows[i].isEditable()) return false;
        }
        return true;
    },
    select : function(optRowStart, optRowEnd, optColStart, optColEnd){
        // Normalize parameters
        optRowStart = optRowStart || 0;
        optRowEnd = optRowEnd || (this.getRowCount() - 1);
        optColStart = optColStart || 0;
        optColEnd = optColEnd || (this.getColCount() - 1);
        if (optRowStart > optRowEnd){
            var temp = optRowStart;
            optRowStart = optRowEnd;
            optRowEnd = temp;
        }
        if (optColStart > optColEnd){
            var temp = optColStart;
            optColStart = optColEnd;
            optColEnd = temp;
        }

        // Do selection
        for (var i = 0; i < this.getRowCount(); i ++){
            if (i >= optRowStart && i <= optRowEnd){
                this.rows[i].select(optColStart, optColEnd);
            } else {
                this.rows[i].deselect();
            }
        }
    },
    deselect : function(optRowStart, optRowEnd, optColStart, optColEnd){
        // Normalize parameters
        optRowStart = optRowStart || 0;
        optRowEnd = optRowEnd || (this.getRowCount() - 1);
        optColStart = optColStart || 0;
        optColEnd = optColEnd || (this.getColCount() - 1);
        if (optRowStart > optRowEnd){
            var temp = optRowStart;
            optRowStart = optRowEnd;
            optRowEnd = temp;
        }
        if (optColStart > optColEnd){
            var temp = optColStart;
            optColStart = optColEnd;
            optColEnd = temp;
        }

        // Do deselection
        for (var i = optRowStart; i <= optRowEnd; i ++){
            this.rows[i].deselect(optColStart, optColEnd);
        }
    },
    clear : function(optRowStart, optRowEnd, optColStart, optColEnd){
        // Normalize parameters
        optRowStart = optRowStart || 0;
        optRowEnd = optRowEnd || (this.getRowCount() - 1);
        optColStart = optColStart || 0;
        optColEnd = optColEnd || (this.getColCount() - 1);
        if (optRowStart > optRowEnd){
            var temp = optRowStart;
            optRowStart = optRowEnd;
            optRowEnd = temp;
        }
        if (optColStart > optColEnd){
            var temp = optColStart;
            optColStart = optColEnd;
            optColEnd = temp;
        }

        // Clear
        for (var i = optRowStart; i <= optRowEnd; i ++){
            this.rows[i].clear(optColStart, optColEnd);
        }
    },
    getRowValues : function(optRowStart, optRowEnd, optColStart, optColEnd){
        // Normalize parameters
        optRowStart = optRowStart || 0;
        optRowEnd = optRowEnd || (this.getRowCount() - 1);
        optColStart = optColStart || 0;
        optColEnd = optColEnd || (this.getColCount() - 1);
        if (optRowStart > optRowEnd){
            var temp = optRowStart;
            optRowStart = optRowEnd;
            optRowEnd = temp;
        }
        if (optColStart > optColEnd){
            var temp = optColStart;
            optColStart = optColEnd;
            optColEnd = temp;
        }

        // Get values
        var rows = [];
        for (var i = optRowStart; i <= optRowEnd; i ++){
            rows.push(this.rows[i].getValues(optColStart, optColEnd));
        }

        return rows;
    },
    getColValues : function(optRowStart, optRowEnd, optColStart, optColEnd){
        // Normalize parameters
        optRowStart = optRowStart || 0;
        optRowEnd = optRowEnd || (this.getRowCount() - 1);
        optColStart = optColStart || 0;
        optColEnd = optColEnd || (this.getColCount() - 1);
        if (optRowStart > optRowEnd){
            var temp = optRowStart;
            optRowStart = optRowEnd;
            optRowEnd = temp;
        }
        if (optColStart > optColEnd){
            var temp = optColStart;
            optColStart = optColEnd;
            optColEnd = temp;
        }

        // Get values
        var cols = [];
        for (var i = optColStart; i <= optColEnd; i ++){
            cols.push(this.cols[i].getValues(optRowStart, optRowEnd));
        }

        return cols;
    },
    getSelectedRows : function(){
        var rows = [];
        for (var i = 0; i < this.getRowCount(); i ++){
            if (this.rows[i].hasSelection()){
                rows.push(this.rows[i].getSelection());
            }
        }
        return rows;
    },
    getSelectedCols : function(){
        var cols = [];
        for (var i = 0; i < this.getColCount(); i ++){
            if (this.cols[i].hasSelection()){
                cols.push(this.cols[i].getSelection());
            }
        }
        return cols;
    },
    getSelectedRowValues : function(){
        return this.getSelectedRows().map(function(row){
            return row.getValues();
        });
    },
    getSelectedColValues : function(){
        return this.getSelectedCols().map(function(col){
            return col.getValues();
        });
    },
    hasSelection : function(){
        return this.getSelectedRows().length > 0;
    },
    insertRow : function(index, optValues){
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
            for (var i = 0; i < optValues.length; i ++){
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
    insertCol : function(index, optValues){
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

            for (var i = 0; i < optValues.length; i ++){
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
    removeRow : function(index){
        this.cols[0].removeCell(index);
    },
    removeCol : function(index){
        this.rows[0].removeCell(index);
    }
};

var editable = new EdiTable(document.getElementById("table"), {});
