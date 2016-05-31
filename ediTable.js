/**
 * Created by Jordan on 5/30/2016.
 */
var EdiTable = function (options) {
    this.table = document.createElement("table");

    var tHead, tBody;

    tHead = this.table.createTHead();

    for (var i = 0; options.numRows && i < options.numRows; i++) {
        var row = this.table.insertRow(-1);

        for (var j = 0; options.numCols && j < options.numCols; j++) {
            var col = row.insertCell(-1);

            col.contentEditable = true;

            col.onselect = function (e) {
                console.log("Row " + (i + 1) + " Column " + (j + 1) + " selected");
            }
        }
    }
};

window.onselect = function (e) {
    console.log(e);
}

var proto = EdiTable.prototype;

var Stack = function () {
    this._data = [];
};
Stack.prototype.peek = function () {
    var len = this._data.length;

    return len > 0 ? this._data[len - 1] : null;
};
Stack.prototype.pop = function () {
    return this._data.pop();
};
Stack.prototype.push = function (element) {
    return this._data.push(element);
};


//TESTING
var options = {
    numRows: 2,
    numCols: 2
};

var testTable = new EdiTable(options);

document.body.appendChild(testTable.table);