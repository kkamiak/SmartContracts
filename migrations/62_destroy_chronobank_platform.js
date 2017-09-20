const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol")
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.reject(ChronoBankPlatform.address))
    .then(() => ChronoBankPlatform.deployed())
    .then(_platform => _platform.destroy)

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] ChronoBankPlatform destroy: #done"))
}
