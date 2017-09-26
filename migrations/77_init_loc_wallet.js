const LOCWallet = artifacts.require("./LOCWallet.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.giveAccess(LOCWallet.address, 'LOCWallet'))
    .then(() => LOCWallet.deployed())
    .then(_wallet => _wallet.init(ContractsManager.address))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCWallet setup: #done"))
}
