var buildify = require("buildify");

buildify()
    .load("src/editable.js")
    .uglify()
    .save("dist/editable.min.js")
