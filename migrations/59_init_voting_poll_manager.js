const PollManager = artifacts.require("./PollManager.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)
    .then(() => MultiEventsHistory.deployed())
    .then(_history => history = _history)

    .then(() => storageManager.giveAccess(PollManager.address, 'Vote'))
    .then(() => PollManager.deployed())
    .then(_pollManager => pollManager = _pollManager)
    .then(() => pollManager.init(ContractsManager.address))
    .then(() => history.authorize(pollManager.address))

    .then(() => console.log("[MIGRATION] [59] Setup Poll Manager: #done"))
}
