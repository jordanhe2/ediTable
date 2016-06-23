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

            // ...
        },
        insert : function(optIndex, optValue){
            // Normalize parameters
            if (typeof optIndex == "undefined") optIndex = this.cells.length;
            if (typeof optValue == "undefined") optValue = "";

            // ...
        }
    }

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
        }
    };

    var Cell = function () {
        this.td;
    };
    Cell.prototype = {
        select : function(){

        }
    };

    this.rows = [];
    this.cols = [];
};
EdiTable.prototype = {
    select : function(/* parameters */){

    },
    insert : function(/* parameters */){

    }
};
