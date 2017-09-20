const PollDetails = artifacts.require("./PollDetails.sol");
const StorageManager = artifacts.require("./StorageManager.sol");
const ContractsManager = artifacts.require("./ContractsManager.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)

    .then(() => storageManager.giveAccess(PollDetails.address, 'Vote'))
    .then(() => PollDetails.deployed())
    .then(_pollDetails => _pollDetails.init(ContractsManager.address))
    
    .then(() => console.log("[MIGRATION] [58] Setup Poll Details: #done"))
}
