const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

const { MNEMONIC, INFURA_KEY } = process.env;
const contract = require("../build/contracts/FlashLoan.json");
const interface = require("../build/contracts/IERC20.json");
const provider = new ethers.providers.JsonRpcProvider(
    `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`
);
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

            console.log(_interface.address);

            const balance = await _interface.balanceOf(wallet.address);
            console.log(`${asset.sym} Owner Balance: `, balance.toString());

            const arbBalance = await _contract.getTokenBalance(asset.address);
            console.log(`${asset.sym} Arb Balance: `, arbBalance.toString());
        }
    } catch (error) {
        console.log(`Error: getting ${asset.sym} balances : ${error}`);
    }
};

process.on("uncaughtException", function (err) {
    console.log("UnCaught Exception 83: " + err);
    console.error(err.stack);
    fs.appendFile("./critical.txt", err.stack, function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

main().then(() => process.exit(0));
