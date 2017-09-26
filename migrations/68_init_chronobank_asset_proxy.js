const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol");
const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol");

module.exports = function(deployer,network) {
    if (network !== 'main') {
        const TIME_SYMBOL = 'TIME';
        const TIME_NAME = 'Time Token';

        deployer
        .then(() => ChronoBankAssetProxy.deployed())
        .then(_proxy => _proxy.init(ChronoBankPlatform.address, TIME_SYMBOL, TIME_NAME))

        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset proxy (TIME) setup: #done"))
    }
}
