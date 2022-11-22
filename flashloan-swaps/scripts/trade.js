const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

const { PROVIDER_MAIN_URL, MNEMONIC, PROVIDER_TEST_URL } = process.env;
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_TEST_URL);

const contract = require("../build/contracts/FlashLoan.json");
const interface = require("../build/contracts/IERC20.json");
const config = require("../config/polygon/polygon.json");
const routes = require("./../config/polygon/routes.json");
const tokens = require("./../config/polygon/tokens.json");

const _wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
const wallet = _wallet.connect(provider);
const _contract = new ethers.Contract(config.arbContract, contract.abi, wallet);

let balances = {};
const inTrade = false;

const main = async () => {
    await setup();
    // Scale when using own node
    //[0,0,0,0,0,0,0,0,0].forEach(async (v,i) => {
    //  await new Promise(r => setTimeout(r, i*1000));
    // await lookForDualTrade();
    //});
    await lookForDualTrade();
};

// const searchForRoutes = () => {
//     const targetRoute = {};
//     targetRoute.router1 =
//         config.routers[
//             Math.floor(Math.random() * config.routers.length)
//         ].address;
//     targetRoute.router2 =
//         config.routers[
//             Math.floor(Math.random() * config.routers.length)
//         ].address;
//     targetRoute.token1 =
//         config.baseAssets[
//             Math.floor(Math.random() * config.baseAssets.length)
//         ].address;
//     targetRoute.token2 =
//         tokens[Math.floor(Math.random() * tokens.length)].address;
//     return targetRoute;
// };

let goodCount = 0;
const useGoodRoutes = () => {
    const targetRoute = {};
    if (goodCount >= routes.length) goodCount = 0;

    const route = routes[goodCount];

    targetRoute.router1 = route[0];
    targetRoute.router2 = route[1];
    targetRoute.token1 = route[2];
    targetRoute.token2 = route[3];

    goodCount += 1;

    return targetRoute;
};

//? [START] - LOOK FOR DUAL TRADE

const lookForDualTrade = async () => {
    let targetRoute = useGoodRoutes();

    try {
        let tradeSize = balances[targetRoute.token1].balance;
        let _tradeSize = ethers.BigNumber.from(tradeSize);

        let loanEstimae = ethers.BigNumber.from(
            balances[targetRoute.token1].sym === "weth"
                ? ethers.utils.parseUnits("100", "ether")
                : ethers.utils.parseUnits("1000", "ether")
        );
        const totalAmouont = _tradeSize.add(loanEstimae);

        // --------------------------------------------

        const amtBack = await _contract.estimateDualDexTrade(
            targetRoute.router1,
            targetRoute.router2,
            targetRoute.token1,
            targetRoute.token2,
            totalAmouont
        );

        console.log("--------- TEST ------------");
        console.log("Trade NOT profitable");
        console.log("Router 1: ", targetRoute.router1);
        console.log("Router 2: ", targetRoute.router2);
        console.log("Token 1: ", targetRoute.token1);
        console.log("Token 2: ", targetRoute.token2);
        console.log("amtBack: ", amtBack.toString());
        console.log("---------------------");

        // --------------------------------------------
        // calculate 0.09% aave fee
        // calculate 0.3% sushiswap fee
        // calculate 0.3% quickswap fee
        // 0.03 matic per swap ?
        // slippage tolerance 0.5% ?

        const multiplier = ethers.BigNumber.from(
            config.minBasisPointsPerTrade + 10000
        );
        const sizeMultiplied = totalAmouont.mul(multiplier);
        const divider = ethers.BigNumber.from(10000);
        const profitTarget = sizeMultiplied.div(divider);

        // --------------------------------------------

        // if (!routes.length > 0) {
        //     fs.appendFile(
        //         `./data/${network}RouteLog.txt`,
        //         `["${targetRoute.router1}","${targetRoute.router2}","${targetRoute.token1}","${targetRoute.token2}"],` +
        //             "\n",
        //         function (err) {}
        //     );
        // }

        if (amtBack.gt(profitTarget)) {
            await dualTrade(
                targetRoute.token1,
                tradeSize,
                [targetRoute.router1, targetRoute.router2],
                [targetRoute.token1, targetRoute.token2]
            );

            console.log("--------- PROFIT -----------");
            console.log("Trade found!");
            console.log("Router 1: ", targetRoute.router1);
            console.log("Router 2: ", targetRoute.router2);
            console.log("Token 1: ", targetRoute.token1);
            console.log("Token 2: ", targetRoute.token2);
            console.log("amtBack: ", amtBack.toString());
            console.log("Profit Target: ", profitTarget.toString());
            console.log("---------------------");
        } else {
            await lookForDualTrade();
        }
    } catch (e) {
        console.log("-------- ERROR -------------");
        console.log("Trade NOT possible");
        console.log("Router 1: ", targetRoute.router1);
        console.log("Router 2: ", targetRoute.router2);
        console.log("Token 1: ", targetRoute.token1);
        console.log("Token 2: ", targetRoute.token2);
        console.log("---------------------");
        await lookForDualTrade();
    }
};

//? [END] - LOOK FOR DUAL TRADE

//! [START] - DUAL TRADE
const dualTrade = async (loanAsset, amount, routers, route) => {
    if (inTrade === true) {
        await lookForDualTrade();
        return false;
    }
    try {
        inTrade = true;
        console.log("> Making dualTrade...");

        //{ gasPrice: 1000000000003, gasLimit: 500000 } ????? WHY
        const tx = await _contract.requestFlashLoan(
            loanAsset,
            amount,
            routers,
            route
        );
        await tx.wait();
        inTrade = false;

        await lookForDualTrade();
    } catch (e) {
        console.log(e);
        inTrade = false;
        await lookForDualTrade();
    }
};
//! [END] - DUAL TRADE

// ~ [START] - SETUP BALANCE LISTENER
const setup = async () => {
    let asset;

    try {
        for (let i = 0; i < config.baseAssets.length; i++) {
            asset = config.baseAssets[i];

            // WETH9 === interface of wrapped ether
            const _interface = new ethers.Contract(
                asset.address,
                interface.abi,
                wallet
            );

            // check how much balance of each token is in the arb contract
            const balance = await _interface.balanceOf(config.arbContract);
            console.log(asset.sym, balance.toString());

            balances[asset.address] = {
                sym: asset.sym,
                balance,
                startBalance: balance,
            };
        }
    } catch (error) {
        console.log("setup error for asset : " + asset.sym + "- - ->", error);
    }

    // setTimeout(() => {
    //     setInterval(() => {
    //         logResults();
    //     }, 6000);
    //     logResults();
    // }, 12000);
};

const logResults = async () => {
    console.log(`############# LOGS #############`);

    for (let i = 0; i < config.baseAssets.length; i++) {
        const asset = config.baseAssets[i];
        const _interface = new ethers.Contract(
            asset.address,
            interface.abi,
            wallet
        );

        balances[asset.address].balance = await _interface.balanceOf(
            config.arbContract
        );

        const diff = balances[asset.address].balance.sub(
            balances[asset.address].startBalance
        );

        const basisPoints = diff
            .mul(10000)
            .div(balances[asset.address].startBalance);

        console.log(`# ${asset.sym}: ${basisPoints.toString()}bps`);
    }
};
// ~ [END] - SETUP BALANCE LISTENER
//

//

//
process.on("uncaughtException", function (err) {
    console.log("UnCaught Exception 83: " + err);
    console.error(err.stack);
    fs.appendFile("./critical.txt", err.stack, function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

main().then(() => process.exit(0));
