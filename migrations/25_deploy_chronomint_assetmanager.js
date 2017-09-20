var AssetsManager = artifacts.require("./AssetsManager.sol");
var AssetsPlatformRegistry = artifacts.require("./AssetsPlatformRegistry.sol");
const Storage = artifacts.require('./Storage.sol');
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const PlatformFactory = artifacts.require("./PlatformFactory.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");
const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");

module.exports = function (deployer, network) {
	if (network !== "main") {
		// AssetsManager deployment
    	deployer.deploy(AssetsManager, Storage.address, 'AssetsManager')
        .then(() =>  StorageManager.deployed())
        .then(_storageManager => _storageManager.giveAccess(AssetsManager.address, 'AssetsManager'))
        .then(() => AssetsManager.deployed())
        .then(_manager => assetsManager = _manager)

		// AssetsPlatformRegistry deployment
		.then(() => deployer.deploy(AssetsPlatformRegistry, Storage.address, 'AssetsManager'))
		.then(() => StorageManager.deployed())
		.then(_storageManager => _storageManager.giveAccess(AssetsPlatformRegistry.address, 'AssetsManager'))
		.then(() => AssetsPlatformRegistry.deployed())
		.then(_registry => assetsPlatformRegistry = _registry)

		// setup cross-init
        .then(() => assetsManager.init(ContractsManager.address, ProxyFactory.address, PlatformFactory.address, assetsPlatformRegistry.address))
		.then(() => assetsPlatformRegistry.init(ContractsManager.address, assetsManager.address, assetsManager.address))

		// setup events history
        .then(() => MultiEventsHistory.deployed())
        .then(_history => Promise.all([_history.authorize(assetsManager.address), _history.authorize(assetsPlatformRegistry.address)]))

        .then(() => console.log("[MIGRATION] [25] AssetManager and AssetsPlatformRegistry: #done"))
	}
}
