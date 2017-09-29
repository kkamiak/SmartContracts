var RewardsWallet = artifacts.require("./RewardsWallet.sol");
const Storage = artifacts.require("./Storage.sol")

module.exports = function(deployer, network) {
    if (RewardsWallet.isDeployed()) {
        return deployer
        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] RewardsWallet deploy: #skip"))
    }

    deployer
    .then(() => deployer.deploy(RewardsWallet, Storage.address, 'RewardsWallet'))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] RewardsWallet deploy: #done"))
}
