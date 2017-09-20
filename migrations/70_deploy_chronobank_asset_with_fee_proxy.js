const ChronoBankAssetWithFeeProxy = artifacts.require("./ChronoBankAssetWithFeeProxy.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(ChronoBankAssetWithFeeProxy))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset with Fee Proxy deploy: #done"))
}
