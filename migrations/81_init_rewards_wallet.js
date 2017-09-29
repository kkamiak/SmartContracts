const RewardsWallet = artifacts.require("./RewardsWallet.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.giveAccess(RewardsWallet.address, 'RewardsWallet'))
    .then(() => RewardsWallet.deployed())
    .then(_wallet => _wallet.init(ContractsManager.address))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] RewardsWallet setup: #done"))
}
