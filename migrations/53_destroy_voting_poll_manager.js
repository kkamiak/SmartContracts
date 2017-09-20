const PollManager = artifacts.require("./PollManager.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)
    .then(() => MultiEventsHistory.deployed())
    .then(_history => history = _history)

    .then(() => history.reject(PollManager.address))
    .then(() => storageManager.blockAccess(PollManager.address, 'Vote'))
    .then(() => PollManager.deployed())
    .then(_manager => _manager.destroy())

    .then(() => console.log("[MIGRATION] [53] Poll Manager destroyed: #done"))
}
