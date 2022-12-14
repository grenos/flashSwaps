import fs from "fs";
import { CurrencyAmount, Percent, TradeType } from "@uniswap/sdk-core";
import { AlphaRouter, ChainId, SwapType } from "@uniswap/smart-order-router";
import { BigNumber, ethers, Wallet } from "ethers";
import _interface from "../build/contracts/IERC20.json";
import JSBI from "jsbi";
import { createUniToken } from "../config/helpers/UniTokens";
import contract from "../build/contracts/FlashLoan.json";
import config from "../config/polygon/polygon.json";
import routes from "./../config/polygon/routes.json";
import tokens from "./../config/polygon/tokens.json";
import { getDexSpots } from "../config/helpers/getDexSpots";
require("dotenv").config();
const { PROVIDER_MAIN_URL, MNEMONIC } = process.env;

const provider = new ethers.providers.JsonRpcProvider(PROVIDER_MAIN_URL);
const router = new AlphaRouter({
    chainId: ChainId.POLYGON,
    provider: provider,
});

// @ts-ignore
const _wallet: Wallet = new ethers.Wallet.fromMnemonic(MNEMONIC);
const wallet = _wallet.connect(provider);
const _contract = new ethers.Contract(config.arbContract, contract.abi, wallet);
const V3_SWAP_ROUTER_ADDRESS = config.routers[0].address;

const main = async () => {
    for (const _route of routes) {
        const t0 = tokens.find((token) => token.address === _route[0]);
        const t1 = tokens.find((token) => token.address === _route[1]);

        if (t0 && t1) {
            const token0 = createUniToken(t0.address, t0.decimals, t0.symbol, t0.name);
            const token1 = createUniToken(t1.address, t1.decimals, t1.symbol, t1.name);

            const token0Interface = new ethers.Contract(token0.address, _interface.abi, wallet);
            const myToken0Balance: BigNumber = await token0Interface.balanceOf(wallet.address);

            const initialAmount = myToken0Balance.toString();
            const token0Amount = CurrencyAmount.fromRawAmount(token0, JSBI.BigInt(initialAmount));

            const route = await router.route(token0Amount, token1, TradeType.EXACT_INPUT, {
                recipient: wallet.address,
                slippageTolerance: new Percent(5, 100),
                deadline: Math.floor(Date.now() / 1000 + 1800),
                type: SwapType.SWAP_ROUTER_02,
            });

            if (route?.quoteGasAdjusted === undefined) {
                console.log("Found bad route", _route);
                continue;
            }

            const uniAmountBack = BigNumber.from(
                ethers.utils.parseUnits(route?.quoteGasAdjusted.toFixed(token1.decimals) ?? "0", token1.decimals)
            );

            const { dexSpot, _router } = await getDexSpots(token1, token0, uniAmountBack, _contract);

            const multiplier = BigNumber.from(config.minBasisPointsPerTrade + 10000);
            const sizeMultiplied = dexSpot.mul(multiplier);
            const divider = BigNumber.from(10000);
            const profitTarget = sizeMultiplied.div(divider);

            if (BigNumber.from(profitTarget).gt(initialAmount)) {
                console.log("token post proccessing", uniAmountBack.toString());
                console.log("dex price", dexSpot.toString());
                console.log("profitTarget", profitTarget.toString());
                console.log("initial amount", initialAmount.toString());

                // const nonce = await provider.getTransactionCount(wallet.address);
                // const approveUni = await token0Interface.approve(V3_SWAP_ROUTER_ADDRESS, initialAmount, {
                //     gasLimit: route?.estimatedGasUsed,
                //     gasPrice: BigNumber.from(route?.gasPriceWei),
                //     nonce,
                // });
                // await approveUni.wait();

                // const nonce2 = await provider.getTransactionCount(wallet.address);
                // const transaction = {
                //     chainId: ChainId.POLYGON,
                //     data: route?.methodParameters?.calldata,
                //     to: V3_SWAP_ROUTER_ADDRESS,
                //     value: BigNumber.from(route?.methodParameters?.value),
                //     from: wallet.address,
                //     gasPrice: BigNumber.from(route?.gasPriceWei),
                //     gasLimit: route?.estimatedGasUsed.mul(2),
                //     nonce: nonce2,
                // };

                // const tx = await wallet.signTransaction(transaction);
                // const called = await provider.sendTransaction(tx);
                // const finalTx = await called.wait();
                // console.log(finalTx, "finalTx");

                //! fix contract to have the swap method callable from external and only from the owner - add weth to the transations as we did before
                // const swapSushi:  = await _contract.swap(_router, token1.address, token0.address, uniAmountBack);
                // const finalSushi = await swapSushi.wait();
            }
        }
    }

    //! loop finished - call function again
    // main();
};

