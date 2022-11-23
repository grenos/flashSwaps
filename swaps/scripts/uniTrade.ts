require("dotenv").config();
// const { ethers } = require("ethers");
var _ = require("lodash");

import { ethers, Wallet } from "ethers";
import { Address } from "cluster";
import { Pool } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
const { PROVIDER_MAIN_URL, MNEMONIC } = process.env;
const provider = new ethers.providers.JsonRpcProvider(
    "https://mainnet.infura.io/v3/5851d99f0f79480d95709f0bb4659ad1"
);
const poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
);

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
    const [factory, token0, token1, fee, tickSpacing, maxLiquidityPerTick] =
        await Promise.all([
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
    const [liquidity, slot] = await Promise.all([
        poolContract.liquidity(),
        poolContract.slot0(),
    ]);

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
    const [immutables, state] = await Promise.all([
        getPoolImmutables(),
        getPoolState(),
    ]);

    const TokenA = new Token(
        3,
        immutables.token0 as string,
        6,
        "USDC",
        "USD Coin"
    );

    const TokenB = new Token(
        3,
        immutables.token1 as string,
        18,
        "WETH",
        "Wrapped Ether"
    );

    const poolExample = new Pool(
        TokenA,
        TokenB,
        immutables.fee,
        state.sqrtPriceX96.toString(),
        state.liquidity.toString(),
        state.tick
    );

    const token0Price = poolExample.token0Price;
    const token1Price = poolExample.token1Price;

    console.log(poolExample);
}

main1();
