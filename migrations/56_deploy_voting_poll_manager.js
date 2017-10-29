var PollManager = artifacts.require("./PollManager.sol");
const Storage = artifacts.require("./Storage.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(PollManager, Storage.address, 'Vote'))

    .then(() => console.log("[MIGRATION] [56] Voting deployed: #done"))
}
