const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol");
const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol");
const ChronoBankAssetWithFeeProxy = artifacts.require("./ChronoBankAssetWithFeeProxy.sol");
const ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol");
const ChronoBankAsset = artifacts.require("./ChronoBankAsset.sol");
const AssetsManager = artifacts.require("./AssetsManager.sol");
const Rewards = artifacts.require("./Rewards.sol");
const ERC20Manager = artifacts.require("./ERC20Manager.sol");
const LOCWallet = artifacts.require('./LOCWallet.sol');
const LOCManager = artifacts.require('./LOCManager.sol')

const bs58 = require("bs58");
const Buffer = require("buffer").Buffer;

module.exports = function(deployer, network, accounts) {
    const TIME_SYMBOL = 'TIME';
    const LHT_SYMBOL = 'LHT';
    if (network !== "main") {
        deployer
        .then(() => AssetsManager.deployed())
        .then(_manager => assetsManager = _manager)
        .then(() => ERC20Manager.deployed())
        .then(_erc20Manager => erc20Manager = _erc20Manager)
        .then(() => ChronoBankPlatform.deployed())
        .then(_chronoBankPlatform => chronoBankPlatform = _chronoBankPlatform)
        .then(() => {
            return ChronoBankAssetProxy.deployed()
            .then(_chronoBankAssetProxy => chronoBankAssetProxy = _chronoBankAssetProxy)
            .then(() => chronoBankPlatform.setProxy(ChronoBankAssetProxy.address, TIME_SYMBOL))
            .then(() => chronoBankAssetProxy.proposeUpgrade(ChronoBankAsset.address))
            .then(() => chronoBankAssetProxy.transfer(assetsManager.address, 1000000000000))
            .then(() => chronoBankPlatform.changeOwnership(TIME_SYMBOL, assetsManager.address))
            .then(() => {
                if (network !== "test") {
                    return assetsManager.addAsset(ChronoBankAssetProxy.address, TIME_SYMBOL, accounts[0])
                }
            })
        })
        .then(() => {
            return ChronoBankAssetWithFeeProxy.deployed()
            .then(_chronoBankAssetWithFeeProxy => chronoBankAssetWithFeeProxy = _chronoBankAssetWithFeeProxy)
            .then(() => ChronoBankAssetWithFee.deployed())
            .then(_chronoBankAssetWithFee => chronoBankAssetWithFee = _chronoBankAssetWithFee)
            .then(() => chronoBankPlatform.setProxy(ChronoBankAssetWithFeeProxy.address, LHT_SYMBOL))
            .then(() => chronoBankAssetWithFeeProxy.proposeUpgrade(ChronoBankAssetWithFee.address))
            .then(() => chronoBankAssetWithFee.setupFee(Rewards.address, 100))
            .then(() => chronoBankPlatform.addAssetPartOwner(LHT_SYMBOL, LOCWallet.address))
            .then(() => chronoBankPlatform.changeOwnership(LHT_SYMBOL, assetsManager.address))
            .then(() => {
                if (network !== "test") {
                    //https://ipfs.infura.io:5001
                    const lhtIconIpfsHash = "Qmdhbz5DTrd3fLHWJ8DY2wyAwhffEZG9MoWMvbm3MRwh8V";
                    return assetsManager.addAsset.call(chronoBankAssetWithFeeProxy.address, LHT_SYMBOL, LOCManager.address)
                    .then(_r => {
                        console.log("add lht:", _r);
                        return assetsManager.addAsset(chronoBankAssetWithFeeProxy.address, LHT_SYMBOL, LOCManager.address)
                    })
                    .then(() => erc20Manager.getTokenBySymbol.call(LHT_SYMBOL))
                    .then((asset) => {
                        return erc20Manager.setToken(asset[0], asset[0], asset[1], asset[2], asset[3], asset[4], ipfsHashToBytes32(lhtIconIpfsHash), asset[6])
                    })
                }
            })
        })
        .then(() => chronoBankPlatform.changeContractOwnership(assetsManager.address))
        .then(() => assetsManager.claimPlatformOwnership())
        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Bind assets: #done"))
    } else {
        deployer
        .then(() => chronoBankPlatform.addAssetPartOwner(LHT_SYMBOL, LOCWallet.address))
        .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] Bind assets: #done"))
    }
}

// Util function
// TODO: @ahiatsevich: copy-paste from
// ChronoBank/ChronoMint/src/utils/Web3Converter.js

let ipfsHashToBytes32 = (value) => {
    return `0x${Buffer.from(bs58.decode(value)).toString('hex').substr(4)}`
}
