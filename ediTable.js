/**
 * <Class description here>
 *
 * @param{HTMLTable} -
 * @param{Object} -
 */
var EdiTable = function(table, options) {
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

    // Context variable
    var that = this;

    Cell = function (dom) {
        this.dom = dom;
        this.selected = false;
    };
    Cell.create = function(type, optInitValue){
        // Prevent injection
        if (!(type == "td" || type == "th")) throw new Error("Type must be either td or th");

        // Create element
        var element = document.createElement(type);
        $(element).text(optInitValue || "");

        // Construct new cell
        return new Cell(element);
    }
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
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.getCellCount() - 1;

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
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.getCellCount() - 1;

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
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.getCellCount() - 1;

            // Loop this.cells and deselect
            for (var i = 0; i < this.getCellCount(); i++) {
                if (i >= optStart && i <= optEnd){
                    this.cells[i].deselect();
                }
            }
        },
        clear : function(optStart, optEnd){
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.getCellCount() - 1;

            for (var i = optStart; i <= optEnd; i ++){
                this.cells[i].clear();
            }
        },
        getValues : function(optStart, optEnd){
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.getCellCount() - 1;

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
            if (typeof optValue == "undefined") optValue = "";

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
            // TODO
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
    this.rows = [];
    this.cols = [];

    normalizeTable(this.table);

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
    setEditable : function(edit, rowStart, rowEnd, colStart, colEnd){
        // Normalize parameters
        if (typeof rowStart == "undefined") rowStart = 0;
        if (typeof rowEnd == "undefined") rowEnd = this.getRowCount() - 1;
        if (typeof colStart == "undefined") colStart = 0;
        if (typeof colEnd == "undefined") colEnd = this.getColCount() - 1;

        // Set editable
        for (var i = rowStart; i <= rowEnd; i ++){
            this.rows[i].setEditable(edit, colStart, colEnd);
        }
    },
    isEditable : function(){
        for (var i = 0; i < this.getRowCount(); i ++){
            if (!this.rows[i].isEditable()) return false;
        }
        return true;
    },
    select : function(rowStart, rowEnd, colStart, colEnd){
        // Normalize parameters
        if (typeof rowStart == "undefined") rowStart = 0;
        if (typeof rowEnd == "undefined") rowEnd = this.getRowCount() - 1;
        if (typeof colStart == "undefined") colStart = 0;
        if (typeof colEnd == "undefined") colEnd = this.getColCount() - 1;

        // Do selection
        for (var i = 0; i < this.getRowCount(); i ++){
            if (i >= rowStart && i <= rowEnd){
                this.rows[i].select(colStart, colEnd);
            } else {
                this.rows[i].deselect();
            }
        }
    },
    deselect : function(rowStart, rowEnd, colStart, colEnd){
        // Normalize parameters
        if (typeof rowStart == "undefined") rowStart = 0;
        if (typeof rowEnd == "undefined") rowEnd = this.getRowCount() - 1;
        if (typeof colStart == "undefined") colStart = 0;
        if (typeof colEnd == "undefined") colEnd = this.getColCount() - 1;

        // Do deselection
        for (var i = rowStart; i <= rowEnd; i ++){
            if (i >= rowStart && i <= rowEnd){
                this.rows[i].deselect(colStart, colEnd);
            }
        }
    },
    clear : function(rowStart, rowEnd, colStart, colEnd){
        // Normalize parameters
        if (typeof rowStart == "undefined") rowStart = 0;
        if (typeof rowEnd == "undefined") rowEnd = this.getRowCount() - 1;
        if (typeof colStart == "undefined") colStart = 0;
        if (typeof colEnd == "undefined") colEnd = this.getColCount() - 1;

        // Clear
        for (var i = rowStart; i <= rowEnd; i ++){
            this.rows[i].clear(colStart, colEnd);
        }
    },
    getRowValues : function(rowStart, rowEnd, colStart, colEnd){
        // Normalize parameters
        if (typeof rowStart == "undefined") rowStart = 0;
        if (typeof rowEnd == "undefined") rowEnd = this.getRowCount() - 1;
        if (typeof colStart == "undefined") colStart = 0;
        if (typeof colEnd == "undefined") colEnd = this.getColCount() - 1;

        // Get values
        var rows = [];
        for (var i = rowStart; i <= rowEnd; i ++){
            rows.push(this.rows[i].getValues(colStart, colEnd));
        }

        return rows;
    },
    getColValues : function(rowStart, rowEnd, colStart, colEnd){
        // Normalize parameters
        if (typeof rowStart == "undefined") rowStart = 0;
        if (typeof rowEnd == "undefined") rowEnd = this.getRowCount() - 1;
        if (typeof colStart == "undefined") colStart = 0;
        if (typeof colEnd == "undefined") colEnd = this.getColCount() - 1;

        // Get values
        var cols = [];
        for (var i = colStart; i <= colEnd; i ++){
            cols.push(this.cols[i].getValues(rowStart, rowEnd));
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
    /*initSingleCell : function(optValue) {
        var row = new Vector([], "row");

        // TODO make remove
        this.rows.push(row);
        row.insertCell(0, optValue);
    },*/
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
            // TODO: handle case where there is nothing
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
            // TODO: handle case where there is nothing
        }
    }
};


var editable = new EdiTable(document.getElementById("table"), {});
