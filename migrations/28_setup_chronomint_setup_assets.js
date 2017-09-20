const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol");
const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol");
const ChronoBankAssetWithFeeProxy = artifacts.require("./ChronoBankAssetWithFeeProxy.sol");
const ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol");
const ChronoBankAsset = artifacts.require("./ChronoBankAsset.sol");
const AssetsManager = artifacts.require("./AssetsManager.sol");
const AssetsPlatformRegistry = artifacts.require("./AssetsPlatformRegistry");
const Rewards = artifacts.require("./Rewards.sol");
const ERC20Manager = artifacts.require("./ERC20Manager.sol");
const LOCManager = artifacts.require('./LOCManager.sol');
const bs58 = require("bs58");
const BigNumber = require("bignumber.js");
const Buffer = require("buffer").Buffer;
const bytes32fromBase58 = require('../test/helpers/bytes32fromBase58')

module.exports = function(deployer,network, accounts) {
    const TIME_SYMBOL = 'TIME'; // TODO: AG(21-06-2017) copy-paste warn
    const TIME_NAME = 'Time Token';
    const TIME_DESCRIPTION = 'ChronoBank Time Shares';

    const LHT_SYMBOL = 'LHT';
    const LHT_NAME = 'Labour-hour Token';
    const LHT_DESCRIPTION = 'ChronoBank Lht Assets';

    const BASE_UNIT = 8;
    const IS_REISSUABLE = true;
    const IS_NOT_REISSUABLE = false;
    const WITH_FEE = true;
    const WITHOUT_FEE = false;

    const owner = accounts[0]

    // https://ipfs.infura.io:5001
    const lhtIconIpfsHash = "Qmdhbz5DTrd3fLHWJ8DY2wyAwhffEZG9MoWMvbm3MRwh8V";

    if (!AssetsManager.isDeployed()) {
        return;
    }

    deployer
      .then(() => AssetsManager.deployed())
      .then(_assetsManager => assetsManager = _assetsManager)
      .then(() => AssetsPlatformRegistry.deployed())
      .then(_assetsPlatformRegistry => assetsPlatformRegistry = _assetsPlatformRegistry)
      .then(() => ERC20Manager.deployed())
      .then(_erc20Manager => erc20Manager = _erc20Manager)
      .then(() => {
          if (ChronoBankPlatform.isDeployed()) {
              return ChronoBankPlatform.deployed()
              .then(_platform => platform = _platform)
              .then(() => assetsPlatformRegistry.getPlatformsDelegatedOwner())
              .then(_delegatedOwnerAddress => platform.changeContractOwnership(_delegatedOwnerAddress))
              .then(() => assetsPlatformRegistry.attachPlatform(ChronoBankPlatform.address, accounts[0]))
          }
      })

      .then(() => {
          return assetsManager.requestNewAsset(TIME_SYMBOL)
          .then(tx => {
              let newAssetRequestedEvent = tx.logs.find((ev) => ev.event.toLowerCase() == "NewAssetRequested".toLowerCase())
              if (newAssetRequestedEvent == undefined) {
                  // TODO: better approach appreciated
                  console.error("Error while requesting new asset creation for " + TIME_SYMBOL)
                  throw "NewAssetRequested for " + TIME_SYMBOL
              }
              let requestId = newAssetRequestedEvent.args.requestId
              return assetsManager.redeemNewAsset(requestId, TIME_NAME, TIME_DESCRIPTION, 1000000000000, BASE_UNIT, IS_NOT_REISSUABLE, WITHOUT_FEE)
          })
          .then(() => assetsManager.requestNewAsset(LHT_SYMBOL))
          .then(tx => {
              let newAssetRequestedEvent = tx.logs.find((ev) => ev.event.toLowerCase() == "NewAssetRequested".toLowerCase())
              if (newAssetRequestedEvent == undefined) {
                  // TODO: better approach appreciated
                  console.error("Error while requesting new asset creation for " + LHT_SYMBOL)
                  throw "NewAssetRequested for " + LHT_SYMBOL
              }
              let requestId = newAssetRequestedEvent.args.requestId
              return assetsManager.redeemNewAsset(requestId, LHT_NAME, LHT_DESCRIPTION, 0, BASE_UNIT, IS_REISSUABLE, WITH_FEE)
          }).then(tx => {
              let newAssetCreatedEvent = tx.logs.find((ev) => ev.event.toLowerCase() == "AssetCreated".toLowerCase())
              if (newAssetCreatedEvent == undefined) {
                  // TODO: better approach appreciated
                  console.error("Error while redeeming new asset for " + LHT_SYMBOL)
                  throw "AssetCreated for " + LHT_SYMBOL
              }

              return ChronoBankAssetWithFeeProxy.at(newAssetCreatedEvent.args.token)
          })
          .then(_chronoBankAssetWithFeeProxy => {
              return _chronoBankAssetWithFeeProxy.getLatestVersion.call().then(_address => ChronoBankAssetWithFee.at(_address))
          })
          .then(_chronoBankAssetWithFee => {
              // setup asset's fee and fee address
              return assetsManager.resignAssetContractOwnership(LHT_SYMBOL, owner)
              .then(() => _chronoBankAssetWithFee.claimContractOwnership())
              .then(() => _chronoBankAssetWithFee.setupFee(Rewards.address, 100))
              .then(() => _chronoBankAssetWithFee.changeContractOwnership(assetsManager.address))
              .then(() => assetsManager.captureAssetContractOwnership(LHT_SYMBOL))
          })
      })
      .then(() => {
          return assetsPlatformRegistry.addPlatformOwner(LOCManager.address)
              .then(() => erc20Manager.getTokenBySymbol.call(LHT_SYMBOL))
              .then(asset => {
                  if (network !== "test") {
                      return erc20Manager.setToken(asset[0], asset[0], asset[1], asset[2], asset[3], asset[4], bytes32fromBase58(lhtIconIpfsHash), asset[6])
                  }
              })
      })
      .then(() => console.log("[MIGRATION] [28] Setup Assets: #done"))
  }
