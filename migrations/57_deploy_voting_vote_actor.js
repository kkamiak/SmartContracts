var VoteActor = artifacts.require("./VoteActor.sol");
const Storage = artifacts.require("./Storage.sol");

module.exports = function(deployer, network) {
    deployer
    .then(() => deployer.deploy(VoteActor, Storage.address, 'Vote'))

    .then(() => console.log("[MIGRATION] [57] Voting deployed: #done"))
}
