const VoteActor = artifacts.require("./VoteActor.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");
const TimeHolder = artifacts.require("./TimeHolder.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)
    .then(() => MultiEventsHistory.deployed())
    .then(_history => history = _history)

    .then(() => history.reject(VoteActor.address))
    .then(() => storageManager.blockAccess(VoteActor.address, 'Vote'))
    .then(() => {
        if (TimeHolder.isDeployed()) {
            return TimeHolder.deployed().then(_timeHolder => _timeHolder.removeListener(VoteActor.address))
        }
    })
    .then(() => VoteActor.deployed())
    .then(_actor => _actor.destroy())

    .then(() => console.log("[MIGRATION] [52] Destroy Vote Actor destroyed: #done"))
}
