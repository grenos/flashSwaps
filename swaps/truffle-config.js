require("ts-node").register({
    files: true,
});
require("dotenv").config();
const { MNEMONIC, INFURA_KEY } = process.env;
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    /*
     * $ truffle migrate --network <network>
     */
    networks: {
        development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*",
        },
        polygon: {
            provider: () => new HDWalletProvider(MNEMONIC, `https://polygon-mainnet.infura.io/v3/${INFURA_KEY}`),
            network_id: 137,
            confirmations: 1,
            timeoutBlocks: 200,
            gas: 8000000,
            gasPrice: 300000000000,
            production: true,
        },
        matic: {
            provider: () => new HDWalletProvider(MNEMONIC, `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`),
            network_id: 80001,
            confirmations: 1,
            timeoutBlocks: 200,
            skipDryRun: true,
        },
        goerli: {
            provider: () => new HDWalletProvider(MNEMONIC, `https://goerli.infura.io/v3/${INFURA_KEY}`),
            network_id: 5,
            confirmations: 1,
            timeoutBlocks: 200,
        },
    },

    mocha: {},

    compilers: {
        solc: {
            version: "0.8.10",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 1500,
                },
            },
        },
    },
};
