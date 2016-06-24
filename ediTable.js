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
        isEditable : function(){
            return this.td.contenteditable;
        },
        select : function(){
            this.selected = true;
        },
        deselect : function(){
            this.selected = false;
        },
        getValue : function(){
            return this.td.innerText;
        }
    };

    var Vector = function (tr) {
        this.cells = nodeListToArray(tr.childNodes);
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
        getSelection : function(){
            return this.cells.filter(function(cell){
                return cell.selected;
            });
        },
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

        var docFrag = document.createElement("template");
        var htmlText = event.clipboardData.getData("text/html");

        console.log(htmlText);
        docFrag.innerHTML = htmlText;
        console.log(docFrag, docFrag.innerHTML);


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
