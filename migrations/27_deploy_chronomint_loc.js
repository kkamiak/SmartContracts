var LOCManager = artifacts.require("./LOCManager.sol");
var LOCWallet = artifacts.require("./LOCWallet.sol")
const Storage = artifacts.require("./Storage.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(LOCWallet, Storage.address, 'LOCWallet'))
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.giveAccess(LOCWallet.address, 'LOCWallet'))
    .then(() => LOCWallet.deployed())
    .then(_wallet => _wallet.init(ContractsManager.address))

    .then(() => deployer.deploy(LOCManager, Storage.address, "LOCManager"))
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.giveAccess(LOCManager.address, 'LOCManager'))
    .then(() => LOCManager.deployed())
    .then(_manager => manager = _manager)
    .then(() => manager.init(ContractsManager.address, LOCWallet.address))
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.authorize(manager.address))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCManager: #done"))
}
