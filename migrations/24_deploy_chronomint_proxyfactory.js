var ProxyFactory = artifacts.require("./ProxyFactory.sol");
var PlatformFactory = artifacts.require('./PlatformFactory.sol');

module.exports = function (deployer, network) {
    deployer.deploy(ProxyFactory)
        .then(() => deployer.deploy(PlatformFactory))
        .then(() => console.log("[MIGRATION] [24] Factories: #done"))
}
