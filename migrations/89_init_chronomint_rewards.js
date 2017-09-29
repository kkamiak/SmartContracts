const Rewards = artifacts.require("./Rewards.sol");
const RewardsWallet = artifacts.require("./RewardsWallet.sol")
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");
const PlatformsManager = artifacts.require('./PlatformsManager.sol')
const ChronoBankPlatform = artifacts.require('./ChronoBankPlatform.sol')

module.exports = function (deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.giveAccess(Rewards.address, "Deposits"))
    .then(() => Rewards.deployed())
    .then(_manager => manager = _manager)
    .then(() => PlatformsManager.deployed())
    .then(_platformsManager => _platformsManager.getIdForPlatform.call(ChronoBankPlatform.address))
    .then(_platformId => manager.init(ContractsManager.address, RewardsWallet.address, _platformId, 0))
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.authorize(manager.address))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Rewards setup: #done"))
}
