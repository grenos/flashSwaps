const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

const contract = require("../build/contracts/FlashLoan.json");
const config = require("../config/polygon/polygon.json");

const { PROVIDER_MAIN_URL, MNEMONIC } = process.env;
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_MAIN_URL);

let _wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
let wallet = _wallet.connect(provider);

const main = async () => {
    const _contract = new ethers.Contract(
        config.arbContract,
        contract.abi,
        wallet
    );

    for (let i = 0; i < config.baseAssets.length; i++) {
        const asset = config.baseAssets[i];

        try {
            let balance = await _contract.getTokenBalance(asset.address);
            console.log(`${asset.sym} Start Balance: `, balance.toString());

            await _contract.recoverTokens(
                ethers.utils.getAddress(asset.address)
            );

            balance = await _contract.recoverTokens(
                ethers.utils.getAddress(asset.address)
            );
        } catch (error) {
            console.log(`Error: getting ${asset.sym} balances : ${error}`);
        }

        await new Promise((r) => setTimeout(r, 2000));
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
