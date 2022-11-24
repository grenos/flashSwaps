var uni = require("../../data/uniAll.json");
const fs = require("fs");

/*
     "tokenInfo": {
            "address": "0x63a72806098Bd3D9520cC43356dD78afe5D386D9",
            "chainId": 43114,
            "decimals": 18,
            "logoURI": "https://raw.githubusercontent.com/sushiswap/list/master/logos/token-logos/network/avalanche/0x63a72806098Bd3D9520cC43356dD78afe5D386D9.jpg",
            "name": "Aave Token",
            "symbol": "AAVE"
        },


         {
            "chainId": 137,
            "address": "0x9c2C5fd7b07E95EE044DDeba0E97a665F142394f",
            "name": "1inch",
            "symbol": "1INCH",
            "decimals": 18,
            "logoURI": "https://assets.coingecko.com/coins/images/13469/thumb/1inch-token.png?1608803028",
            "extensions": {
                "bridgeInfo": {
                    "1": {
                        "tokenAddress": "0x111111111117dC0aa78b770fA6A738034120C302"
                    }
                }
            }
        },

*/

const getTokens = () => {
    const tokenList = [];

    for (const [key, value] of Object.entries(uni.tokens)) {
        if (value.chainId === 137) {
            let obj = {
                address: value.address,
                chainId: value.chainId,
                decimals: value.decimals,
                logoURI: value.logoURI,
                name: value.name,
                symbol: value.symbol,
            };
            tokenList.push(obj);
        }
    }

    fs.appendFile(`./data/allUniShawpTokens.json`, JSON.stringify(tokenList), function (err) {});
};

getTokens();
