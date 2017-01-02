var buildify = require("buildify");

// Build minified version of editable.js
buildify()
    .load("src/editable.js")
    .uglify()
    .save("dist/editable.min.js")
