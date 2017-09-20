var ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(ChronoBankPlatform))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] ChronoBankPlatform deploy: #done"))
}
