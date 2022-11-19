const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();
const { ethers } = require("ethers");

let config, arb, owner, inTrade, balances, routes, tokens;
const network = hre.network.name;
config = require("./../config/polygon/polygon.json");
routes = require("./../config/polygon/routes.json");
tokens = require("./../config/polygon/tokens.json");
const contract = require("./../artifacts/contracts/Arb.sol/Arb.json");
const provider = new ethers.providers.JsonRpcProvider(process.env.GOERLI_URL);

let _wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC);
let wallet = _wallet.connect(provider);

// if (network === "aurora") config = require("./../config/aurora.json");
// if (network === "fantom") config = require("./../config/fantom.json");

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

const setup = async () => {
    // Create Contract object and pass Arb Abi

    const IArb = new ethers.Contract(config.arbContract, contract.abi, wallet);
    arb = IArb.attach(config.arbContract);

    // balances = {};
    /*
    "baseAssets": [
      { "sym": "weth","address": "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB" },
      { "sym": "wnear", "address": "0xC42C30aC6Cc15faC9bD938618BcaA1a1FaE8501d" },
      { "sym": "usdt", "address": "0x4988a896b1227218e4A686fdE5EabdcAbd91571f" },
      { "sym": "aurora", "address": "0x8BEc47865aDe3B172A928df8f990Bc7f2A3b9f79" },
      { "sym": "atust", "address": "0x5ce9F0B6AFb36135b5ddBF11705cEB65E634A9dC" },
      { "sym": "usdc", "address": "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802" }
    ],
  */
    // for (let i = 0; i < config.baseAssets.length; i++) {
    // const asset = config.baseAssets[i];

    // WETH9 === interface of wrapped ether
    // const interface = await ethers.getContractFactory("WETH9");
    // const assetToken = await interface.attach(asset.address);
    // check how much balance of each token is in the arb contract
    // const balance = await assetToken.balanceOf(config.arbContract);
    // console.log(asset.sym, balance.toString());

    // balances[asset.address] = {
    //     sym: asset.sym,
    //     balance,
    //     startBalance: balance,
    // };
    // }

    // waits 2 minutes to call the logger the first time
    // setTimeout(() => {
    // then calls the logger every 1 minute indefinitely
    // setInterval(() => {
    // logResults();
    // }, 600000);
    // logResults();
    // }, 120000);
};

// const logResults = async () => {
//     console.log(`############# LOGS #############`);
//     for (let i = 0; i < config.baseAssets.length; i++) {
//         // Check for balances of each token in Arb Contract
//         const asset = config.baseAssets[i];
//         const interface = await ethers.getContractFactory("WETH9");
//         const assetToken = await interface.attach(asset.address);
//         // set new balances for each token
//         balances[asset.address].balance = await assetToken.balanceOf(
//             config.arbContract
//         );
//         // find difference between start balance and current balance
//         const diff = balances[asset.address].balance.sub(
//             balances[asset.address].startBalance
//         );
//         // find percentage of difference
//         const basisPoints = diff
//             .mul(10000)
//             .div(balances[asset.address].startBalance);
//         console.log(`#  ${asset.sym}: ${basisPoints.toString()}bps`);
//     }
// };

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
