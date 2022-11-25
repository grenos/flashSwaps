import { Token } from "@uniswap/sdk-core";
import { BigNumber, Contract } from "ethers";
import config from "../polygon/polygon.json";

type DexSpot = {
    dexSpot: BigNumber;
    _router: string;
};

export const getDexSpots = async (
    token1: Token,
    token0: Token,
    amount: BigNumber,
    _contract: Contract
): Promise<DexSpot> => {
    let sushiBack: BigNumber = BigNumber.from(0);
    let quickBack: BigNumber = BigNumber.from(0);
    let dfynBack: BigNumber = BigNumber.from(0);
    let notEnough = BigNumber.from("990000000000000000");

    const local: BigNumber = await _contract
        .getAmountOutMin(config.routers[1].address, token1.address, token0.address, amount)
        .catch((err: any) => {});
    if (local !== undefined) {
        sushiBack = local;
    }

    if (sushiBack !== undefined && sushiBack.lt(notEnough)) {
        let local = await _contract
            .getAmountOutMin(config.routers[2].address, token1.address, token0.address, amount)
            .catch((err: any) => {});

        if (local !== undefined) {
            quickBack = local;
        }
    }

    if (quickBack !== undefined && quickBack.lt(notEnough)) {
        let local = await _contract
            .getAmountOutMin(config.routers[3].address, token1.address, token0.address, amount)
            .catch((err: any) => {});
        if (local !== undefined) {
            dfynBack = local;
        }
    }

    if (sushiBack.gt(quickBack) && sushiBack.gt(dfynBack)) {
        return { dexSpot: sushiBack, _router: config.routers[1].address };
    } else if (quickBack.gt(sushiBack) && quickBack.gt(dfynBack)) {
        return { dexSpot: quickBack, _router: config.routers[2].address };
    } else {
        return { dexSpot: dfynBack, _router: config.routers[3].address };
    }
};
