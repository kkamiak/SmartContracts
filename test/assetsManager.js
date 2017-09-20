const ChronoBankAssetProxy = artifacts.require('./ChronoBankAssetProxy.sol')
const ChronoBankPlatform = artifacts.require('./ChronoBankPlatform.sol')
const Setup = require('../setup/setup')
const eventsHelper = require('./helpers/eventsHelper')
const ErrorsEnum = require("../common/errors")

contract('Assets Manager', function(accounts) {
    const contractOwner = accounts[0]
    const owner = accounts[0]
    const owner1 = accounts[1]
    const owner2 = accounts[2]
    const owner3 = accounts[3]
    const owner4 = accounts[4]
    const owner5 = accounts[5]
    const nonOwner = accounts[6]

    var unix = Math.round(+new Date()/1000)

    let utils = web3._extend.utils

    const zeroAddress = '0x' + utils.padLeft(utils.toHex("0").substr(2), 40)

    const TIME_SYMBOL = 'TIME'
    const LHT_SYMBOL = 'LHT'

    const testAssetSymbol = utils.padRight(utils.fromAscii('TEST_TOKEN'), 66)
    const testAssetSymbol1 = utils.padRight(utils.fromAscii('TEST_TOKEN1'), 66)
    const testAssetSymbol2 = utils.padRight(utils.fromAscii('TEST_TOKEN2'), 66)

    before('setup', function(done) {

        Setup.setup(done)

    })

    context("pre-check", function () {
        it("should have the same address of AssetsPlatformRegistry from Setup and AssetsManager", function () {
            return Setup.assetsManager.getPlatformRegistry.call()
            .then(_platformRegistryAddress => assert.equal(_platformRegistryAddress, Setup.assetsPlatformRegistry.address))
        })

        it("should have as platforms delegated owner of AssetsPlatformRegistry AssetsManager contract", function() {
            return Setup.assetsPlatformRegistry.getPlatformsDelegatedOwner.call()
            .then(_delegatedOwnerAddress => assert.equal(_delegatedOwnerAddress, Setup.assetsManager.address))
        })
    })

    context("AssetManager", function () {
        let assets = [testAssetSymbol, testAssetSymbol1, testAssetSymbol2]
        let requestIdsToAssetsSymbols = {}
        let requestIds = []

        it("should return different request identifiers for all invocations for non-existed asset symbols", function () {
            return Setup.assetsManager.requestNewAsset.call(testAssetSymbol).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.OK)

                return Setup.assetsManager.requestNewAsset(testAssetSymbol).then(tx => {
                    let event = eventsHelper.extractEvents(tx, "NewAssetRequested")[0]
                    assert.isDefined(event)

                    let requestId = event.args.requestId
                    assert.isAbove(requestId, 0)

                    requestIds.push(requestId)

                    assert.equal(event.args.symbol, testAssetSymbol)
                    requestIdsToAssetsSymbols[requestId] = testAssetSymbol
                })
            }).then(() => Setup.assetsManager.requestNewAsset.call(testAssetSymbol1)).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.OK)

                return Setup.assetsManager.requestNewAsset(testAssetSymbol1).then(tx => {
                    let event = eventsHelper.extractEvents(tx, "NewAssetRequested")[0]
                    assert.isDefined(event)

                    let requestId = event.args.requestId
                    assert.isAbove(requestId, 0)
                    assert.notInclude(requestIds, requestId)

                    requestIds.push(requestId)

                    assert.equal(event.args.symbol, testAssetSymbol1)
                    requestIdsToAssetsSymbols[requestId] = testAssetSymbol1
                })
            }).then(() => Setup.assetsManager.requestNewAsset.call(testAssetSymbol, { from: owner5 })).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.OK)

                return Setup.assetsManager.requestNewAsset(testAssetSymbol, { from: owner5 }).then(tx => {
                    let event = eventsHelper.extractEvents(tx, "NewAssetRequested")[0]
                    assert.isDefined(event)

                    let requestId = event.args.requestId
                    assert.isAbove(requestId, 0)
                    assert.notInclude(requestIds, requestId)
                    assert.equal(event.args.symbol, testAssetSymbol)
                })
            })
        })

        it("should be able to exchange requestId and redeem an Asset on user's platform ", function () {
            let requestId = requestIds[0];
            let symbol = requestIdsToAssetsSymbols[requestId]
            let balance = 10

            assert.isDefined(symbol)

            return Setup.assetsManager.redeemNewAsset.call(requestId, symbol, "Test description", balance, 2, true, false).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.OK)

                return Setup.assetsManager.redeemNewAsset(requestId, symbol, "Test description", balance, 2, true, false).then(tx => {
                    let event = eventsHelper.extractEvents(tx, "AssetCreated")[0]
                    assert.isDefined(event)
                    assert.equal(event.args.symbol, symbol)
                })
            }).then(() => {
                return Setup.assetsManager.getAssetBalance.call(symbol).then(_balance => assert.equal(_balance, balance))
            })
        })

        it("should return error when proposed asset symbol is already existed in assets manager", function () {
            let symbol = assets[0]

            return Setup.assetsManager.requestNewAsset.call(symbol).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.ASSETS_TOKEN_EXISTS)
            })
        })

        it("can create new Asset by other user on its own platform", function () {
            let symbol = testAssetSymbol1
            var platform

            return Setup.assetsManager.requestNewAsset.call(symbol, { from: owner2 }).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.OK)

                return Setup.assetsManager.requestNewAsset(symbol, { from: owner2 }).then(tx => {
                    let event = eventsHelper.extractEvents(tx, "NewAssetRequested")[0]
                    let requestId = event.args.requestId
                    assert.isDefined(event)
                    assert.equal(event.args.symbol, symbol)
                    platform = event.args.platform
                    return Promise.resolve(requestId)
                }).then(_requestId => Setup.assetsManager.redeemNewAsset(_requestId, "SecondToken", "Yet another description", 100, 8, true, false, { from: owner2}))
            })
            .then(() => Setup.assetsPlatformRegistry.getRegisteredPlatforms.call())
            .then(_platforms => assert.include(_platforms, platform))
        })

        it("should have different platforms for different owners", function () {
            return Setup.assetsPlatformRegistry.getPlatform.call({from: owner}).then(_platformForOwner => {
                return Setup.assetsPlatformRegistry.getPlatform.call({from: owner2}).then(_platformForOwner2 => {
                    assert.notEqual(_platformForOwner, zeroAddress)
                    assert.notEqual(_platformForOwner2, zeroAddress)
                    assert.notEqual(_platformForOwner, _platformForOwner2)
                })
            })
        })

        it("should not allow to redeem new asset with not existed requestId", function () {
            let tryRequestId = 100
            return Setup.assetsManager.redeemNewAsset.call(tryRequestId, "Noname", "Not requested asset", 0, 8, false, false).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.ASSETS_CANNOT_FIND_REQUEST_FOR_CREATION)
            })
        })

        it("should not allow to redeem new asset twice with the same requestId", function () {
            let tryRequestId = requestIds[0]
            return Setup.assetsManager.redeemNewAsset.call(tryRequestId, "TKN", "Already exist", 0, 8, false, false).then(_errorCode => {
                assert.equal(_errorCode, ErrorsEnum.ASSETS_CANNOT_FIND_REQUEST_FOR_CREATION)
            })
        })

        it("should know a creator of Asset as an owner", function () {
            return Setup.assetsPlatformRegistry.isAssetOwner.call(testAssetSymbol, owner).then(_result => {
                assert.isOk(_result)
            }).then(() => Setup.assetsPlatformRegistry.isAssetOwner.call(testAssetSymbol1, owner2)).then(_result => {
                assert.isOk(_result)
            })
        })

        it("shouldn't know other user as an owner of Asset", function () {
            return Setup.assetsPlatformRegistry.isAssetOwner.call(testAssetSymbol, owner1).then(_result => {
                assert.isNotOk(_result)
            })
        })

        it("should be able to return a list of Asset owners and should contain an owner", function () {
            return Setup.assetsPlatformRegistry.getAssetOwners.call(testAssetSymbol).then(_owners => {
                assert.include(_owners, owner)
            })
        })

        it("should be able to return a list of all created assets symbols", function () {
            return Setup.assetsManager.getAssetsSymbols.call().then(_assets => {
                assert.isAtLeast(_assets.length, 2)
                assert.include(_assets, testAssetSymbol)
                assert.include(_assets, testAssetSymbol1)
            })
        })

        it("should show 1000000000000 TIME balance", function () {
            return Setup.assetsManager.getAssetBalance.call('TIME').then(function (r) {
                assert.equal(r, 1000000000000)
            })
        })

        // it("should show assets symbol owner by address provided", function () {
        //     return Setup.assetsManager.getAssetsForOwner.call(owner).then(function (r) {
        //         assert.equal(r.length, 2)
        //     })
        // })

        it("should be able to send 100 TIME to owner", function () {
            return Setup.assetsManager.sendAsset.call(TIME_SYMBOL, owner, 100).then(function (r) {
                return Setup.assetsManager.sendAsset(TIME_SYMBOL, owner, 100, {
                    from: accounts[0],
                    gas: 3000000
                }).then(function () {
                    assert.isOk(r)
                })
            })
        })

        it("check Owner has 100 TIME", function () {
            return Setup.erc20Manager.getTokenAddressBySymbol.call(TIME_SYMBOL)
            .then(_address => ChronoBankAssetProxy.at(_address))
            .then(_chronoBankAssetProxy => _chronoBankAssetProxy.balanceOf.call(owner))
            .then(function (r) {
                assert.equal(r, 100)
            })
        })

        it("should be able to send 100 TIME to owner1", function () {
            return Setup.assetsManager.sendAsset.call(TIME_SYMBOL, owner1, 100, { from: owner }).then(function (r) {
                return Setup.assetsManager.sendAsset(TIME_SYMBOL, owner1, 100, {
                    from: owner,
                    gas: 3000000
                }).then(function () {
                    assert.isOk(r)
                })
            })
        })

        it("check Owner1 has 100 TIME", function () {
            return Setup.erc20Manager.getTokenAddressBySymbol.call(TIME_SYMBOL)
            .then(_address => ChronoBankAssetProxy.at(_address))
            .then(_chronoBankAssetProxy => _chronoBankAssetProxy.balanceOf.call(owner1))
            .then(function (r) {
                assert.equal(r, 100)
            })
        })

        context("assets", function () {
            it("should have an asset in erc20 manager ", function () {
                return Setup.erc20Manager.getTokenAddressBySymbol.call(testAssetSymbol1).then(_tokenAddress => {
                    return Setup.assetsPlatformRegistry.getAssetOwners.call(testAssetSymbol1).then(_owners => {
                        assert.include(_owners, owner2)
                    })
                })
            })
        })
    })


    context("AssetsPlatformRegistry", function() {
        context("registered platforms", function () {
            it("should be able to define user as an owner of an Asset", function () {
                return Setup.assetsPlatformRegistry.isAssetOwner.call(testAssetSymbol, owner).then(_isOwner => assert.isOk(_isOwner))
            })

            it("should be able to return chronobank platform for an owner", function () {
                return Setup.assetsPlatformRegistry.getPlatform.call({ from: owner }).then(_platform => {
                    assert.notEqual(_platform, zeroAddress)
                })
            })

            it("should not return platform for a user who didn't create any assets", function () {
                return Setup.assetsPlatformRegistry.getPlatform.call({ from: nonOwner }).then(_platform => {
                    assert.equal(_platform, zeroAddress)
                })
            })

            it("should return valid number of registered platforms in a registry", function () {
                return Setup.assetsPlatformRegistry.getRegisteredPlatforms.call().then(_platforms => {
                    assert.lengthOf(_platforms, 3)
                })
            })
        })

        context("detaching/attaching", function () {
            let platformOwner = owner2
            let assetFromDetachedPlatform = testAssetSymbol1
            let detachingPlatform
            let attachingPlatform

            context("detaching", function () {
                it("should have a platform to detach", function () {
                    return Setup.assetsPlatformRegistry.getPlatformForUser.call(platformOwner).then(_platform => {
                        assert.notEqual(_platform, zeroAddress)
                        detachingPlatform = _platform
                    })
                })

                it("should be able to detach chronobank platform", function () {
                    return Setup.assetsPlatformRegistry.detachPlatform.call(detachingPlatform, { from: platformOwner }).then(_code => {
                        assert.equal(_code, ErrorsEnum.OK)

                        return Setup.assetsPlatformRegistry.detachPlatform(detachingPlatform, { from: platformOwner }).then(tx => {
                            let event = eventsHelper.extractEvents(tx, "PlatformDetached")[0]
                            assert.isDefined(event)

                            assert.equal(event.args.platform, detachingPlatform)
                            assert.equal(event.args.to, platformOwner)
                            return ChronoBankPlatform.at(detachingPlatform).then(_platform => _platform.claimContractOwnership({ from: platformOwner }))
                        })
                    })
                    .then(() => Setup.assetsPlatformRegistry.getRegisteredPlatforms.call())
                    .then(_platforms => assert.notInclude(_platforms, detachingPlatform))
                })

                it("should not allow to detach the same platform twice by platform owner", function () {
                    return Setup.assetsPlatformRegistry.detachPlatform.call(detachingPlatform, { from: platformOwner }).then(_code => {
                        assert.equal(_code, ErrorsEnum.UNAUTHORIZED)
                    })
                })

                it("should not allow to detach the same platform twice by contract owner", function () {
                    return Setup.assetsPlatformRegistry.detachPlatform.call(detachingPlatform, { from: contractOwner }).then(_code => {
                        assert.equal(_code, ErrorsEnum.PLATFORM_REGISTRY_PLATFORM_IS_ALREADY_DETACHED)
                    })
                })

                it("should not have any owner after detaching", function () {
                    return Setup.assetsPlatformRegistry.getAssetOwners.call(assetFromDetachedPlatform).then(_owners => {
                        assert.lengthOf(_owners, 0)
                    })
                })
            })


            context("attaching", function () {
                it("should has address of attaching platform", function () {
                    attachingPlatform = detachingPlatform
                    assert.isDefined(attachingPlatform)
                })

                it("should not allow to attach platform for a user who already owns a platform in a registry", function () {
                    return Setup.assetsPlatformRegistry.attachPlatform.call(attachingPlatform, owner, { from: contractOwner })
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.PLATFORM_REGISTRY_OWNER_CANNOT_OWN_MORE_THAN_ONE_PLATFORM)
                    })
                })

                it("should be able to attach platform", function () {
                    return ChronoBankPlatform.at(attachingPlatform)
                    .then(_platform => {
                        return Setup.assetsPlatformRegistry.getPlatformsDelegatedOwner.call()
                        .then(_delegatedOwner => _platform.changeContractOwnership(_delegatedOwner, { from: platformOwner }))
                    })
                    .then(() => Setup.assetsPlatformRegistry.attachPlatform.call(attachingPlatform, platformOwner, { from: contractOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.OK)

                        return Setup.assetsPlatformRegistry.attachPlatform(attachingPlatform, platformOwner, { from: contractOwner }).then(tx => {
                            let event = eventsHelper.extractEvents(tx, "PlatformAttached")[0]
                            assert.isDefined(event)
                            assert.equal(event.args.platform, attachingPlatform)
                            assert.equal(event.args.owner, platformOwner)
                        })
                    })
                    .then(() => Setup.assetsPlatformRegistry.getRegisteredPlatforms.call())
                    .then(_platforms => {
                        assert.include(_platforms, attachingPlatform)
                    })
                })

                it("should not be able to add the same platform twice", function () {
                    return Setup.assetsPlatformRegistry.attachPlatform.call(attachingPlatform, platformOwner, { from: contractOwner }).then(_code => {
                        assert.equal(_code, ErrorsEnum.PLATFORM_REGISTRY_PLATFORM_IS_ALREADY_ATTACHED)
                    })
                })

                let doubledTokenName = "DBLT"
                let doubledTokenOwner = owner3
                let doubledTargetPlatform
                let otherOwner = owner2

                it("should not allow to add platform which has symbols already presented in a registry", function () {
                    // create an asset with token name for the brand new platform
                    return Setup.assetsManager.requestNewAsset(doubledTokenName, { from: doubledTokenOwner })
                    .then(tx => {
                        let event = eventsHelper.extractEvents(tx, "NewAssetRequested")[0]
                        assert.isDefined(event)
                        let requestId = event.args.requestId
                        doubledTargetPlatform = event.args.platform

                        return Setup.assetsManager.redeemNewAsset(requestId, "Doubled Token", "Some descr", 1000, 2, false, false, { from: doubledTokenOwner })
                    })
                    .then(tx => {
                        let event = eventsHelper.extractEvents(tx, "AssetCreated")[0]
                        assert.isDefined(event)
                    })
                    .then(() => Setup.assetsPlatformRegistry.detachPlatform(doubledTargetPlatform, { from: doubledTokenOwner }))
                    .then(() => ChronoBankPlatform.at(doubledTargetPlatform)).then(_platform => _platform.claimContractOwnership({ from: doubledTokenOwner }))
                    // now create exactly the same token in AssetsManager for on other platform
                    .then(() => Setup.assetsManager.requestNewAsset.call(doubledTokenName, { from: otherOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.ASSETS_TOKEN_EXISTS)
                    })
                })
            })

            context("platform ownership", function () {
                it("should allow an owner to add more owners to a platform", function () {
                    let nonTimeOwner = owner3
                    let timeOwner = owner
                    let symbol = TIME_SYMBOL

                    return Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, nonTimeOwner).then(_isOwner => {
                        assert.isNotOk(_isOwner)

                        return Setup.assetsPlatformRegistry.addPlatformOwner.call(nonTimeOwner, { from: timeOwner }).then(_code => {
                            assert.equal(_code, ErrorsEnum.OK)

                            return Setup.assetsPlatformRegistry.addPlatformOwner(nonTimeOwner, { from: timeOwner }).then(tx => {
                                let event = eventsHelper.extractEvents(tx, "PlatformOwnerAdded")[0]
                                assert.isDefined(event)
                                assert.equal(event.args.owner, nonTimeOwner)
                                assert.equal(event.args.addedBy, timeOwner)
                            })
                        })
                    })
                })

                it("should allow an owner to remove other owners of a platform", function () {
                    let otherTimeOwner = owner3
                    let timeOwner = owner
                    let symbol = TIME_SYMBOL

                    return Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, otherTimeOwner).then(_isOwner => assert.isOk(_isOwner))
                    .then(() => Setup.assetsPlatformRegistry.removePlatformOwner.call(otherTimeOwner, { from: timeOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.OK)

                        return Setup.assetsPlatformRegistry.removePlatformOwner(otherTimeOwner, { from: timeOwner }).then(tx => {
                            let event = eventsHelper.extractEvents(tx, "PlatformOwnerRemoved")[0]
                            assert.isDefined(event)
                            assert.equal(event.args.owner, otherTimeOwner)
                            assert.equal(event.args.removedBy, timeOwner)
                        })
                        .then(() => Setup.assetsPlatformRegistry.getAssetOwners.call(symbol))
                        .then(_owners => assert.notInclude(_owners, otherTimeOwner))
                    })
                })

                it("should not be able to allow an owner to add another owner who is already in registry", function () {
                    let timeOwner = owner
                    let otherPlatformOwner = owner2
                    let symbol = TIME_SYMBOL

                    return Setup.assetsPlatformRegistry.getPlatformForUser.call(otherPlatformOwner).then(_platform => assert.notEqual(_platform, zeroAddress))
                    .then(() => Setup.assetsPlatformRegistry.addPlatformOwner.call(otherPlatformOwner, { from: timeOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.PLATFORM_REGISTRY_OWNER_CANNOT_OWN_MORE_THAN_ONE_PLATFORM)

                        return Setup.assetsPlatformRegistry.addPlatformOwner(otherPlatformOwner, { from: timeOwner })
                    })
                    .then(() => Setup.assetsPlatformRegistry.getAssetOwners.call(symbol))
                    .then(_owners => assert.notInclude(_owners, otherPlatformOwner))
                })

                it("should not allow to a non-owner to remove owners of a platform", function () {
                    let timeOwner = owner
                    let nonTimeOwner = owner3
                    let symbol = TIME_SYMBOL

                    return Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, nonTimeOwner).then(_isOwner => assert.isNotOk(_isOwner))
                    .then(() => Setup.assetsPlatformRegistry.removePlatformOwner.call(timeOwner, { from: nonTimeOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.UNAUTHORIZED)

                        return Setup.assetsPlatformRegistry.removePlatformOwner(timeOwner, { from: nonTimeOwner })
                    })
                    .then(() => Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, timeOwner))
                    .then(_isOwner => assert.isOk(_isOwner))
                })

                it("should not allow to a non-owner to add owners to a platform", function () {
                    let timeOwner = owner
                    let symbol = TIME_SYMBOL
                    let nonTimeOwner = accounts[7]
                    let otherNonTimeOwner = accounts[8]

                    return Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, nonTimeOwner).then(_isOwner => assert.isNotOk(_isOwner))
                    .then(() => Setup.assetsPlatformRegistry.addPlatformOwner.call(otherNonTimeOwner, { from: nonTimeOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.UNAUTHORIZED)

                        return Setup.assetsPlatformRegistry.addPlatformOwner(otherNonTimeOwner, { from: nonTimeOwner })
                    })
                    .then(() => Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, timeOwner))
                    .then(_isOwner => assert.isOk(_isOwner))
                    .then(() => Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, otherNonTimeOwner))
                    .then(_isOwner => assert.isNotOk(_isOwner))
                })

                it("should not allow to remove the last owner of a platform, there should be always at least one owner", function () {
                    let timeOwner = owner2
                    let symbol = testAssetSymbol1

                    return Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, timeOwner).then(_isOwner => assert.isOk(_isOwner))
                    .then(() => Setup.assetsPlatformRegistry.getAssetOwners.call(symbol))
                    .then(_owners => {
                        assert.lengthOf(_owners, 1)
                    })
                    .then(() => Setup.assetsPlatformRegistry.removePlatformOwner.call(timeOwner, { from: timeOwner }))
                    .then(_code => {
                        assert.equal(_code, ErrorsEnum.PLATFORM_REGISTRY_PLATFORM_SHOULD_HAVE_AT_LEAST_ONE_OWNER)

                        return Setup.assetsPlatformRegistry.removePlatformOwner(timeOwner, { from: timeOwner })
                    })
                    .then(() => Setup.assetsPlatformRegistry.isAssetOwner.call(symbol, timeOwner))
                    .then(_isOwner => assert.isOk(_isOwner))
                })
            })
        })

    })
})
