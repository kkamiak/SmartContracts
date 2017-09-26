const TimeHolder = artifacts.require("./TimeHolder.sol");
const TimeHolderWallet = artifacts.require('./TimeHolderWallet.sol')
const ContractsManager = artifacts.require("./ContractsManager.sol");
const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol");

module.exports = function (deployer, network) {
    if (network !== "main") {
        deployer
        .then(() => ContractsManager.deployed())
        .then(_contractsManager => _contractsManager.removeContract(TimeHolder.address))
        .then(() => {
            if (network == "main") {
                return ERC20Manager.deployed()
                .then(_erc20Manager => _erc20Manager.getTokenAddressBySymbol.call("TIME"))
            } else {
                return ChronoBankAssetProxy.address;
            }
        })
        .then(_timeAddress => timeAddress = _timeAddress)
        .then(() => TimeHolder.deployed())
        .then(_timeHolder => _timeHolder.init(ContractsManager.address, timeAddress, TimeHolderWallet.address))

        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] TimeHolder re-init: #done"))
    }
}
