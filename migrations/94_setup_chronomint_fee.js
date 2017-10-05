const PlatformsManager = artifacts.require('./PlatformsManager.sol')
const ERC20Manager = artifacts.require('./ERC20Manager.sol')
const ChronoBankAssetWithFee = artifacts.require('./ChronoBankAssetWithFee.sol')
const ChronoBankAssetWithFeeProxy = artifacts.require('./ChronoBankAssetWithFeeProxy.sol')
const RewardsWallet = artifacts.require('./RewardsWallet.sol')

module.exports = function(deployer, network, accounts) {
    //----------
    const LHT_SYMBOL = 'LHT'
    const FEE_VALUE = 100 // 1%

    const systemOwner = accounts[0]

    deployer
    .then(() => PlatformsManager.deployed())
    .then(_platformsManager => platformsManager = _platformsManager)
    .then(() => ERC20Manager.deployed())
    .then(_erc20Manager => _erc20Manager.getTokenAddressBySymbol.call(LHT_SYMBOL))
    .then(_tokenAddr => ChronoBankAssetWithFeeProxy.at(_tokenAddr))
    .then(_token => _token.getLatestVersion.call())
    .then(_assetAddr => ChronoBankAssetWithFee.at(_assetAddr))
    .then(_asset => {
        return Promise.resolve()
        .then(() => _asset.claimContractOwnership())
        .then(() => _asset.setupFee(RewardsWallet.address, FEE_VALUE))
    })
}
