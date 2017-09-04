const SafeMath = artifacts.require('./SafeMath.sol');

module.exports = function(deployer, network) {
    deployer.deploy(SafeMath)
}
