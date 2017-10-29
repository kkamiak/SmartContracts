const AssetsManager = artifacts.require("./AssetsManager.sol")
const StorageManager = artifacts.require("./StorageManager.sol")
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol")

module.exports = function(deployer, network) {
    if (!AssetsManager.isDeployed()) {
        return deployer
        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] AssetsManager destroy: #skip"))
    }

    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => _storageManager.blockAccess(AssetsManager.address, "AssetsManager"))
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.reject(AssetsManager.address))
    // NOTE: we don't do destroy since it is meaningless here (no storage variables will be freed)

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] AssetsManager destroy: #done"))
}
