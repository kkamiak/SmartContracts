const ChronoBankAssetWithFee = artifacts.require("./ChronoBankAssetWithFee.sol");
const ChronoBankAssetWithFeeProxy = artifacts.require("./ChronoBankAssetWithFeeProxy.sol");
const RewardsWallet = artifacts.require('./RewardsWallet.sol')

module.exports = function(deployer,network) {
    const FEE_VALUE = 100 // 1%

    deployer
      .then(() => ChronoBankAssetWithFee.deployed())
      .then(_asset => assetWithFee = _asset)
      .then(() => assetWithFee.init(ChronoBankAssetWithFeeProxy.address))
      .then(() => assetWithFee.setupFee(RewardsWallet.address, FEE_VALUE))
      .then(() => ChronoBankAssetWithFeeProxy.deployed())
      .then(_proxy => proxyWithFee = _proxy)
      .then(() => proxyWithFee.proposeUpgrade(assetWithFee.address))
      .then(() => proxyWithFee.commitUpgrade())

      .then(() => console.log("[MIGRATION] [" + parseInt(require("path").basename(__filename)) + "] ChronoBankAssetWithFee (LHT) setup and upgrade: #done"))
}
