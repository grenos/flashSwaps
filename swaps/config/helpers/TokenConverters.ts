import { BigNumber, ethers } from "ethers";
import { Token } from "../../types/Trade";

export const convertToCurrencyDecimals = async (token: Token, amount: BigNumber) => {
    return ethers.utils.parseUnits(amount.toString(), token.decimals);
};

// export const convertToCurrencyUnits = async (token: Token, amount: string) => {
//     let decimals = BigNumber.from(token.decimals);
//     const currencyUnit = BigNumber.from(10).pow(decimals);
//     const amountInCurrencyUnits = BigNumber.from(amount).div(currencyUnit);
//     return amountInCurrencyUnits.toFixed(decimals);
// };
