const AssetsManager = artifacts.require("./AssetsManager.sol");
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol");

module.exports = function (deployer, network) {
    if (network !== "main") {
        deployer
        .then(() => ContractsManager.deployed())
        .then(_contractsManager => _contractsManager.removeContract(AssetsManager.address))
        .then(() => AssetsManager.deployed())
        .then(_manager => _manager.init(ChronoBankPlatform.address, ContractsManager.address, ProxyFactory.address))

        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] AssetsManager re-init: #done"))
    }
}
