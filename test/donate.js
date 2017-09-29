const Setup = require('../setup/setup');
const bytes32 = require('./helpers/bytes32');
const Reverter = require('./helpers/reverter');
const ErrorsEnum = require("../common/errors")
const AssetDonator = artifacts.require('./AssetDonator.sol');


contract('AssetDonator', function(accounts) {
    let owner = accounts[0];
    let owner1 = accounts[1];
    let owner2 = accounts[2];
    let owner3 = accounts[3];
    let owner4 = accounts[4];
    let owner5 = accounts[5];
    let nonOwner = accounts[6];
    let assetDonator;

    const TIME_SYMBOL = 'TIME';
    const LHT_SYMBOL = 'LHT';

    before('setup', function(done) {
        AssetDonator.deployed()
        .then((_assetDonator) => assetDonator = _assetDonator)
        .then(() => Setup.setup(done))
});


    it("Platform is able to transfer TIMEs for test purposes", function() {
        return assetDonator.sendTime.call({from: owner5}).then(function(r) {
            assert.isTrue(r);
            return assetDonator.sendTime({from: owner5}).then(function(r1) {
                  return Setup.chronoBankPlatform.balanceOf.call(owner5, bytes32('TIME')).then(function(r2) {
                      assert.equal(r2, 1000000000);
                  });
            });
      });
    });

    it("Platform is unable to transfer TIMEs twice to the same account", function() {
        return assetDonator.sendTime.call({from: owner5}).then(function(r) {
            assert.isFalse(r);
            return assetDonator.sendTime({from: owner5}).then(function(r1) {
                  return Setup.chronoBankPlatform.balanceOf.call(owner5, bytes32('TIME')).then(function(r2) {
                      assert.equal(r2, 1000000000);
                  });
            });
      });
    });
});
