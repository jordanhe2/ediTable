/**
 * <Class description here>
 *
 * @param{HTMLTable} -
 * @param{Object} -
 */
var EdiTable = function (table, options) {
    function nodeListToArray(nl){
        return Array.prototype.slice.call(nl);
    }

    var Cell = function (td) {
        this.td = td;
        this.selected = false;
    };
    Cell.prototype = {
        setEditable : function(editable){
            this.td.contentEditable = editable;
        },
        isEditable : function(){
            return this.td.contenteditable;
        },
        select : function(){
            this.selected = true;
            $(this.td).addClass("ediTable-cell-selected");
        },
        deselect : function(){
            this.selected = false;
            $(this.td).removeClass("ediTable-cell-selected");
        },
        getValue : function(){
            return this.td.innerText;
        }
    };

    var Vector = function (cells) {
        this.cells = cells;
    };
    Vector.prototype = {
        select : function(optStart, optEnd){
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.cells.length - 1;

            // Loop this.cells and select/deselect
            for (var i = 0; i < this.cells.length; i++) {
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
            if (typeof optEnd == "undefined") optEnd = this.cells.length - 1;

            // Loop this.cells and deselect
            for (var i = 0; i < this.cells.length; i++) {
                if (i >= optStart && i <= optEnd){
                    this.cells[i].deselect();
                }
            }
        },
        getValues : function(optStart, optEnd){
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.cells.length - 1;

            // Loop this.cells and return values in an array
            var values = [];
            for (var i = 0; i < this.cells.length; i++) {
                if (i >= optStart && i <= optEnd){
                    values.push(this.cells[i].getValue());
                }
            }

            return values;
        },
        getSelectedCells : function(){
            return this.cells.filter(function(cell){
                return cell.selected;
            });
        },
        getSelectedValues : function(){
            return this.getSelection().map(function(cell){
                return cell.getValue();
            });
        }
        /*insert : function(index, optValues){
            // Normalize parameters
            if (typeof optValues == "undefined") optValues = [];
            if (!(optValues instanceof Array)) optValues = [optValues];

            // Insert optValues into this.cells
            var args = [index, 0].concat(optValues);
            Array.prototype.splice.apply(this.cells, args);
        },
        remove : function(optStart, optEnd) {
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.cells.length - 1;

            // ...
        }*/
    };

    var Selection = function(rowStart, rowEnd, colStart, colEnd){
        this.rowStart = rowStart;
        this.rowEnd = rowEnd;
        this.colStart = colStart;
        this.colEnd = colEnd;
    };
    Selection.prototype = {

    };

    // Acutal EdiTable properties and init begin here
    this.table = table;
    this.rows = [];
    this.cols = [];

    // Setup rows
    this.rows = $("tr", this.table).map(function(index, tr){
        var cells = $("td, th", tr).toArray().map(function(td){
            return new Cell(td);
        });
        return new Vector(cells);
    }).toArray();

    // Setup cols
    if (this.rows.length > 0) {
        for (var i = 0; i < this.rows[0].cells.length; i ++){
            var cells = [];
            for (var j = 0; j < this.rows.length; j ++){
                cells.push(this.rows[j].cells[i]);
            }
            this.cols.push(new Vector(cells));
        }
    }


    function copyTest(event) {
        console.log(event, event.clipboardData);

        event.clipboardData.setData("text/plain", "oiewfj");

        event.preventDefault();
    }
    function cutTest(event){
        // TODO
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

                    data[i][j] = cell.textContent;
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
    select : function(rowStart, rowEnd, colStart, colEnd){
        // TODO
    },
    insert : function(/* parameters */){
        // TODO
    }
};


var editable = new EdiTable(document.getElementById("table"), {});
