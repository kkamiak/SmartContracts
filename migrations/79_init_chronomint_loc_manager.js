const LOCManager = artifacts.require("./LOCManager.sol")
const LOCWallet = artifacts.require("./LOCWallet.sol");
const Storage = artifacts.require("./Storage.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.giveAccess(LOCManager.address, 'LOCManager'))
    .then(() => LOCManager.deployed())
    .then(_manager => _manager.init(ContractsManager.address, LOCWallet.address))
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.authorize(LOCManager.address))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCManager setup: #done"))
}
