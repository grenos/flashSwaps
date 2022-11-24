import { Token } from "@uniswap/sdk-core";
import { ChainId } from "@uniswap/smart-order-router";

export const createUniToken = (address: string, decimals: number, symbol: string, name: string) => {
    const token = new Token(ChainId.POLYGON, address, decimals, symbol, name);
    return token;
};
