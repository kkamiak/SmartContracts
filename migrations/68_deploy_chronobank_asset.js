var ChronoBankAsset = artifacts.require("./ChronoBankAsset.sol");

module.exports = function(deployer, network) {
    if (network !== 'main') {
        deployer
        .then(() => deployer.deploy(ChronoBankAsset))

        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Asset deploy: #done"))
    }
}
