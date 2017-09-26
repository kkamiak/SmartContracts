const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol");

module.exports = function(deployer,network) {
    if (network !== 'main') {
        const TIME_SYMBOL = 'TIME';
        const TIME_NAME = 'Time Token';
        const TIME_DESCRIPTION = 'ChronoBank Time Shares';

        const BASE_UNIT = 8;
        const IS_REISSUABLE = true;
        const IS_NOT_REISSUABLE = false;

        deployer
        .then(() => ChronoBankPlatform.deployed())
        .then(_platform => _platform.issueAsset(TIME_SYMBOL, 1000000000000, TIME_NAME, TIME_DESCRIPTION, BASE_UNIT, IS_NOT_REISSUABLE))

        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] TIME asset setup: #done"))
    }
}
