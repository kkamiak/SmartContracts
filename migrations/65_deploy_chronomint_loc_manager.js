var LOCManager = artifacts.require("./LOCManager.sol");
const Storage = artifacts.require("./Storage.sol")

module.exports = function(deployer, network) {

    deployer
    .then(() => deployer.deploy(LOCManager, Storage.address, 'LOCManager'))
    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCManager deploy: #done"))
}