process.on("uncaughtException", function (err) {
    console.log("UnCaught Exception 83: " + err);
    console.error(err.stack);
    fs.appendFile("./critical.txt", JSON.stringify(err.stack), function () {});
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: " + p + " - reason: " + reason);
});

process.on("error", (err) => {
    console.log(err);
});

main().then(() => {});

/*

~ Route Object ~

{
  quote: CurrencyAmount {
    numerator: JSBI(2) [ 751190228, 135633790, sign: false ],
    denominator: JSBI(1) [ 1, sign: false ],
    currency: Token {
      chainId: 137,
      decimals: 18,
      symbol: 'LINK',
      name: 'Chainlink Token',
      isNative: false,
      isToken: true,
      address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39'
    },
    decimalScale: JSBI(2) [ 660865024, 931322574, sign: false ]
  },
  quoteGasAdjusted: CurrencyAmount {
    numerator: JSBI(9) [
      743362920, 277739671,
      978335612, 316443919,
      240398620, 834383674,
      274845057, 665572855,
      508,       sign: false
    ],
    denominator: JSBI(7) [ 0, 0, 0, 0, 0, 0, 4096, sign: false ],
    currency: Token {
      chainId: 137,
      decimals: 18,
      symbol: 'LINK',
      name: 'Chainlink Token',
      isNative: false,
      isToken: true,
      address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39'
    },
    decimalScale: JSBI(2) [ 660865024, 931322574, sign: false ]
  },
  estimatedGasUsed: BigNumber { _hex: '0x02f1e8', _isBigNumber: true },
  estimatedGasUsedQuoteToken: CurrencyAmount {
    numerator: JSBI(9) [
      330378904, 796002152,
      95406211,  757297904,
      833343203, 239358149,
      330003070, 839652666,
      8,         sign: false
    ],
    denominator: JSBI(7) [ 0, 0, 0, 0, 0, 0, 4096, sign: false ],
    currency: Token {
      chainId: 137,
      decimals: 18,
      symbol: 'LINK',
      name: 'Chainlink Token',
      isNative: false,
      isToken: true,
      address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39'
    },
    decimalScale: JSBI(2) [ 660865024, 931322574, sign: false ]
  },
  estimatedGasUsedUSD: CurrencyAmount {
    numerator: JSBI(1) [ 16864, sign: false ],
    denominator: JSBI(1) [ 1, sign: false ],
    currency: Token {
      chainId: 137,
      decimals: 6,
      symbol: 'USDC',
      name: 'USD//C',
      isNative: false,
      isToken: true,
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    },
    decimalScale: JSBI(1) [ 1000000, sign: false ]
  },
  gasPriceWei: BigNumber { _hex: '0x17eb6ba3c7', _isBigNumber: true },
  route: [
    V3RouteWithValidQuote {
      protocol: 'V3',
      amount: [CurrencyAmount],
      rawQuote: [BigNumber],
      sqrtPriceX96AfterList: [Array],
      initializedTicksCrossedList: [Array],
      quoterGasEstimate: [BigNumber],
      quote: [CurrencyAmount],
      percent: 100,
      route: [V3Route],
      gasModel: [Object],
      quoteToken: [Token],
      tradeType: 0,
      gasCostInToken: [CurrencyAmount],
      gasCostInUSD: [CurrencyAmount],
      gasEstimate: [BigNumber],
      quoteAdjustedForGas: [CurrencyAmount],
      poolAddresses: [Array],
      tokenPath: [Array]
    }
  ],
  trade: Trade { swaps: [ [Object] ], routes: [ [RouteV3] ], tradeType: 0 },
  methodParameters: {
    calldata: '0x5ae401dc00000000000000000000000000000000000000000000000000000000637fabca0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000124b858183f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000800000000000000000000000004b58c57db696d2e043a72149507d5267f7dd74fe0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000001ecc37fb0bcd00600000000000000000000000000000000000000000000000000000000000000428f3cf7ad23cd3cadbd9735aff958023239c6a0630000642791bca1f2de4661ed88a30c99a7a9449aa841740001f453e0bca35ec356bd5dddfebbd1fc0fd03fabad3900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    value: '0x00',
    to: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'
  },
  blockNumber: BigNumber { _hex: '0x02258df7', _isBigNumber: true },
  simulationStatus: 0
}


*/
