/**
 * <Class description here>
 *
 * @param{HTMLTable} -
 * @param{Object} -
 */
var EdiTable = function (table, options) {
    var Vector = function (optCells) {
        this.cells = optCells || [];
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
        insert : function(optIndex, optValue){
            // Normalize parameters
            if (typeof optIndex == "undefined") optIndex = this.cells.length;
            if (typeof optValue == "undefined") optValue = "";

            // Insert optValue into this.cells
            this.cells.splice(optIndex, 0, optValue);
        },
        remove : function() {
            // ...
        }
    };

    var Cell = function () {
        this.td;
        this.selected = false;
    };
    Cell.prototype = {
        isEditable : function(){
            return this.td.contenteditable;
        },
        select : function(){
            // TODO
        },
        deselect : function(){
            // TODO
        }
    };

    var Selection = function(rowStart, rowEnd, colStart, colEnd){
        this.rowStart = rowStart;
        this.rowEnd = rowEnd;
        this.colStart = colStart;
        this.colEnd = colEnd;
    };
    Selection.prototype = {

    };

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
