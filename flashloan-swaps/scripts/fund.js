const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

const { DEV, PROVIDER_TEST_URL, PROVIDER_MAIN_URL, MNEMONIC } = process.env;
const provider = new ethers.providers.JsonRpcProvider(
    DEV ? PROVIDER_TEST_URL : PROVIDER_MAIN_URL
);

const contract = require("../build/contracts/FlashLoan.json");
const interface = require("../build/contracts/IERC20.json");

let _wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
let wallet = _wallet.connect(provider);
const config = require("../config/polygon/polygon.json");

const main = async () => {
    const _contract = new ethers.Contract(
        config.arbContract,
        contract.abi,
        wallet
    );

    let asset;

    try {
        for (let i = 0; i < config.baseAssets.length; i++) {
            asset = config.baseAssets[i];
            const _interface = new ethers.Contract(
                asset.address,
                interface.abi,
                wallet
            );

            const ownerBalance = await _interface.balanceOf(wallet.address);

            console.log(
                `${asset.sym} Owner Balance: `,
                ownerBalance.toString()
            );

            const arbBalance = await _contract.getTokenBalance(asset.address);
            console.log(
                `${asset.sym} Original Arb Balance: `,
                arbBalance.toString()
            );

            await _interface
                .connect(wallet)
                .transfer(config.arbContract, ownerBalance);

            const postFundBalance = await _contract.getTokenBalance(
                asset.address
            );
            console.log(
                `${asset.sym} New Arb Balance: `,
                postFundBalance.toString()
            );
        }
    } catch (error) {}

    console.log(
        "Note it might take a while for the funds to show up, try balances.js in a few mins"
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
