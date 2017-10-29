const VoteActor = artifacts.require("./VoteActor.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");
const TimeHolder = artifacts.require("./TimeHolder.sol");

module.exports = function(deployer, network) {
    let voteActor
    let pollManager

    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)
    .then(() => MultiEventsHistory.deployed())
    .then(_history => history = _history)

    .then(() => storageManager.giveAccess(VoteActor.address, 'Vote'))
    .then(() => VoteActor.deployed())
    .then(_voteActor => voteActor = _voteActor)
    .then(() => voteActor.init(ContractsManager.address))
    .then(() => history.authorize(voteActor.address))
    .then(() => {
        if (TimeHolder.isDeployed()) {
            return TimeHolder.deployed()
            .then(_timeHolder => _timeHolder.addListener(voteActor.address))
        }
    })
    .then(() => console.log("[MIGRATION] [60] Setup Vote Actor: #done"))
}
