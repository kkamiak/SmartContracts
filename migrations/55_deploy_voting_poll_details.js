var PollDetails = artifacts.require("./PollDetails.sol");
const Storage = artifacts.require("./Storage.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(PollDetails, Storage.address, 'Vote'))

    .then(() => console.log("[MIGRATION] [55] Voting deployed: #done"))
}
