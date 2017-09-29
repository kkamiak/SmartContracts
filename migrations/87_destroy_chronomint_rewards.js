const Rewards = artifacts.require("./Rewards.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");

module.exports = function (deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.blockAccess(Rewards.address, "Deposits"))
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.reject(Rewards.address))
    // NOTE: we don't do destroy since it is meaningless here (no storage variables will be freed)
    
    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Rewards destroyed: #done"))
}
