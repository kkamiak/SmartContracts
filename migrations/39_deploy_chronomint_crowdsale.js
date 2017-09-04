const TimeLimitedCrowdsaleFactory = artifacts.require("./TimeLimitedCrowdsaleFactory.sol");
const BlockLimitedCrowdsaleFactory = artifacts.require("./BlockLimitedCrowdsaleFactory.sol");
const CrowdsaleManager = artifacts.require("./CrowdsaleManager.sol");
const Storage = artifacts.require('./Storage.sol');
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");
const CryptocomparePriceTicker = artifacts.require("./CryptocomparePriceTicker.sol");

module.exports = function (deployer, network) {
    deployer
        .then(() => StorageManager.deployed())
        .then((_storageManager) => storageManager = _storageManager)
        .then(() => deployer.deploy(CryptocomparePriceTicker))

        .then(() => deployer.deploy(TimeLimitedCrowdsaleFactory, Storage.address, 'TimeLimitedCrowdsaleFactory'))
        .then(() => storageManager.giveAccess(TimeLimitedCrowdsaleFactory.address, 'TimeLimitedCrowdsaleFactory'))
        .then(() => TimeLimitedCrowdsaleFactory.deployed())
        .then(_crowdsaleFactory => crowdsaleFactory = _crowdsaleFactory)
        .then(() => crowdsaleFactory.init(ContractsManager.address, CryptocomparePriceTicker.address))

        .then(() => deployer.deploy(BlockLimitedCrowdsaleFactory, Storage.address, 'BlockLimitedCrowdsaleFactory'))
        .then(() => storageManager.giveAccess(BlockLimitedCrowdsaleFactory.address, 'BlockLimitedCrowdsaleFactory'))
        .then(() => BlockLimitedCrowdsaleFactory.deployed())
        .then(_crowdsaleFactory => crowdsaleFactory = _crowdsaleFactory)
        .then(() => crowdsaleFactory.init(ContractsManager.address, CryptocomparePriceTicker.address))

        .then(() => deployer.deploy(CrowdsaleManager, Storage.address, 'CrowdsaleManager'))
        .then(() => storageManager.giveAccess(CrowdsaleManager.address, 'CrowdsaleManager'))
        .then(() => CrowdsaleManager.deployed())
        .then(_manager => manager = _manager)
        .then(() => manager.init(ContractsManager.address))
        .then(() => MultiEventsHistory.deployed())
        .then(_history => _history.authorize(manager.address))

        .then(() => console.log("[MIGRATION] [39] CrowdsaleManager: #done"))
}
