const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

const { DEV, PROVIDER_TEST_URL, PROVIDER_MAIN_URL } = process.env;
const provider = new ethers.providers.JsonRpcProvider(
    DEV ? PROVIDER_TEST_URL : PROVIDER_MAIN_URL
);
// DEV=true node scripts/gas.js
// DEV=false node scripts/gas.js
console.log(process.env.DEV, "process.env.DEV");

const main = async () => {
    const gasPrice = await provider.getGasPrice();

    console.log(
        `Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`
    );

    const recommendedPrice = gasPrice.mul(10).div(9);
    console.log(
        `Recommended Price: ${ethers.utils.formatUnits(
            recommendedPrice,
            "gwei"
        )} gwei`
    );
};

process.on("uncaughtException", function (err) {
    console.log("UnCaught Exception 83: " + err);
    console.error(err.stack);
    fs.appendFile("./critical.txt", err.stack, function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
