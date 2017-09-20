const ChronoBankAsset = artifacts.require("./ChronoBankAsset.sol");
const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol");

module.exports = function(deployer, network) {
    if (network !== 'main') {
        deployer
        .then(() => ChronoBankAsset.deployed())
        .then(_asset => _asset.init(ChronoBankAssetProxy.address))

        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset setup: #done"))
    }
}
