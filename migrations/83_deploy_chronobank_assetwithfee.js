var ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol");

module.exports = function(deployer,network) {
    deployer.deploy(ChronoBankAssetWithFee)
    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] AssetWithFee (LHT) deploy: #done"))
}
