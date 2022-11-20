const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

const { DEV, PROVIDER_TEST_URL, PROVIDER_MAIN_URL, MNEMONIC } = process.env;
const provider = new ethers.providers.JsonRpcProvider(
    DEV ? PROVIDER_TEST_URL : PROVIDER_MAIN_URL
);

const contract = require("../build/contracts/FlashLoan.json");
const interface = require("../build/contracts/IERC20.json");
const config = require("../config/polygon/polygon.json");
routes = require("./../config/polygon/routes.json");
tokens = require("./../config/polygon/tokens.json");

let _wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
let wallet = _wallet.connect(provider);
let balances = {};

const main = async () => {
    await setup();
    // Scale when using own node
    //[0,0,0,0,0,0,0,0,0].forEach(async (v,i) => {
    //  await new Promise(r => setTimeout(r, i*1000));
    //  await lookForDualTrade();
    //});

    await lookForDualTrade();
};

const searchForRoutes = () => {
    const targetRoute = {};
    targetRoute.router1 =
        config.routers[
            Math.floor(Math.random() * config.routers.length)
        ].address;
    targetRoute.router2 =
        config.routers[
            Math.floor(Math.random() * config.routers.length)
        ].address;
    targetRoute.token1 =
        config.baseAssets[
            Math.floor(Math.random() * config.baseAssets.length)
        ].address;
    targetRoute.token2 =
        tokens[Math.floor(Math.random() * tokens.length)].address;
    return targetRoute;
};

let goodCount = 0;
const useGoodRoutes = () => {
    const targetRoute = {};
    const route = routes[goodCount];
    goodCount += 1;
    if (goodCount >= routes.length) goodCount = 0;

    targetRoute.router1 = route[0];
    targetRoute.router2 = route[1];
    targetRoute.token1 = route[2];
    targetRoute.token2 = route[3];

    return targetRoute;
};

const lookForDualTrade = async () => {
    let targetRoute;
    /*
       Type onfig.routes = Array<address[]>
       Routes are arrays of addresses of diferent routers and tokens
    */
    // if (config.routes.length > 0) {
    targetRoute = useGoodRoutes();
    // } else {
    //     targetRoute = searchForRoutes();
    // }

    try {
        // let tradeSize = balances[targetRoute.token1].balance;
        let tradeSize = ethers.BigNumber.from("100");

        /*
            -- GAS PRICE --
            If a transaction attempts to use more than this limit, then the transaction will revert and still consume and pay 
            for the full gas limit. Total fees paid by the user can be calculated as (gas consumed) * (gas price), 
            and is known as gas fees. Similarly, maximum gas fees can be calculated as (gas limit) * (gas price).
        */

        const amtBack = await arb.estimateDualDexTrade(
            targetRoute.router1,
            targetRoute.router2,
            targetRoute.token1,
            targetRoute.token2,
            tradeSize
        );

        // console.log("---------------------");
        // console.log("Router 1: ", targetRoute.router1);
        // console.log("Router 2: ", targetRoute.router2);
        // console.log("Token 1: ", targetRoute.token1);
        // console.log("Token 2: ", targetRoute.token2);
        // console.log("amtBack: ", amtBack.toString());
        // console.log("Profit Target: ", profitTarget.toString());

        /*
            One basis point is equal to 1/100th of 1%, or 0.01%. 
            In decimal form, one basis point appears as 0.0001 (0.01/100). 
            Basis points (BPS) are used to show the change in the value or rate of a financial instrument, 
            such as 1% change equals a change of 100 basis points and 0.01% change equals one basis point.
        */

        // ~ EXAMPLE BASIS POINTS

        /*
            1. "Using 1 as initial basis points and 300 as initial trade asset we will make trades that return more than 300.03"
            2. "Using 10 as initial basis points and 300 as initial trade asset we will make trades that return more than 300.3"
            3. "Using 100 as initial basis points and 300 as initial trade asset we will make trades that return more than 303"
        */
        const multiplier = ethers.BigNumber.from(
            config.minBasisPointsPerTrade + 10000
        );
        const sizeMultiplied = tradeSize.mul(multiplier);
        const divider = ethers.BigNumber.from(10000);
        const profitTarget = sizeMultiplied.div(divider);

        if (!routes.length > 0) {
            fs.appendFile(
                `./data/${network}RouteLog.txt`,
                `["${targetRoute.router1}","${targetRoute.router2}","${targetRoute.token1}","${targetRoute.token2}"],` +
                    "\n",
                function (err) {}
            );
        }

        if (amtBack.gt(profitTarget)) {
            // await dualTrade(
            //     targetRoute.router1,
            //     targetRoute.router2,
            //     targetRoute.token1,
            //     targetRoute.token2,
            //     tradeSize
            // );

            console.log("---------------------");
            console.log("Trade found!");
            console.log("Router 1: ", targetRoute.router1);
            console.log("Router 2: ", targetRoute.router2);
            console.log("Token 1: ", targetRoute.token1);
            console.log("Token 2: ", targetRoute.token2);
            console.log("amtBack: ", amtBack.toString());
            console.log("Profit Target: ", profitTarget.toString());
        } else {
            await lookForDualTrade();
        }
    } catch (e) {
        // console.log(e);
        await lookForDualTrade();
    }
};

const dualTrade = async (router1, router2, baseToken, token2, amount) => {
    if (inTrade === true) {
        await lookForDualTrade();
        return false;
    }
    try {
        inTrade = true;
        console.log("> Making dualTrade...");
        const tx = await arb
            .connect(owner)
            .dualDexTrade(router1, router2, baseToken, token2, amount); //{ gasPrice: 1000000000003, gasLimit: 500000 }
        await tx.wait();
        inTrade = false;
        await lookForDualTrade();
    } catch (e) {
        console.log(e);
        inTrade = false;
        await lookForDualTrade();
    }
};

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
            console.log(asset.sym, balance?.toString());

            balances[asset.address] = {
                sym: asset.sym,
                balance,
                startBalance: balance,
            };
        }
    } catch (error) {
        console.log("setup error for asset : " + asset.sym + "- - ->", error);
    }

    setTimeout(() => {
        setInterval(() => {
            logResults();
        }, 6000);
        logResults();
    }, 12000);
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

process.on("uncaughtException", function (err) {
    console.log("UnCaught Exception 83: " + err);
    console.error(err.stack);
    fs.appendFile("./critical.txt", err.stack, function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

main().then(() => process.exit(0));
