var config = require("../polygon/polygon.json");
var tokens = require("../polygon/tokens.json");

var _ = require("lodash");
const fs = require("fs");

const sushiRouter = config.routers[0];
const uniRouter = config.routers[1];
const baseAssets = config.baseAssets;

// pair elements from tokens in arrays inside an array

function getPairs(array) {
    var i,
        result1 = [],
        result2 = [];

    for (i = 0; i < array.length; i++) {
        let baseAssetIndex = Math.floor(Math.random() * (3 - 0 + 1)) + 0;

        result1.push([
            i % 2 != 0 ? uniRouter.address : sushiRouter.address,
            i % 2 == 0 ? uniRouter.address : sushiRouter.address,
            baseAssets[baseAssetIndex].address, // ok
            array[i].address, // ok
        ]);

        // result2.push([
        //     i % 2 == 0 ? uniRouter.address : sushiRouter.address,
        //     i % 2 != 0 ? uniRouter.address : sushiRouter.address,
        //     baseAssets[baseAssetIndex].address, // ok
        //     array[i].address, // ok
        // ]);
    }
    return [...result1];
}

const res = getPairs(tokens);
console.log(res.length, "pairs");
// const uniq = _.uniqBy(res, JSON.stringify);
// console.log(uniq.length, "unique pairs");

fs.appendFile(`./data/uni_sushi_pairs.json`, JSON.stringify(res), function (err) {});
