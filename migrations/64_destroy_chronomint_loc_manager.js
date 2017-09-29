var LOCManager = artifacts.require("./LOCManager.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.blockAccess(LOCManager.address, 'LOCManager'))
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.reject(LOCManager.address))
    // NOTE: we don't do destroy since it is meaningless here (no storage variables will be freed)

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCManager destroy: #done"))
}
