const fs = require("fs");
require("dotenv").config();
// const { ethers } = require("ethers");
var _ = require("lodash");

import { ethers, Wallet } from "ethers";
import { Address } from "cluster";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
const { PROVIDER_MAIN_URL, MNEMONIC } = process.env;
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/5851d99f0f79480d95709f0bb4659ad1");
const poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);

const contract = require("../build/contracts/FlashLoan.json");
const _interface = require("../build/contracts/IERC20.json");
const config = require("../config/polygon/polygon.json");
let routes = require("./../config/polygon/routes.json");

// @ts-ignore
const _wallet: Wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
const wallet = _wallet.connect(provider);
const _contract = new ethers.Contract(config.arbContract, contract.abi, wallet);

let balances = {};
let inTrade = false;

const main = async () => {
    // await setup();
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

type TargetRoute = {
    router1: string;
    router2: string;
    token1: string;
    token2: string;
};

const useGoodRoutes = () => {
    const targetRoute: TargetRoute = {
        router1: "string",
        router2: "string",
        token1: "string",
        token2: "string",
    };

    if (goodCount >= routes.length) {
        goodCount = 0;
    }
    const route = routes[goodCount];
    targetRoute.router1 = route[0];
    targetRoute.router2 = route[1];
    targetRoute.token1 = route[2];
    targetRoute.token2 = route[3];

    goodCount += 1;

    return targetRoute;
};

//? [START] - LOOK FOR DUAL TRADE
let badRoutes = [];

const lookForDualTrade = async () => {
    let targetRoute = useGoodRoutes();

    try {
        // let tradeSize = balances[targetRoute.token1].balance;
        let tradeSize = ethers.utils.parseUnits("1", 18);
        let _tradeSize = ethers.BigNumber.from(tradeSize);

        let loanEstimae = ethers.BigNumber.from(ethers.utils.parseUnits("10", "ether"));
        const totalAmouont = _tradeSize.add(loanEstimae);

        // --------------------------------------------

        const sushiBack = await _contract.getAmountOutMin(
            targetRoute.router1,
            targetRoute.token1,
            targetRoute.token2,
            totalAmouont
        );

        const quickBack = await _contract.getAmountOutMin(
            targetRoute.router2,
            targetRoute.token2,
            targetRoute.token1,
            sushiBack
        );

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
        // calculate 0.3% sushiswap fee on the trade
        // calculate 0.3% quickswap fee on the trade
        // 0.035 matic per swap ? -> 0.002267 MATIC per swap
        // slippage tolerance 0.5% ? slipperage tolerance on sushi and quickswap

        const multiplier = ethers.BigNumber.from(config.minBasisPointsPerTrade + 10000);
        const sizeMultiplied = totalAmouont.mul(multiplier);
        const divider = ethers.BigNumber.from(10000);
        const profitTarget = sizeMultiplied.div(divider);

        console.log("--------- TEST ------------");
        console.log("Router 1: ", targetRoute.router1);
        console.log("Router 2: ", targetRoute.router2);
        console.log("Token 1: ", targetRoute.token1);
        console.log("Token 2: ", targetRoute.token2);
        console.log("Sushi Back: ", sushiBack.toString());
        console.log("quickBack Back: ", quickBack.toString());
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
    fs.appendFile("./critical.txt", err.stack, function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

// main().then(() => process.exit(0));

const poolImmutablesAbi = [
    "function factory() external view returns (address)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)",
    "function tickSpacing() external view returns (int24)",
    "function maxLiquidityPerTick() external view returns (uint128)",
];

interface Immutables {
    factory: Address;
    token0: Address | string;
    token1: Address | string;
    fee: number;
    tickSpacing: number;
    maxLiquidityPerTick: number;
}

interface State {
    liquidity: ethers.BigNumber;
    sqrtPriceX96: ethers.BigNumber;
    tick: number;
    observationIndex: number;
    observationCardinality: number;
    observationCardinalityNext: number;
    feeProtocol: number;
    unlocked: boolean;
}

async function getPoolImmutables() {
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] = await Promise.all([
        poolContract.factory(),
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.maxLiquidityPerTick(),
    ]);

    const immutables: Immutables = {
        factory,
        token0,
        token1,
        fee,
        tickSpacing,
        maxLiquidityPerTick,
    };
    return immutables;
}

async function getPoolState() {
    const [liquidity, slot] = await Promise.all([poolContract.liquidity(), poolContract.slot0()]);

    const PoolState: State = {
        liquidity,
        sqrtPriceX96: slot[0],
        tick: slot[1],
        observationIndex: slot[2],
        observationCardinality: slot[3],
        observationCardinalityNext: slot[4],
        feeProtocol: slot[5],
        unlocked: slot[6],
    };

    return PoolState;
}

async function main1() {
    const [immutables, state] = await Promise.all([getPoolImmutables(), getPoolState()]);

    const TokenA = new Token(3, immutables.token0 as string, 6, "USDC", "USD Coin");

    const TokenB = new Token(3, immutables.token1 as string, 18, "WETH", "Wrapped Ether");

    const poolExample = new Pool(
        TokenA,
        TokenB,
        immutables.fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    );
    console.log(poolExample);
}

main1();
