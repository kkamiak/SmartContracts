const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(ChronoBankAssetProxy))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset Proxy deploy: #done"))
}
