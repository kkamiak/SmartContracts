var Exchange = artifacts.require("./Exchange.sol");
var FakeCoin = artifacts.require("./FakeCoin.sol");
var FakeCoin2 = artifacts.require("./FakeCoin2.sol");
var MultiEventsHistory = artifacts.require("./MultiEventsHistory.sol");
var ContractsManager = artifacts.require("./ContractsManager.sol");
var Reverter = require('./helpers/reverter');
var bytes32 = require('./helpers/bytes32');
var eventsHelper = require('./helpers/eventsHelper');
const ErrorsEnum = require("../common/errors");
const utils = require('./helpers/utils');

contract('Exchange', (accounts) => {
  let reverter = new Reverter(web3);
  afterEach('revert', reverter.revert);

  let exchange;
  let coin;
  let coin2;
  let delegate = '0x0';
  const BUY_PRICE = 1;
  const SELL_PRICE = 2;
  const Fee = 100;
  const BALANCE = 1000000;
  const BALANCE_ETH = 10000;

  let assertBalance = (address, expectedBalance) => {
    return coin.balanceOf(address)
      .then((balance) => assert.equal(balance, expectedBalance));
  };

  let assertEthBalance = (address, expectedBalance) => {
    return Promise.resolve()
      .then(() => web3.eth.getBalance(address))
      .then((balance) => assert.equal(balance.valueOf(), expectedBalance));
  };

  let getTransactionCost = (hash) => {
   return Promise.resolve().then(() =>
      hash.receipt.gasUsed);
  };

  before('Set Coin contract address', (done) => {
      var eventsHistory
      Exchange.new()
      .then(instance => exchange = instance)
      .then(() => MultiEventsHistory.deployed())
      .then(instance => eventsHistory = instance)
      .then(() => eventsHistory.authorize(exchange.address))
      .then(() => FakeCoin.deployed())
      .then(instance => coin = instance)
      .then(() => FakeCoin2.deployed())
      .then(instance => coin2 = instance)
      .then(() => coin.mint(accounts[0], BALANCE))
      .then(() => coin.mint(accounts[1], BALANCE))
      .then(() => coin.mint(exchange.address, BALANCE))
      .then(() => web3.eth.sendTransaction({to: exchange.address, value: BALANCE_ETH, from: accounts[0]}))
      .then(() => reverter.snapshot(done))
      .catch(done);
  });

  it('should receive the right contract address after init() call', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.asset())
      .then((asset) => assert.equal(asset, coin.address));
  });

  it('should not be possible to set another contract after first init() call', async() => {
      await exchange.init(ContractsManager.address, coin.address, coin2.address, Fee);

      try {
        await exchange.init(ContractsManager.address, '0x1', coin2.address, Fee)
        assert(false, "didn't throw");
      } catch (error) {
        return utils.ensureException(error);
     }

     let asset = await exchange.asset.call();
     assert.equal(asset, coin.address);
  });

  it('should not be possible to init by non-owner', () => {
    return exchange.init.call(ContractsManager.address, coin.address, coin2.address, Fee, {from: accounts[1]})
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => exchange.asset())
      .then((asset) => assert.equal(asset, '0x0000000000000000000000000000000000000000'));
  });

  it('should not be possible to set prices by non-owner', () => {
    let buyPrice = 10;
    let sellPrice = 20;
    return exchange.setPrices.call(buyPrice, sellPrice, {from: accounts[1]})
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => exchange.buyPrice())
      .then(_buyPrice => assert.notEqual(_buyPrice[0], buyPrice))
      .then(() => exchange.sellPrice())
      .then(_sellPrice => assert.notEqual(_sellPrice[0], sellPrice));
  });

  it('should be possible to set new prices', () => {
    let buyPrice = 5;
    let sellPrice = 6;
    let newBuyPrice = 10;
    let newSellPrice = 20;

    return exchange.setPrices.call(buyPrice, sellPrice)
      .then((r) => assert.equal(r, ErrorsEnum.OK))
      .then(() => exchange.setPrices(newBuyPrice, newSellPrice))
      .then(() => exchange.buyPrice())
      .then((buyPrice) => {
        assert.equal(buyPrice, newBuyPrice);
      })
      .then(() => exchange.sellPrice())
      .then((sellPrice) => {
        assert.equal(sellPrice, newSellPrice);
      });
  });

  it('should not be possible to set prices sellPrice < buyPrice', async() => {
    let newBuyPrice = 20;
    let newSellPrice = 10;

    try {
        await exchange.setPrices.call(newBuyPrice, newSellPrice);
        assert(false, "didn't throw");
    } catch (error) {
        return utils.ensureException(error);
    }
  });

  it('should not be possible to sell with price > buyPrice', () => {
    let balance;
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => web3.eth.getBalance(accounts[0]))
      .then((result) => balance = result)
      .then(() => exchange.sell.call(1, BUY_PRICE + 1))
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INVALID_PRICE))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE));
  });

  it('should not be possible to sell more than you have', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.sell.call(BALANCE + 1, BUY_PRICE))
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INSUFFICIENT_BALANCE))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE));
  });

  it('should not be possible to sell tokens if exchange eth balance is less than needed', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.sell.call(BALANCE + 1, BUY_PRICE))
      .then((r) => assert.notEqual(r, ErrorsEnum.OK))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH));
  });

  it('should be possible to sell tokens', () => {
    let tokenDecimals = 4;
    let sellAmount = 50 * Math.pow(10, tokenDecimals);
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.sell(sellAmount, BUY_PRICE))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH - (sellAmount) * BUY_PRICE / Math.pow(10, tokenDecimals)))
      .then(() => assertBalance(accounts[0], BALANCE - sellAmount))
      .then(() => assertBalance(exchange.address, BALANCE + sellAmount));
  });

  it('should not be possible to buy with price < sellPrice', () => {
    let balance;
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.buy.call(1, SELL_PRICE - 1, {value: SELL_PRICE})
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INVALID_PRICE))
      );
  });

  it('should not be possible to buy if exchange token balance is less than needed', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.buy.call(BALANCE + 1, SELL_PRICE, {value: (BALANCE + 1) * SELL_PRICE})
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INSUFFICIENT_BALANCE))
      );
  });

  it('should not be possible to buy if msg.value is less than _amount * _price', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.buy.call(1, SELL_PRICE, {value: SELL_PRICE - 1})
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INSUFFICIENT_ETHER_SUPPLY))
      );
  });

  it('should not be possible to buy if msg.value is greater than _amount * _price', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.buy.call(1, SELL_PRICE, {value: SELL_PRICE + 1})
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INSUFFICIENT_ETHER_SUPPLY))
      );
  });

  it('should not be possible to buy if _amount * _price overflows', async() => {
    await exchange.init(ContractsManager.address, coin.address, coin2.address, Fee);
    await exchange.setPrices(BUY_PRICE, web3.toBigNumber(2).pow(254));
    await exchange.setActive(true);

    try {
        await exchange.buy.call(2, web3.toBigNumber(2).pow(255), {value: 0});
        assert.isFalse(true);
    } catch (error) {}
  });

  it('should buy tokens with msg.value == _amount * _price', () => {
    let buyAmount = 10 * 10000;
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.buy(buyAmount, SELL_PRICE, {value: buyAmount * SELL_PRICE / 10000}))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH + (buyAmount * SELL_PRICE / 10000)))
      .then(() => assertBalance(accounts[0], BALANCE + buyAmount))
      .then(() => assertBalance(exchange.address, BALANCE - buyAmount));
  });

  it('should not be possible to withdraw tokens by non-owner', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.withdrawTokens.call(accounts[0], 10, {from: accounts[1]}))
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(accounts[1], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE));
  });

  it('should not be possible to withdraw if exchange token balance is less than _amount', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.withdrawTokens.call(accounts[0], BALANCE + 1))
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INSUFFICIENT_BALANCE))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE));
  });

  it('should withdraw tokens, process fee and fire WithdrawTokens event', () => {
    let withdrawValue = 10;
    let watcher;
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => {
        return exchange.withdrawTokens(accounts[1], withdrawValue);
      })
      .then((txHash) => eventsHelper.extractEvents(txHash, "ExchangeWithdrawTokens"))
      .then((events) => {
        assert.equal(events.length, 1);
        assert.equal(events[0].args.recipient.valueOf(), accounts[1]);
        assert.equal(events[0].args.amount.valueOf(), withdrawValue-1);
      })
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(coin2.address, 1))
      .then(() => assertBalance(accounts[1], BALANCE + withdrawValue-1))
      .then(() => assertBalance(exchange.address, BALANCE - withdrawValue))
  });

  it('should not be possible to withdraw all tokens by non-owner', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.setPrices(BUY_PRICE, SELL_PRICE))
      .then(() => exchange.setActive(true))
      .then(() => exchange.withdrawAllTokens.call(accounts[0], {from: accounts[1]}))
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(accounts[1], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE));
  });

  it('should not be possible to withdraw eth by non-owner', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.withdrawEth.call(accounts[0], 10, {from: accounts[1]}))
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH));
  });
  //
  it('should not be possible to withdraw if exchange eth balance is less than _amount', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.withdrawEth.call(accounts[0], BALANCE_ETH + 1))
      .then((r) => assert.equal(r, ErrorsEnum.EXCHANGE_INSUFFICIENT_ETHER_SUPPLY))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH));
  });

  it('should withdraw eth, process Fee, and fire WithdrawEth event', () => {
    let withdrawValue = 10;
    let withdrawTo = '0x0000000000000000000000000000000000000005';
    let watcher;
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.withdrawEth(withdrawTo, withdrawValue))
      .then((txHash) => eventsHelper.extractEvents(txHash, "ExchangeWithdrawEther"))
      .then((events) => {
        assert.equal(events.length, 1);
        assert.equal(events[0].args.recipient.valueOf(), withdrawTo);
        assert.equal(events[0].args.amount.valueOf(), withdrawValue-1);
      })
      .then(() => assertEthBalance(coin2.address, 1))
      .then(() => assertEthBalance(withdrawTo, withdrawValue-1))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH - withdrawValue));
  });

  it('should not be possible to withdraw all eth by non-owner', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.withdrawAllEth.call(accounts[0], {from: accounts[1]}))
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH));
  });

  it('should not be possible to withdraw all by non-owner', () => {
    return exchange.init(ContractsManager.address, coin.address, coin2.address, Fee)
      .then(() => exchange.withdrawAll.call(accounts[0], {from: accounts[1]}))
      .then((r) => assert.equal(r, ErrorsEnum.UNAUTHORIZED))
      .then(() => assertBalance(accounts[0], BALANCE))
      .then(() => assertBalance(exchange.address, BALANCE))
      .then(() => assertEthBalance(exchange.address, BALANCE_ETH));
  });
});
