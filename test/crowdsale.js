const Setup = require('../setup/setup')
const ErrorsEnum = require("../common/errors")
var eventsHelper = require('./helpers/eventsHelper');
const bytes32 = require('./helpers/bytes32');

const AssetsManager = artifacts.require('./AssetsManager.sol')
const TimeLimitedCrowdsale = artifacts.require('./TimeLimitedCrowdsale.sol')
const CrowdsaleManager = artifacts.require('./CrowdsaleManager.sol')
const TimeLimitedCrowdsaleFactory = artifacts.require('./TimeLimitedCrowdsaleFactory.sol')
const FakePriceTicker = artifacts.require('./FakePriceTicker.sol')

contract('CrowdsaleManager', function(accounts) {
    const TOKEN_1 = 'AWSM';   //reissuable
    const TOKEN_2 = 'AWSM2'; //non-reissuable

    const nonOwner = accounts[0];
    const tokenOwner = accounts[5];
    const fund = accounts[9];

    before('setup', function(done) {
        AssetsManager.deployed()
            .then(_assetsManager => assetsManager = _assetsManager)
            .then(() => assetsManager.createAsset(TOKEN_1, "Awesome Token 1",'Token 1', 0, 0, true, false, {from: tokenOwner}))
            .then(() => assetsManager.createAsset(TOKEN_2, "Awesome Token 2",'Token 2', 100, 0, false, false, {from: tokenOwner}))
            .then(() => TimeLimitedCrowdsaleFactory.deployed())
            .then(crowdsaleFactory => crowdsaleFactory.setPriceTicker(FakePriceTicker.address))
            .then(() => Setup.setup(done));
    });

    context("Security checks", function() {
        it("CrowdsaleManager has correct ContractsManager address.", function() {
            return Setup.crowdsaleManager.contractsManager.call().then(function(r) {
                assert.equal(r,Setup.contractsManager.address);
            });
        });

        it("CrowdsaleManager has correct Events History address.", function() {
            return Setup.crowdsaleManager.getEventsHistory.call().then(function(r) {
                assert.equal(r,Setup.multiEventsHistory.address);
            });
        });

        it("Should not be possible to init crowdsaleManager by non-owner", function() {
            return Setup.crowdsaleManager.init.call(Setup.contractsManager.address, {from: accounts[1]}).then(function(r) {
                assert.equal(r, ErrorsEnum.UNAUTHORIZED);
            });
        });

        it("Destroy performaed by non-owner has no effect", function() {
            return Setup.crowdsaleManager.destroy({from: accounts[1]}).then(function(r) {
                return Setup.crowdsaleManager.contractsManager.call().then(function(r) {
                    assert.equal(r,Setup.contractsManager.address);
                });
            });
        });

        it("Should not be possible to start crowdsale via direct `createCrowdsale` execution", function() {
            return Setup.crowdsaleManager.createCrowdsale.call(nonOwner, "LHT", "TimeLimitedCrowdsaleFactory").then(function(r) {
                assert.equal(r[0], 0x0);
                assert.equal(r[1], ErrorsEnum.UNAUTHORIZED);
            });
        });

        it("Should not be possible to delete any crowdsale via direct `deleteCrowdsale` execution", function() {
            return Setup.crowdsaleManager.deleteCrowdsale.call(0x0).then(function(r) {
                assert.equal(r, ErrorsEnum.UNAUTHORIZED);
            });
        });
    })

    context("CRUD test", function() {
        var campaign;

        it("Should not be possible to start crowdsale campaign by non-asset-owner", function() {
          return Setup.assetsManager.createCrowdsaleCampaign.call(TOKEN_1, {from: nonOwner}).then(function(r) {
              assert.equal(r, ErrorsEnum.UNAUTHORIZED);
          });
        });

        it("Should be possible to start crowdsale campaign by asset-owner", function() {
          return Setup.assetsManager.createCrowdsaleCampaign.call(TOKEN_1, {from: tokenOwner}).then(function(r) {
              assert.equal(r, ErrorsEnum.OK);
              return Setup.assetsManager.createCrowdsaleCampaign(TOKEN_1, {from: tokenOwner})
                    .then((tx) => eventsHelper.extractEvents(tx, "CrowdsaleCampaignCreated"))
                    .then(event => campaign = event[0].args.campaign.valueOf())
                    .then(() => Setup.assetsManager.isAssetOwner.call(TOKEN_1, campaign))
                    .then((r) => assert.isTrue(r));
          });
        });

        it("Should not be possible to delete crowdsale campaign by non-asset-owner", function() {
            return Setup.assetsManager.deleteCrowdsaleCampaign.call(campaign, {from: nonOwner})
                .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED));
        });

        it("Should be possible to delete newly created and not started crowdsale campaign by asset-owner", function() {
            return Setup.assetsManager.deleteCrowdsaleCampaign.call(campaign, {from: tokenOwner})
                .then((r) => assert.equal(r, ErrorsEnum.OK))
                .then(() => Setup.assetsManager.deleteCrowdsaleCampaign(campaign, {from: tokenOwner}))
                .then((tx) => eventsHelper.extractEvents(tx, "CrowdsaleCampaignRemoved"))
                .then(event => deletedCampaign = event[0].args.campaign.valueOf())
                .then(() => assert.equal(deletedCampaign, campaign))
                .then(() => Setup.assetsManager.isAssetOwner.call(TOKEN_1, deletedCampaign))
                .then((r) => assert.isFalse(r));
        });
    })

    context("Ether crowdsale", function() {
        var campaign;

        it("Should be possible to start Ether crowdsale campaign by asset-owner", function() {
          return Setup.assetsManager.createCrowdsaleCampaign.call(TOKEN_1, {from: tokenOwner})
                .then((r) => assert.equal(r, ErrorsEnum.OK))
                .then(() => Setup.assetsManager.createCrowdsaleCampaign(TOKEN_1, {from: tokenOwner}))
                .then((tx) => eventsHelper.extractEvents(tx, "CrowdsaleCampaignCreated"))
                .then(event => campaignAddress = event[0].args.campaign.valueOf())
                .then(() => Setup.assetsManager.isAssetOwner.call(TOKEN_1, campaignAddress))
                .then((r) => assert.isTrue(r))
                .then(() => TimeLimitedCrowdsale.at(campaignAddress))
                .then(_campaign => campaign = _campaign)
                .then(() => campaign.lookupERC20Service.call())
                .then((erc20Manager) => assert.equal(Setup.erc20Manager.address, erc20Manager));
        });

        it("Should be not possible to send Ether to crowdsale with empty `fund`", function() {
          return campaign.fund.call()
                .then((r) => assert.equal(r, 0x0))
                .then(() => sendEtherPromise(accounts[0], campaign.address, 10))
                .then(() => assert.isTrue(false))
                .catch((error) => assert.isTrue(true));
        });

        it("Should be not possible to init Ether to campaign by non-owner", function() {
          return campaign.init.call("USD", 1000, 1000000, 1, 0, Date.now(), Date.now() + 6000, {from: nonOwner})
                .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
                .then(() => campaign.isRunning.call())
                .then((r) => assert.isFalse(r));
        });

        it("Should be not possible to set `fund` by non-asset-owner", function() {
          return campaign.enableEtherSale.call(fund, {from: nonOwner})
                .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
                .then(() => campaign.enableEtherSale(fund, {from: nonOwner}))
                .then(() => campaign.fund.call())
                .then((r) => assert.equal(r, 0x0));
        });

        it("Should be possible to set `fund` by asset-owner", function() {
          return campaign.enableEtherSale.call(fund, {from: tokenOwner})
                .then((r) => assert.equal(r, ErrorsEnum.OK))
                .then(() => campaign.enableEtherSale(fund, {from: tokenOwner}))
                .then((tx) => eventsHelper.extractEvents(tx, "SaleAgentRegistered"))
                .then((events) => {assert.equal(campaign.address, events[0].args.saleAgent); return events;})
                .then((events) => assert.equal(bytes32("ETH"), events[0].args.symbol))
                .then(() => campaign.getSalesAgent.call("ETH"))
                .then((r) => assert.equal(r, campaign.address))
                .then(() => campaign.fund.call())
                .then((r) => assert.equal(r, fund))
                .then(() => campaign.isRunning.call())
                .then((r) => assert.isFalse(r))
                .then(() => campaign.getPriceTicker.call())
                .then((r) => assert.equal(r, FakePriceTicker.address))

        });

        it("Should be possible to init campaign by owner", function() {
          return campaign.init("USD", 1000, 1000000, 1, 0, (Date.now() - 6000) / 1000, (Date.now() + 60000)/1000 , {from: tokenOwner})
                .then(() => campaign.getGoal.call())
                .then((goal) => {assert.equal("USD", web3.toUtf8(goal[0])); return goal;})
                .then((goal) => {assert.equal("1000", goal[1].toNumber()); return goal;})
                .then((goal) => {assert.equal("1000000", goal[2].toNumber()); return goal;})
                .then((goal) => {assert.equal("1", goal[3].toNumber()); return goal;})
                .then((goal) => {assert.equal("0", goal[4].toNumber()); return goal;})
                .then(() => campaign.isRunning.call())
                .then((r) => assert.isTrue(r))
        });

        it("Should be not possible to init campaign by owner once again", function() {
          return campaign.init("DJHF", 1, 10, 1, 0, Date.now() - 6000, Date.now() + 6000, {from: tokenOwner})
                .then(() => campaign.getGoal.call())
                .then((goal) => {assert.equal("USD", web3.toUtf8(goal[0])); return goal;})
                .then((goal) => {assert.equal("1000", goal[1].toNumber()); return goal;})
                .then((goal) => {assert.equal("1000000", goal[2].toNumber()); return goal;})
                .then((goal) => {assert.equal("1", goal[3].toNumber()); return goal;})
                .then((goal) => {assert.equal("0", goal[4].toNumber()); return goal;})
        });

        it("Should be possible to send Ether to crowdsale", function() {

          return sendEtherPromise(accounts[0], campaign.address, 10)
                .then(() => Setup.chronoBankPlatform.balanceOf.call(accounts[0], TOKEN_1))
                .then((balance) => assert.equal(10, balance));
        });

        it("Should be possible to send Ether to crowdsale twice", function() {
          return sendEtherPromise(accounts[0], campaign.address, 10)
                .then(() => Setup.chronoBankPlatform.balanceOf.call(accounts[0], TOKEN_1))
                .then((balance) => assert.equal(20, balance));
        });

        it("Should be not possible to withdraw Ether if running", function() {
          return campaign.refund()
                .then(() => assert.isTrue(false))
                .catch((error) => assert.isTrue(true));
        });

        let sendEtherPromise = (from, to, value) => {
            return new Promise(function (resolve, reject) {
                web3.eth.sendTransaction({from: accounts[0], to: campaign.address, value: 10, gas: 4700000}, (function (e, result) {
                    if (e != null) {
                        reject(e);
                    } else {
                        resolve(result);
                    }
                }));
            });
        };
    })
})
