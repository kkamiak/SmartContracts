var VoteActor = artifacts.require("./VoteActor.sol");
var PollManager = artifacts.require("./PollManager.sol");
var PollDetails = artifacts.require("./PollDetails.sol");
const Storage = artifacts.require("./Storage.sol");
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

    .then(() => history.reject(VoteActor.address))
    .then(() => storageManager.blockAccess(VoteActor.address, 'Vote'))
    .then(() => {
        if (TimeHolder.isDeployed()) {
            return TimeHolder.deployed().then(_timeHolder => _timeHolder.removeListener(VoteActor.address))
        }
    })
    .then(() => VoteActor.deployed())
    .then(_actor => _actor.destroy())

    .then(() => console.log("[MIGRATION] [51.11] Vote Actor destroyed: #done"))

    .then(() => history.reject(PollManager.address))
    .then(() => storageManager.blockAccess(PollManager.address, 'Vote'))
    .then(() => PollManager.deployed())
    .then(_manager => _manager.destroy())

    .then(() => console.log("[MIGRATION] [51.12] Poll Manager destroyed: #done"))

    .then(() => storageManager.blockAccess(PollDetails.address, 'Vote'))
    .then(() => PollDetails.deployed())
    .then(_details => _details.destroy())

    .then(() => console.log("[MIGRATION] [51.13] Poll Details destroyed: #done"))

    // deploying updated contracts
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)
    .then(() => MultiEventsHistory.deployed())
    .then(_history => history = _history)

    .then(() => deployer.deploy(VoteActor, Storage.address, 'Vote'))
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
    .then(() => console.log("[MIGRATION] [51.21] Vote Actor: #done"))

    .then(() => deployer.deploy(PollManager, Storage.address, 'Vote'))
    .then(() => storageManager.giveAccess(PollManager.address, 'Vote'))
    .then(() => PollManager.deployed())
    .then(_pollManager => pollManager = _pollManager)
    .then(() => pollManager.init(ContractsManager.address))
    .then(() => history.authorize(pollManager.address))
    .then(() => console.log("[MIGRATION] [51.22] Poll Manager: #done"))

    .then(() => deployer.deploy(PollDetails, Storage.address, 'Vote'))
    .then(() => storageManager.giveAccess(PollDetails.address, 'Vote'))
    .then(() => PollDetails.deployed())
    .then(_pollDetails => _pollDetails.init(ContractsManager.address))
    .then(() => console.log("[MIGRATION] [51.23] Poll Details: #done"))
}
