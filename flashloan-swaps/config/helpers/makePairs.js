var config = require("../polygon/polygon.json");
var tokens = require("../polygon/tokens.json");

var _ = require("lodash");
const fs = require("fs");

const sushiRouter = config.routers[0];
const uniRouter = config.routers[1];
// const pancakeRouter = config.routers[2];
const baseAssets = config.baseAssets;

function getPairs(array) {
    var i,
        j,
        result = [];

    for (i = 0; i < array.length; i++) {
        for (j = i; j < array.length; j++) {
            result.push([
                j % 2 != 0 ? uniRouter.address : sushiRouter.address,
                j % 2 == 0 ? uniRouter.address : sushiRouter.address,
                baseAssets[Math.floor(Math.random() * (3 - 0 + 1)) + 0].address,
                array[j].address,
            ]);
        }
    }
    return result;
}

const res = getPairs(tokens);
console.log(res.length, "pairs");
const uniq = _.uniqBy(res, JSON.stringify);
console.log(uniq.length, "unique pairs");
fs.appendFile(`./data/pairs.json`, JSON.stringify(uniq), function (err) {});
