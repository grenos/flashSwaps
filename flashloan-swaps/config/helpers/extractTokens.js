var tokens = require("../allTokens.json");
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

*/

const getTokens = () => {
    const tokenList = [];

    for (const [key, value] of Object.entries(tokens)) {
        let obj = {
            address: value.tokenInfo.address,
            chainId: value.tokenInfo.chainId,
            decimals: value.tokenInfo.decimals,
            logoURI: value.tokenInfo.logoURI,
            name: value.tokenInfo.name,
            symbol: value.tokenInfo.symbol,
        };

        tokenList.push(obj);
    }

    fs.appendFile(
        `./data/allPolygonTokens.json`,
        JSON.stringify(tokenList),
        function (err) {}
    );
};

getTokens();
