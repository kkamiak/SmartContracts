const ChronoBankAssetProxy = artifacts.require('./ChronoBankAssetProxy.sol')
const ChronoBankPlatform = artifacts.require('./ChronoBankPlatform.sol')
const Setup = require('../setup/setup')
const eventsHelper = require('./helpers/eventsHelper')
const ErrorsEnum = require("../common/errors")
const Reverter = require('./helpers/reverter')
const AssetsManager = artifacts.require('./AssetsManager.sol')


contract('AssetsManager high-load with assets', function (accounts) {
    const contractOwner = accounts[0]
    const owner = accounts[0]
    const owner1 = accounts[1]
    const owner2 = accounts[2]
    const owner3 = accounts[3]
    const owner4 = accounts[4]
    const owner5 = accounts[5]
    const nonOwner = accounts[6]

    const reverter = new Reverter(web3)

    function createNewAsset(symbol, name, description, assetOwner) {
        return Setup.assetsManager.requestNewAsset(symbol, { from: assetOwner }).then(tx => {
            let event = eventsHelper.extractEvents(tx, "NewAssetRequested")[0]
            assert.isDefined(event)

            return Setup.assetsManager.redeemNewAsset(event.args.requestId, name, description, 10000, 8, false, false, { from: assetOwner })
        })
        .then(tx => {
            let event = eventsHelper.extractEvents(tx, "AssetCreated")[0]
            assert.isDefined(event)
        })
    }

    function createBunchOfAssets(numberOfAssets, symbolTemplate, descriptionTemplate, assetOwner) {
        const tokenSymbols = Array(numberOfAssets).fill(0).map((_,i) => symbolTemplate + (i + 1))
        const tokenDescriptions = tokenSymbols.map((e,i) => descriptionTemplate + e)

        var chain = Promise.resolve()
        for (var idx = 0; idx < numberOfAssets; ++idx) {
            (function () {
                var symbol = tokenSymbols[idx]
                var description = tokenDescriptions[idx]
                chain = chain.then(() => createNewAsset(symbol, symbol, description, assetOwner))
            })()
        }
        return chain
    }

    var initialAssetsCount = 0

    const TOKEN_SYMBOL_TEMPLATE = "TOKEN"
    const TOKEN_DESCRIPTION_TEMPLATE = "Description of ";

    before("setup", function (done) {
        Setup.setup(function(error) {
            return Setup.assetsManager.getAssetsSymbolsCount.call().then(_assetsCount => initialAssetsCount = parseInt(_assetsCount.valueOf())).then(() => {
                done(error)
            })
            .catch(error => done(error))
        })
    })

    context.skip('assets for single user', function () {
        it("should snapshot state", reverter.snapshot)

        const assetsCount = 200

        it("can create 200 more assets for one user", function () {
            return createBunchOfAssets(assetsCount, TOKEN_SYMBOL_TEMPLATE, TOKEN_DESCRIPTION_TEMPLATE, owner).then(() => {
                return Setup.assetsManager.getAssetsSymbolsCount.call()
            })
            .then(_updatedAssetsCount => {
                console.log(_updatedAssetsCount);
                assert.equal(_updatedAssetsCount, assetsCount + initialAssetsCount)
            })
        })

        it("should revert state", reverter.revert)
    })

    context.skip('assets for multiple users', function () {

        it("should snapshot state", reverter.snapshot)

        function createBunchOfAssetsForAccounts(accounts, numberOfAssets, symbolTemplate, descriptionTemplate, templateMultiplier) {
            const tokenSymbolTemplates = Array(accounts.length).fill(0).map((_,i) => symbolTemplate + (i + 1) * templateMultiplier)
            const tokenDescriptionTemplates = tokenSymbolTemplates.map((e,i) => descriptionTemplate + e)

            var minPrice = Number.MAX_VALUE
            var maxPrice = 0
            var sumPrice = 0

            var chain = Promise.resolve()
            for (var idx = 0; idx < accounts.length; ++idx) {
                (function () {
                    var tokenSymbolTemplate = tokenSymbolTemplates[idx]
                    var tokenDescriptionTemplate = tokenDescriptionTemplates[idx]
                    var assetsOwner = accounts[idx]
                    var initialAccount = web3.eth.getBalance(assetsOwner)
                    chain = chain.then(() => createBunchOfAssets(numberOfAssets, tokenSymbolTemplate, tokenDescriptionTemplate, assetsOwner)).then(() => {
                        let paidPrice = initialAccount - web3.eth.getBalance(assetsOwner);
                        sumPrice += paidPrice
                        minPrice = Math.min(minPrice, paidPrice)
                        maxPrice = Math.max(maxPrice, paidPrice)
                    })
                })()
            }
            return chain.then(() => {
                const totalAssetsCount = accounts.length * numberOfAssets
                const biasThreshold = 0.05
                let diff = maxPrice - minPrice
                let average = sumPrice / totalAssetsCount
                let bias = diff / average * 100

                console.log("-- Bunch of assets creating:");
                console.log("Diff: " + diff);
                console.log("Average: " + average);
                console.log("----------");
                console.log("Bias: %" + bias + "; threshold: %" + biasThreshold);
                assert.isBelow(bias, biasThreshold)
            })
        }

        it("should create 25 assets for  each user available for the test", function () {
            const multiplier = 1000
            const assetsCount = 1

            let availableAccounts = accounts.slice(1, 20)
            availableAccounts.shift()
            return createBunchOfAssetsForAccounts(availableAccounts, assetsCount, TOKEN_SYMBOL_TEMPLATE, TOKEN_DESCRIPTION_TEMPLATE, multiplier).then(() => {
                return Setup.assetsManager.getAssetsSymbolsCount.call()
                .then(_assetsCount => {
                    assert.equal(parseInt(_assetsCount.valueOf()), availableAccounts.length * assetsCount + initialAssetsCount)
                })
            })
        }).timeout(300000 * 15)

        it("should revert state", reverter.revert)


        function checkDetachPlatform(account) {
            return Setup.assetsPlatformRegistry.getPlatformForUser.call(account).then(_platformAddress => {
                return Setup.assetsPlatformRegistry.detachPlatform.call(_platformAddress, { from: account }).then(_code => {
                    assert.equal(_code, ErrorsEnum.OK)
                    let initialBalance = web3.eth.getBalance(account)
                    return Setup.assetsPlatformRegistry.detachPlatform(_platformAddress, { from: account }).then(() => {
                        let paidPrice = initialBalance - web3.eth.getBalance(account)
                        return { platform: _platformAddress, price: paidPrice };
                    })
                })
            })
        }

        function checkAttachPlatform(platformAddress, account) {
            return Setup.assetsPlatformRegistry.attachPlatform.call(platformAddress, account).then(_code => {
                assert.equal(_code, ErrorsEnum.OK)

                let initialBalance = web3.eth.getBalance(account)
                return Setup.assetsPlatformRegistry.attachPlatform(platformAddress, account).then(() => {
                    let paidPrice = initialBalance - web3.eth.getBalance(account)
                    return { price: paidPrice }
                })
            })
        }

        it("should have the same gas spent for 25 users to detach platform as of 1 user", function () {
            const initialNumberOfUsers = 2
            const lastNumberOfUsers = 100
            const assetsCount = 2
            const multiplier = 100

            const startAccountIndex = 1
            const firstRoundLastAccountIndex = startAccountIndex + initialNumberOfUsers
            let firstRoundAccounts = accounts.slice(startAccountIndex, firstRoundLastAccountIndex)
            let secondRoundAccounts = accounts.slice(firstRoundLastAccountIndex, firstRoundLastAccountIndex + lastNumberOfUsers)
            let singlePriceResults
            let manyPriceResults
            return createBunchOfAssetsForAccounts(firstRoundAccounts, assetsCount, TOKEN_SYMBOL_TEMPLATE, TOKEN_DESCRIPTION_TEMPLATE, multiplier).then(() => {
                return checkDetachPlatform(firstRoundAccounts[0]).then(_results => {
                    console.log("-- Single platform detaching: " + JSON.stringify(_results, null, 3));
                    singlePriceResults = _results
                })
            })
            .then(() => {
                let manyMultiplier = multiplier * 10
                return createBunchOfAssetsForAccounts(secondRoundAccounts, assetsCount, TOKEN_SYMBOL_TEMPLATE, TOKEN_DESCRIPTION_TEMPLATE, manyMultiplier).then(() => {
                    return checkDetachPlatform(secondRoundAccounts[0]).then(_results => {
                        console.log("-- Multiple platform detaching: " + JSON.stringify(_results, null, 3));
                        manyPriceResults = _results
                    })
                })
            })
            .then(() => {
                const biasThreshold = 0.05
                let average = (singlePriceResults.price + manyPriceResults.price) / 2
                let diff = Math.abs(singlePriceResults.price - manyPriceResults.price)
                let bias = diff / average * 100
                console.log("--------Total--------");
                console.log("Diff: " + diff);
                console.log("Average: " + average);
                console.log("----------");
                console.log("Bias: %" + bias + "; threshold: %" + biasThreshold);
                assert.isBelow(bias, biasThreshold)
            })
        })
    })
})
