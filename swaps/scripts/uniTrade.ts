require("dotenv").config();

import { ethers } from "ethers";
import { Address } from "cluster";
import { Pool, Route, Trade } from "@uniswap/v3-sdk";
import { CurrencyAmount, Token, TradeType } from "@uniswap/sdk-core";
import { abi as IUniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import { abi as QuoterABI } from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
const provider = new ethers.providers.JsonRpcProvider(
    "https://mainnet.infura.io/v3/5851d99f0f79480d95709f0bb4659ad1"
);
const poolAddress = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8";
const poolContract = new ethers.Contract(
    poolAddress,
    IUniswapV3PoolABI,
    provider
);

const quoterAddress = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const quoterContract = new ethers.Contract(quoterAddress, QuoterABI, provider);

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

    const amountIn = 1500;
    /*
        function quoteExactInputSingle(
            address tokenIn,
            address tokenOut,
            uint24 fee,
            uint256 amountIn,
            uint160 sqrtPriceLimitX96
        ) external returns (uint256 amountOut);


        To get around this difficulty, we can use the callStatic method provided by ethers.js. callStatic is a useful method that submits a state-changing transaction to an Ethereum node, but asks the node to simulate the state change, rather than to execute it. Our script can then return the result of the simulated state change.

        To simulate a transaction without actually broadcasting it to the EVM, use the callStatic to call the ExactInputSingle function in the Quoter contract, which will tell us how much an of output token we will receive given a certain amount of input token when using a single hop swap.
    */
    const quotedAmountOut =
        await quoterContract.callStatic.quoteExactInputSingle(
            immutables.token0,
            immutables.token1,
            immutables.fee,
            amountIn.toString(),
            0
        );

    const swapRoute = new Route([poolExample], TokenA, TokenB);

    // Create an Unchecked Trade, a type of trade that is useful when we have retrieved a quote prior to the construction of the trade object.
    const uncheckedTradeExample = Trade.createUncheckedTrade({
        route: swapRoute,
        inputAmount: CurrencyAmount.fromRawAmount(TokenA, amountIn.toString()),
        outputAmount: CurrencyAmount.fromRawAmount(
            TokenB,
            quotedAmountOut.toString()
        ),
        tradeType: TradeType.EXACT_INPUT,
    });

    console.log("The quoted amount out is", quotedAmountOut.toString());
    console.log("The unchecked trade object is", uncheckedTradeExample);

    const token0Price = poolExample.token0Price;
    const token1Price = poolExample.token1Price;

    console.log("token0Price", token0Price);
    console.log("token1Price", token1Price);

    console.log(poolExample);
}

main1();
