const TimeHolder = artifacts.require("./TimeHolder.sol");
const Storage = artifacts.require('./Storage.sol');
const StorageManager = artifacts.require('./StorageManager.sol');
const ContractsManager = artifacts.require("./ContractsManager.sol");
const MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");
const ERC20Manager = artifacts.require("./ERC20Manager.sol");
const ChronoBankAssetProxy = artifacts.require("./ChronoBankAssetProxy.sol");

module.exports = function(deployer, network) {
    var withdrawnBalances = {}

      deployer.then(() => StorageManager.deployed())
      .then(_storageManager => _storageManager.blockAccess(TimeHolder.address, 'Deposits'))
      .then(() => MultiEventsHistory.deployed())
      .then(_history => _history.reject(TimeHolder.address))
      .then(() => ERC20Manager.deployed())
      .then(_erc20Manager => erc20manager = _erc20Manager)
      .then(() => erc20manager.getTokenAddresses())
      .then(_tokenAddresses => tokenAddresses = _tokenAddresses)
      .then(() => {
          let tokens = []
          for (let address in tokenAddresses) {
              tokens.push(ERC20Interface.at(address))
          }
          return Promise.all(tokens)
      })
      .then(_tokens => {
          let balances = []
          for (let token in _tokens) {
              balances.push(token.balanceOf(timeHolder.address).then(_balance => {
                  if (_balance > 0) {
                      withdrawnBalances[token.address] = {
                          token: token,
                          balance: _balance
                      }
                  }
              }))
          }

          return Promise.all(balances)
      })
      .then(() => console.log(JSON.stringify(withdrawnBalances, null, 3)))
      .then(() => TimeHolder.deployed())
      .then(_timeHolder => _timeHolder.destroy(tokenAddresses))

      .then(() => console.log("[MIGRATION] [50] TimeHolder destroyed: #done"))

      // deploying updated TimeHolder
      .then(() => deployer.deploy(TimeHolder, Storage.address, 'Deposits'))
        .then(() => StorageManager.deployed())
        .then((_storageManager) => _storageManager.giveAccess(TimeHolder.address, 'Deposits'))
        .then(() => {
            if (network == "main") {
               return ERC20Manager.deployed()
                  .then(_erc20Manager => _erc20Manager.getTokenBySymbol.call("TIME"))
                  .then(_token => _token[0]);
           } else {
               return ChronoBankAssetProxy.address;
           }
        })
        .then(_timeAddress => timeAddress = _timeAddress)
        .then(() => TimeHolder.deployed())
        .then(_timeHolder => timeHolder = _timeHolder)
        .then(() => timeHolder.init(ContractsManager.address, timeAddress))
        .then(() => MultiEventsHistory.deployed())
        .then(_history => _history.authorize(TimeHolder.address))
        .then(() => {
            if (network == "main") {
                return timeHolder.setLimit(100000000);
            }
        })
        .then(() => {
            var transferPromise = Promise.resolve()
            for (let withdrawnToken in withdrawnBalances) {
                transferPromise.then(() => withdrawnToken.token.transfer(timeHolder.address, withdrawnToken.balance))
            }

            return transferPromise
        })

        .then(() => console.log("[MIGRATION] [50] TimeHolder update: #done"))
}
