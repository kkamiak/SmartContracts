const ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol");

module.exports = function(deployer,network) {
    deployer
    .then(() => deployer.deploy(ChronoBankAssetWithFee))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset with Fee deploy: #done"))
}
