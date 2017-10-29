var ExchangeManager = artifacts.require("./ExchangeManager.sol");

module.exports = function(deployer,network) {
    const LHT_SYMBOL = 'LHT';

    deployer
    // .then(() => ExchangeManager.deployed())
    // .then(_exchangeManager => _exchangeManager.createExchange(LHT_SYMBOL, false))
    .then(() => console.log("[MIGRATION] [38] LHT Exchange: #skip"))
}
