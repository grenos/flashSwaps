var routes = require("../polygon/routes.json");
var badRoutes = require("../../data/badRoutes.json");

var _ = require("lodash");
const fs = require("fs");

const remove = () => {
    let allRoutes = [];
    allRoutes.push(...routes);
    allRoutes.push(...badRoutes);
    const uniq = _.uniqBy(allRoutes, JSON.stringify);
    console.log("ad Routes", uniq.length);
    return uniq;
};

fs.appendFile(`./data/routes.json`, JSON.stringify(uniq), function (err) {});
