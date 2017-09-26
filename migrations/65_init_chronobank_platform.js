const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol")
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol")

module.exports = function(deployer, network) {
    deployer
    .then(() => MultiEventsHistory.deployed())
    .then(_history => _history.authorize(ChronoBankPlatform.address))
    .then(() => ChronoBankPlatform.deployed())
    .then(_platform => _platform.setupEventsHistory(MultiEventsHistory.address))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] ChronoBankPlatform setup: #done"))
}
