const ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => ChronoBankAssetWithFee.deployed())
    .then(_asset => _asset.destroy())

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset with Fee destroy: #done"))
}
