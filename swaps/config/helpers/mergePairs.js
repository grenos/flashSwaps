// const pairs1 = require("../../data/pairs1.json");
// const pairs2 = require("../../data/pairs2.json");
// const pairs3 = require("../../data/pairs3.json");
// const pairs4 = require("../../data/pairs4.json");

// var _ = require("lodash");
// const fs = require("fs");

// function mergePairs(pairs1, pairs2, pairs3, pairs4) {
//     let allArray = [...pairs1, ...pairs2, ...pairs3, ...pairs4];
//     console.log(allArray.length, "all pairs");

//     const uniq = _.uniqBy(allArray, JSON.stringify);
//     return uniq;
// }

// const res = mergePairs(pairs1, pairs2, pairs3, pairs4);
// console.log(res.length, "new pairs");

// fs.appendFile(`./data/Pairs.json`, JSON.stringify(res), function (err) {});

const bad = require("../../data/badRoutes.json");
const good = require("../../data/oldGood.json");

var _ = require("lodash");
const fs = require("fs");

console.log(bad.length, "bad");
console.log(good.length, "good");

function mergePairs(bad, good) {
    let myArr = [...bad, ...good];
    let newArr = [...myArr];
    let h, i, j;

    for (h = 0; h < myArr.length; h++) {
        var curItem = myArr[h];
        var foundCount = 0;
        // search array for item
        for (i = 0; i < myArr.length; i++) {
            if (_.isEqual(myArr[i], myArr[h])) foundCount++;
        }

        if (foundCount > 1) {
            // remove repeated item from new array
            for (j = 0; j < newArr.length; j++) {
                if (_.isEqual(newArr[j], curItem)) {
                    newArr.splice(j, 1);
                    j--;
                }
            }
        }
    }

    return newArr;
}

const res = mergePairs(bad, good);
console.log(res.length, "new pairs");

const uniq = _.uniqBy(res, JSON.stringify);
console.log(uniq.length, "unique pairs");

fs.appendFile(`./data/newGood.json`, JSON.stringify(uniq), function (err) {});
