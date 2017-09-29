var LOCWallet = artifacts.require("./LOCWallet.sol");
const Storage = artifacts.require("./Storage.sol")

module.exports = function(deployer, network) {
    if (LOCWallet.isDeployed()) {
        return deployer
        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCWallet deploy: #skip"))
    }

    deployer
    .then(() => deployer.deploy(LOCWallet, Storage.address, 'LOCWallet'))

    .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] LOCWallet deploy: #done"))
}
