const StorageInterface = artifacts.require('./StorageInterface.sol');

module.exports = function(deployer, network) {
    deployer.deploy(StorageInterface)
    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Storage Library re-deploy: #done"))
}
