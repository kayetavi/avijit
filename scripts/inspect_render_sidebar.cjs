const fs = require("fs");
const logicJs = fs.readFileSync("js/logic.js", "utf8");
const lines = logicJs.split("\n");
console.log(lines.slice(880, 1050).join("\n"));
