import fs from "fs";
require("dotenv").config();
var _ = require("lodash");

import { ethers, Wallet } from "ethers";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
const { PROVIDER_MAIN_URL, MNEMONIC } = process.env;
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_MAIN_URL);
import contract from "../build/contracts/FlashLoan.json";
import _interface from "../build/contracts/IERC20.json";
import config from "../config/polygon/polygon.json";
import routes from "./../config/polygon/routes.json";
import { TargetRoute } from "../types/Trade";

// @ts-ignore
const _wallet: Wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
const wallet = _wallet.connect(provider);
const _contract = new ethers.Contract(config.arbContract, contract.abi, wallet);

let balances = {};
let inTrade = false;

const main = async () => {
    // await setup();
    await lookForDualTrade();
};

let goodCount = 0;
const useGoodRoutes = () => {
    if (goodCount >= routes.length) {
        goodCount = 0;
    }

    const route = routes[goodCount];

    const targetRoute: TargetRoute = {
        router1: route[0],
        router2: route[1],
        token1: route[2],
        token2: route[3],
    };

    goodCount += 1;
    return targetRoute;
};

//? [START] - LOOK FOR DUAL TRADE

const lookForDualTrade = async () => {
    let targetRoute = useGoodRoutes();

    try {
        // let tradeSize = balances[targetRoute.token1].balance;
        let tradeSize = ethers.utils.parseUnits("10", 18);
        let _tradeSize = ethers.BigNumber.from(tradeSize);
        let loanEstimae = ethers.BigNumber.from(ethers.utils.parseUnits("1000", "ether"));
        const totalAmouont = _tradeSize.add(loanEstimae);

        // --------------------------------------------

        const amtBack = await _contract.estimateDualDexTrade(
            targetRoute.router1,
            targetRoute.router2,
            targetRoute.token1,
            targetRoute.token2,
            totalAmouont
        );

        console.log("goodCount", goodCount);
        // --------------------------------------------
        // calculate 0.09% aave fee on the loan amount
        // 0.035 matic per swap ? -> 0.002267 MATIC per swap

        const multiplier = ethers.BigNumber.from(config.minBasisPointsPerTrade + 10000);
        const sizeMultiplied = totalAmouont.mul(multiplier);
        const divider = ethers.BigNumber.from(10000);
        const profitTarget = sizeMultiplied.div(divider);

        console.log("--------- TEST ------------");
        console.log("Router 1: ", targetRoute.router1);
        console.log("Router 2: ", targetRoute.router2);
        console.log("Token 1: ", targetRoute.token1);
        console.log("Token 2: ", targetRoute.token2);
        console.log("amtBack: ", amtBack.toString());
        console.log("profitTarget: ", profitTarget.toString());
        console.log("---------------------");

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
            // await dualTrade(
            //     targetRoute.token1,
            //     tradeSize,
            //     [targetRoute.router1, targetRoute.router2],
            //     [targetRoute.token1, targetRoute.token2]
            // );

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
        // console.log("-------- ERROR -------------");
        // console.log("Trade NOT possible");
        // console.log("Router 1: ", targetRoute.router1);
        // console.log("Router 2: ", targetRoute.router2);
        // console.log("Token 1: ", targetRoute.token1);
        // console.log("Token 2: ", targetRoute.token2);
        await lookForDualTrade();
    }
};

//? [END] - LOOK FOR DUAL TRADE

//! [START] - DUAL TRADE
const dualTrade = async (loanAsset: string, amount: string, routers: [string], route: string[]) => {
    if (inTrade) {
        await lookForDualTrade();
        return false;
    }
    try {
        inTrade = true;
        console.log("> Making dualTrade...");

        //{ gasPrice: 1000000000003, gasLimit: 500000 } ????? WHY
        const tx = await _contract.requestFlashLoan(loanAsset, amount, routers, route);
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
            const tokenInterface = new ethers.Contract(asset.address, _interface.abi, wallet);

            // check how much balance of each token is in the arb contract
            const balance = await tokenInterface.balanceOf(config.arbContract);
            console.log(asset.sym, balance.toString());

            // @ts-ignore
            balances[asset.address] = {
                sym: asset.sym,
                balance,
                startBalance: balance,
            };
        }
    } catch (error) {
        console.log("setup error for asset : " + asset?.sym + "- - ->", error);
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
        const tokenInterface = new ethers.Contract(asset.address, _interface.abi, wallet);
        // @ts-ignore
        balances[asset.address].balance = await tokenInterface.balanceOf(config.arbContract);
        // @ts-ignore
        const diff = balances[asset.address].balance.sub(balances[asset.address].startBalance);
        // @ts-ignore
        const basisPoints = diff.mul(10000).div(balances[asset.address].startBalance);

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
    fs.appendFile("./critical.txt", JSON.stringify(err.stack), function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

main().then(() => process.exit(0));
