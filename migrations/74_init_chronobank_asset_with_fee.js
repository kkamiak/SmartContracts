const ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol");
const ChronoBankAssetWithFeeProxy = artifacts.require("./ChronoBankAssetWithFeeProxy.sol");

module.exports = function(deployer,network) {
    deployer
    .then(() => ChronoBankAssetWithFee.deployed())
    .then(_asset => _asset.init(ChronoBankAssetWithFeeProxy.address))
    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset with Fee setup: #done"))
}
