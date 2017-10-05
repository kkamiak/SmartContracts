const Setup = require("../setup/setup")
const eventsHelper = require('./helpers/eventsHelper')
const ErrorsEnum = require("../common/errors")
const Reverter = require('./helpers/reverter')
const ChronoBankTokenManagementExtension = artifacts.require("./ChronoBankTokenManagementExtension.sol")
const ChronoBankPlatform = artifacts.require('./ChronoBankPlatform.sol')
const ChronoBankAssetWithFee = artifacts.require('./ChronoBankAssetWithFee.sol')


// NOTE: should not support this test cases
contract("ChronoBank TokenManagementExtension", function(accounts) {
    const contractOwner = accounts[0]
    const systemOwner = accounts[0]
    const owner1 = accounts[1]
    const owner2 = accounts[2]
    const nonOwner = accounts[6]

    const reverter = new Reverter(web3)

    let utils = web3._extend.utils
    const zeroAddress = '0x' + utils.padLeft(utils.toHex("0").substr(2), 40)

    function toBytes32(str) {
        return utils.padRight(utils.toHex(str), 66)
    }

    before('setup', function(done) {
        Setup.setup((e) => {
            console.log(e);
            reverter.snapshot((e) => {
                done(e)
            })
        })
    })

    context.skip("asset creation", function () {
        const TOKEN_SYMBOL = "MTT"
        const TOKEN_NAME = "My test tokens"
        const TOKEN_DESCRIPTION = "description of MTT"

        const TOKEN_WITH_FEE_SYMBOL = "MTTF"
        const TOKEN_WITH_FEE_NAME = "My test tokens with fee"
        const TOKEN_WITH_FEE_DESCRIPTION = "description of MTTF"

        let owner = systemOwner
        let platform
        let platformId
        let tokenExtension

        it("prepare", async () => {
            let platformAddresses = await Setup.platformsManager.getPlatformsForUser.call(owner)
            assert.isAtLeast(platformAddresses.length, 1)
            assert.include(platformAddresses, Setup.chronoBankPlatform.address)

            let platformAddress = Setup.chronoBankPlatform.address
            assert.notEqual(platformAddress, zeroAddress)
            assert.equal(platformAddress, Setup.chronoBankPlatform.address)

            platformId = await Setup.platformsManager.getIdForPlatform.call(platformAddress)
            platform = Setup.chronoBankPlatform

            let tokenExtensionAddress = await Setup.assetsManager.getTokenExtension.call(platformAddress)
            assert.notEqual(tokenExtensionAddress, zeroAddress)
            tokenExtension = ChronoBankTokenManagementExtension.at(tokenExtensionAddress)
        })

        it("should be able to create an asset by platform owner", async () => {
            let assetCreationResultCode = await tokenExtension.createAsset.call(TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DESCRIPTION, 0, 2, true, false, { from: owner })
            assert.equal(assetCreationResultCode, ErrorsEnum.OK)

            let assetCreationTx  = await tokenExtension.createAsset(TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DESCRIPTION, 0, 2, true, false, { from: owner })
            let event = eventsHelper.extractEvents(assetCreationTx, "AssetCreated")[0]
            assert.isDefined(event)

            let isSymbolCreated = await platform.isCreated.call(TOKEN_SYMBOL)
            assert.isOk(isSymbolCreated)
            let tokenMetadata = await Setup.erc20Manager.getTokenMetaData.call(event.args.token)
            assert.notEqual(tokenMetadata[0], zeroAddress)
            assert.equal(tokenMetadata[0], event.args.token)
            assert.equal(tokenMetadata[2], toBytes32(TOKEN_SYMBOL))
        })

        it("should be able to create an asset with fee and ownership request event should be triggered", async () => {
            let assetCreationResultCode = await tokenExtension.createAsset.call(TOKEN_WITH_FEE_SYMBOL, TOKEN_WITH_FEE_NAME, TOKEN_WITH_FEE_DESCRIPTION, 1000000000, 5, true, true, { from: owner })
            assert.equal(assetCreationResultCode, ErrorsEnum.OK)

            let assetCreationTx  = await tokenExtension.createAsset(TOKEN_WITH_FEE_SYMBOL, TOKEN_WITH_FEE_NAME, TOKEN_WITH_FEE_DESCRIPTION, 1000000000, 5, true, true, { from: owner })
            let event = eventsHelper.extractEvents(assetCreationTx, "AssetCreated")[0]
            assert.isDefined(event)

            let claimAssetOwnershipEvent = eventsHelper.extractEvents(assetCreationTx, "AssetOwnershipClaimRequired")[0]
            assert.isDefined(claimAssetOwnershipEvent)
            let assetWithFee = await ChronoBankAssetWithFee.at(claimAssetOwnershipEvent.args.asset)
            await assetWithFee.claimContractOwnership({ from: owner })

            let isSymbolCreated = await platform.isCreated.call(TOKEN_WITH_FEE_SYMBOL)
            assert.isOk(isSymbolCreated)
            let tokenMetadata = await Setup.erc20Manager.getTokenMetaData.call(event.args.token)
            assert.notEqual(tokenMetadata[0], zeroAddress)
            assert.equal(tokenMetadata[0], event.args.token)
            assert.equal(tokenMetadata[2], toBytes32(TOKEN_WITH_FEE_SYMBOL))
        })

        it("should be able to identify an owner as owner of two assets", async () => {
            let assets = await Setup.assetsManager.getAssetsForOwner.call(platform.address, owner)
            assert.isAtLeast(assets.length, 2)
            assert.include(assets, toBytes32(TOKEN_SYMBOL))
            assert.include(assets, toBytes32(TOKEN_WITH_FEE_SYMBOL))
        })

        it("should not be able to create an asset with already existed symbol", async () => {
            let failedAssetCreationResultCode = await tokenExtension.createAsset.call(TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DESCRIPTION, 0, 5, false, false, { from: owner })
            assert.equal(failedAssetCreationResultCode, ErrorsEnum.TOKEN_EXTENSION_ASSET_TOKEN_EXISTS)
        })
        it("should not be able to create an asset by non-platform owner", async () => {
            const TOKEN_NS_SYMBOL = "TNS"
            let failedAssetCreationResultCode = await tokenExtension.createAsset.call(TOKEN_NS_SYMBOL, "", "", 0, 1, false, false, { from: nonOwner })
            assert.equal(failedAssetCreationResultCode, ErrorsEnum.UNAUTHORIZED)
        })

        it('revert', reverter.revert)
    })

    context.skip("crowdsale", function () {
        it("should not be possible to create a crowdsale campaign by non-asset owner")
        it("should be able to create a crowdsale campaign by asset owner")
        it("should not be able to delete a crowdsale campaign by non-asset owner")
        it("should not be able to delete a crowdsale campaign that is not ended")
        it("should be able to delete a crowdsale campaign by an asset owner when time has ended")
    })
})
