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
        add : function(optValues){
            // Normalize parameters
            if (typeof optValues == "undefined") optValues = [""];
            if (!(optValues instanceof Array)) optValues = [optValues];

            // Add optValues to this.cells
            this.cells = this.cells.concat(optValues);
        },
        insert : function(index, optValues){
            // Normalize parameters
            if (typeof optValues == "undefined") optValues = [""];
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

        var htmlText = event.clipboardData.getData("text/html");

        //DOMImplementation.createHTMLDocument is widely supported by browsers but I'm unsure how exploitable it is.
        var writtenDoc = document.implementation.createHTMLDocument("");

        writtenDoc.write(htmlText);
        //DOMParser is more secure, but less widely supported.
        var parser = new DOMParser();
        var parsedDoc = parser.parseFromString(htmlText, "text/html");

        console.log("Using DOMImplementation.createHTMLDocument\n", writtenDoc, "\nUsing DOMParser\n", parsedDoc);

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

function HTMLParser(htmlString) {
    var html = document.implementation.createDocument("http://www.w3.org/1999/xhtml", "html", null),
        body = document.createElementNS("http://www.w3.org/1999/xhtml", "body");
    html.documentElement.appendChild(body);

    body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
        .getService(Components.interfaces.nsIScriptableUnescapeHTML)
        .parseFragment(htmlString, false, null, body));

    return body;
}