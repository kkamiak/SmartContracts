var AssetDonator = artifacts.require("./helpers/AssetDonator.sol");
const AssetsManager = artifacts.require("./AssetsManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const AssetsPlatformRegistry = artifacts.require("./AssetsPlatformRegistry.sol");


module.exports = function(deployer,network) {
    const TIME_SYMBOL = 'TIME';

    if(network !== 'main') {
        deployer.deploy(AssetDonator)
          .then(() => AssetDonator.deployed())
          .then(_assetDonator => _assetDonator.init(ContractsManager.address))
          .then(() => AssetsManager.deployed())
          .then(_assetsManager => _assetsManager.getPlatformRegistry()).then(_registryAddress => AssetsPlatformRegistry.at(_registryAddress))
          .then(_platformRegistry => _platformRegistry.addPlatformOwner(AssetDonator.address))
          .then(() => console.log("[MIGRATION] [33] AssetDonator: #done"))
    }
}
