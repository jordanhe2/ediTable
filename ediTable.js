/**
 * <Class description here>
 *
 * @param{HTMLTable} -
 * @param{Object} -
 */
var EdiTable = function (table, options) {
    var Row = function () {
        this.cells = [];
    };
    Row.prototype = {
        select : function(optStart, optEnd){
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.cells.length - 1;

            // Loop this.cells and select/deselect
            for (var i = 0; i < this.cells.length; i++) {
                if (i >= optStart && i <= optEnd){
                    this.cells[i].select();
                } else {
                    // deselect
                }
            }
        },
        insert : function(optIndex, optValue){
            // Normalize parameters
            if (typeof optIndex == "undefined") optIndex = this.cells.length;
            if (typeof optValue == "undefined") optValue = "";

            // ...
        },
        remove : function() {
            // ...
        }
    };

    var Column = function () {
        this.cells = [];
    };
    Column.prototype = {
        select : function(optStart, optEnd){
            // Normalize parameters
            if (typeof optStart == "undefined") optStart = 0;
            if (typeof optEnd == "undefined") optEnd = this.cells.length - 1;

            // ...
        },
        insert : function(optIndex, optValue){
            // Normalize parameters
            if (typeof optIndex == "undefined") optIndex = this.cells.length;
            if (typeof optValue == "undefined") optValue = "";

            // ...
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

        }
    };

    var Selection = function(rowFrom, rowTo, colFrom, colTo){
        this.rowFrom = rowFrom;
        this.rowTo = rowTo;
        this.colFrom = colFrom;
        this.colTo = colTo;
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
    select : function(/* parameters */){

    },
    insert : function(/* parameters */){

    }
};