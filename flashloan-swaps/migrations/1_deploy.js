const flashloan = artifacts.require("flashloan");

const PoolAddressesProvider_polygon =
    "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb";

const PoolAddressesProvider_matic =
    "0x5343b5bA672Ae99d627A1C87866b8E53F47Db2E6";

0x5343b5ba672ae99d627a1c87866b8e53f47db2e6;
module.exports = function (deployer) {
    deployer.deploy(flashloan, PoolAddressesProvider_matic);
};
