var ProxyFactory = artifacts.require("./ProxyFactory.sol");
const ContractsManager = artifacts.require('./ContractsManager.sol')

module.exports = function (deployer, network) {
    deployer.deploy(ProxyFactory)
    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Assets Factory deploy: #done"))
}
