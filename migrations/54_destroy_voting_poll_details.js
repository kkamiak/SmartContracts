const PollDetails = artifacts.require("./PollDetails.sol");
const StorageManager = artifacts.require("./StorageManager.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => StorageManager.deployed())
    .then(_storageManager => storageManager = _storageManager)

    .then(() => storageManager.blockAccess(PollDetails.address, 'Vote'))
    .then(() => PollDetails.deployed())
    .then(_details => _details.destroy())

    .then(() => console.log("[MIGRATION] [54] Poll Details destroyed: #done"))
}
