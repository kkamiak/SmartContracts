const Setup = require("../setup/setup")
const eventsHelper = require('./helpers/eventsHelper')
const ErrorsEnum = require("../common/errors")
const Reverter = require('./helpers/reverter')
const ChronoBankPlatform = artifacts.require("./ChronoBankPlatform.sol")

contract("PlatformsManager", function (accounts) {
    const contractOwner = accounts[0]
    const systemOwner = accounts[0]
    const owner1 = accounts[2]
    const owner2 = accounts[3]
    const owner3 = accounts[4]

    const reverter = new Reverter(web3)

    const createPlatform = async (platformOwner) => {
        let createdPlatform = await ChronoBankPlatform.new({ from: platformOwner })
        await createdPlatform.setupEventsHistory(Setup.multiEventsHistory.address, { from: platformOwner })
        await Setup.multiEventsHistory.authorize(createdPlatform.address, { from: systemOwner })
        return createdPlatform
    }

    const getAllPlatformsForUser = async (user) => {
        var platforms = []
        var platformsCount = await Setup.platformsManager.getPlatformsForUserCount.call(user)
        for (var platformsIdx = 0; platformsIdx < platformsCount; ++platformsIdx) {
            platforms.push(await Setup.platformsManager.getPlatformForUserAtIndex.call(user, platformsIdx))
        }
        return platforms
    }

    before("setup", function(done) {
        Setup.setup((e) => {
            console.log(e);
            reverter.snapshot((e) => {
                done(e)
            })
        })
    })

    context("request platform", function () {
        let owner = owner1

        it("should create platforms on request even if an user already has some in ownership", async () => {
            let createPlatformTx = await Setup.platformsManager.createPlatform({ from: owner })
            let createPlatformEvent = eventsHelper.extractEvents(createPlatformTx, "PlatformRequested")[0]
            assert.isDefined(createPlatformEvent)

            let platform = await ChronoBankPlatform.at(createPlatformEvent.args.platform)
            await platform.claimContractOwnership({ from: owner })

            let secondCreatePlatformTx = await Setup.platformsManager.createPlatform({ from: owner })
            let secondCreatePlatformEvent = eventsHelper.extractEvents(secondCreatePlatformTx, "PlatformRequested")[0]
            assert.isDefined(secondCreatePlatformEvent)

            assert.notEqual(createPlatformEvent.args.platform, secondCreatePlatformEvent.args.platform)
            assert.notEqual(createPlatformEvent.args.platformId.toNumber(), secondCreatePlatformEvent.args.platformId.toNumber())
        })

        it("revert", reverter.revert)

        it("should create a new platform for an user", async () => {
            let emptyPlatformsCount = await Setup.platformsManager.getPlatformsForUserCount.call(owner)
            assert.equal(emptyPlatformsCount, 0)

            let createPlatformTx = await Setup.platformsManager.createPlatform({ from: owner })
            let createPlatformEvent = eventsHelper.extractEvents(createPlatformTx, "PlatformRequested")[0]
            assert.isDefined(createPlatformEvent)
            assert.notEqual(createPlatformEvent.args.tokenExtension, 0x0)

            let platform = await ChronoBankPlatform.at(createPlatformEvent.args.platform)
            await platform.claimContractOwnership({ from: owner })

            let existedPlatformsCount = await Setup.platformsManager.getPlatformsForUserCount.call(owner)
            assert.equal(existedPlatformsCount, 1)
        })

        it("revert", reverter.revert)
    })

    context("attach platform", function () {
        let owner = owner1
        var platform

        it("should be able to attach a platform that is not registered by contract (PlatformsManager) owner", async () => {
            platform = await createPlatform(owner)
            let attachPlatformResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: systemOwner })
            assert.equal(attachPlatformResultCode, ErrorsEnum.OK)
        })

        it("should not be able to attach a platform by non-contract (PlatformsManager) owner", async () => {
            let attachPlatformResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: owner })
            assert.equal(attachPlatformResultCode, ErrorsEnum.UNAUTHORIZED)
        })

        it("should not be able to attach a platform that is already attached", async () => {
            let attachPlatformResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: systemOwner })
            assert.equal(attachPlatformResultCode, ErrorsEnum.OK)
            await Setup.platformsManager.attachPlatform(platform.address, { from: systemOwner })

            let failedPlatformResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: systemOwner })
            assert.equal(failedPlatformResultCode, ErrorsEnum.PLATFORMS_ATTACHING_PLATFORM_ALREADY_EXISTS)
        })

        it("revert", reverter.revert)
    })

    context("detach platform", function () {
        let owner = owner1
        let nonOwner = owner2
        let platform

        it("should not be able to detach a platform that is not registered", async () => {
            platform = await createPlatform(owner)
            let failedDetachResultCode = await Setup.platformsManager.detachPlatform.call(platform.address, { from: owner })
            assert.equal(failedDetachResultCode, ErrorsEnum.PLATFORMS_PLATFORM_DOES_NOT_EXIST)
        })

        it("should not be able to detach a platform by non-owner of a platform", async () => {
            let successAttachResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: systemOwner })
            assert.equal(successAttachResultCode, ErrorsEnum.OK)
            await Setup.platformsManager.attachPlatform(platform.address, { from: systemOwner })

            let failedDetachResultCode = await Setup.platformsManager.detachPlatform.call(platform.address, { from: nonOwner })
            assert.equal(failedDetachResultCode, ErrorsEnum.UNAUTHORIZED)
        })

        it("should be able to detach a platform that is registered by an owner of the platform", async () => {
            let successDetachResultCode = await Setup.platformsManager.detachPlatform.call(platform.address, { from: owner })
            assert.equal(successDetachResultCode, ErrorsEnum.OK)

            let successDetachTx = await Setup.platformsManager.detachPlatform(platform.address, { from: owner })
            let event = eventsHelper.extractEvents(successDetachTx, "PlatformDetached")[0]
            assert.isDefined(event)
            assert.equal(platform.address, event.args.platform)
        })

        it("revert", reverter.revert)
    })

    context("replace platform with another one (update)", function () {
        let owner = owner1
        let otherOwner = owner2
        let attachedPlatform
        let freePlatform

        it("prepare", async () => {
            attachedPlatform = await createPlatform(owner)
            let attachPlatformTx = await Setup.platformsManager.attachPlatform(attachedPlatform.address, { from: systemOwner })
            assert.isDefined(eventsHelper.extractEvents(attachPlatformTx, "PlatformAttached")[0])

            freePlatform = await createPlatform(owner)
        })


        it("should not be allowed to replace platforms from different owners", async () => {
            let otherOwnerPlatform = await createPlatform(otherOwner)
            let failedReplaceResultCode = await Setup.platformsManager.replacePlatform.call(attachedPlatform.address, otherOwnerPlatform.address, { from: owner })
            assert.equal(failedReplaceResultCode, ErrorsEnum.UNAUTHORIZED)
        })

        it("should not be allowed to replace a platform that doesn't exist in a registry", async () => {
            let failedReplaceResultCode = await Setup.platformsManager.replacePlatform.call(freePlatform.address, attachedPlatform.address, { from: owner })
            assert.equal(failedReplaceResultCode, ErrorsEnum.PLATFORMS_PLATFORM_DOES_NOT_EXIST)
        })

        it("should not allow a contract owner to replace non-owned platforms", async () => {
            let failedReplaceResultCode = await Setup.platformsManager.replacePlatform.call(attachedPlatform.address, freePlatform.address, { from: systemOwner })
            assert.equal(failedReplaceResultCode, ErrorsEnum.UNAUTHORIZED)
        })

        it("should be allowed by platforms' owner", async () => {
            let attachedPlatformId = await Setup.platformsManager.getIdForPlatform.call(attachedPlatform.address)
            let successReplaceResultCode = await Setup.platformsManager.replacePlatform.call(attachedPlatform.address, freePlatform.address, { from: owner })

            assert.equal(successReplaceResultCode, ErrorsEnum.OK)

            let successReplaceTx = await Setup.platformsManager.replacePlatform(attachedPlatform.address, freePlatform.address, { from: owner })
            let event = eventsHelper.extractEvents(successReplaceTx, "PlatformReplaced")[0]
            assert.isDefined(event)
            assert.equal(event.args.fromPlatform, attachedPlatform.address)
            assert.equal(event.args.toPlatform, freePlatform.address)
            assert.equal(attachedPlatformId.toNumber(), event.args.platformId.toNumber())

            let freePlatformId = await Setup.platformsManager.getIdForPlatform.call(freePlatform.address)
            assert.equal(attachedPlatformId.toNumber(), freePlatformId.toNumber())

            let newAttachedPlatformId = await Setup.platformsManager.getIdForPlatform.call(attachedPlatform.address)
            assert.equal(newAttachedPlatformId.toNumber(), 0)
        })

        it("revert", reverter.revert)
    })

    context("update platform ownership", function () {
        let owner = owner1
        let otherOwner = owner2
        let nonOwner = owner3
        let platform

        it("prepare", async () => {
            platform = await createPlatform(otherOwner)
            let successAttachResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: systemOwner })
            assert.equal(successAttachResultCode, ErrorsEnum.OK)
            await Setup.platformsManager.attachPlatform(platform.address, { from: systemOwner })
        })
        it("snapshot", reverter.snapshot)

        it("should update an associated platform ownership when platform contract ownership has changed", async () => {
            await platform.changeContractOwnership(owner, { from: otherOwner })
            await platform.claimContractOwnership({ from: owner })

            let successAssociatedPlatformChangeResultCode = await Setup.platformsManager.replaceAssociatedPlatformFromOwner.call(platform.address, otherOwner, { from: owner })
            assert.equal(successAssociatedPlatformChangeResultCode, ErrorsEnum.OK)
        })
        it("revert", reverter.revert)

        it("should fail on detaching a platform if no accociated ownership changes were made after contract ownership changes", async () => {
            await platform.changeContractOwnership(owner, { from: otherOwner })
            await platform.claimContractOwnership({ from: owner })

            var failedDetachResultCode = await Setup.platformsManager.detachPlatform.call(platform.address, { from: owner })
            assert.equal(failedDetachResultCode, ErrorsEnum.PLATFORMS_INCONSISTENT_INTERNAL_STATE)

            failedDetachResultCode = await Setup.platformsManager.detachPlatform.call(platform.address, { from: otherOwner })
            assert.equal(failedDetachResultCode, ErrorsEnum.UNAUTHORIZED)
        })
        it("revert", reverter.revert)

        it("should fail on updating associated platform ownership when performed by non-contract owner of the platform", async () => {
            await platform.changeContractOwnership(owner, { from: otherOwner })
            await platform.claimContractOwnership({ from: owner })

            let failedAssociatedPlatformChangeResultCode = await Setup.platformsManager.replaceAssociatedPlatformFromOwner.call(platform.address, otherOwner, { from: nonOwner })
            assert.equal(failedAssociatedPlatformChangeResultCode, ErrorsEnum.UNAUTHORIZED)
        })
        it("revert", reverter.revert)

        it("should be successful on updating associated platform ownership when performed by new platform owner", async () => {
            await platform.changeContractOwnership(owner, { from: otherOwner })
            await platform.claimContractOwnership({ from: owner })

            let successAssociatedPlatformChangeResultCode = await Setup.platformsManager.replaceAssociatedPlatformFromOwner.call(platform.address, otherOwner, { from: owner })
            assert.equal(successAssociatedPlatformChangeResultCode, ErrorsEnum.OK)
        })
        it("revert", function (done) {
            reverter.revert(done, reverter.snapshotId - 1)
        })
    })

    context("properties check", function () {
        let owner = owner1
        let nonOwner = owner2
        let platform
        let platformId


        it("prepare", async () => {
            platform = await createPlatform(owner)
            let successAttachResultCode = await Setup.platformsManager.attachPlatform.call(platform.address, { from: systemOwner })
            assert.equal(successAttachResultCode, ErrorsEnum.OK)
            let attachTx = await Setup.platformsManager.attachPlatform(platform.address, { from: systemOwner })
            platformId = eventsHelper.extractEvents(attachTx, "PlatformAttached")[0].args.platformId
        })
        it("snapshot", reverter.snapshot)

        it("should return the same platform for a user who is owning a platform", async () => {
            let gotPlatformAddresses = await getAllPlatformsForUser(owner)
            assert.include(gotPlatformAddresses, platform.address)
        })

        it("should return no platform for non platform owner", async () => {
            let noPlatformAddresses = await getAllPlatformsForUser(nonOwner)
            assert.lengthOf(noPlatformAddresses, 0)
        })

        it("should have an id for a registered platform", async () => {
            let gotPlatformId = await Setup.platformsManager.getIdForPlatform.call(platform.address)
            assert.notEqual(gotPlatformId.toNumber(), 0)
            assert.equal(platformId.toNumber(), gotPlatformId.toNumber())
        })

        let detachedId
        it("should not have an id for a detached platform", async () => {
            let nonOwnerPlatform = await createPlatform(nonOwner)
            await Setup.platformsManager.attachPlatform(nonOwnerPlatform.address, { from: systemOwner })

            detachedId = await Setup.platformsManager.getIdForPlatform.call(nonOwnerPlatform.address)
            assert.notEqual(detachedId.toNumber(), 0)

            let successDetachTx = await Setup.platformsManager.detachPlatform(nonOwnerPlatform.address, { from: nonOwner })
            assert.isDefined(eventsHelper.extractEvents(successDetachTx, "PlatformDetached"))

            let remainedPlatformId = await Setup.platformsManager.getIdForPlatform.call(nonOwnerPlatform.address)
            assert.equal(remainedPlatformId.toNumber(), 0)
        })

        it("should have a platform for real id", async () => {
            let gotPlatform = await Setup.platformsManager.getPlatformWithId.call(platformId)
            assert.notEqual(gotPlatform, 0x0)
            assert.equal(gotPlatform, platform.address)
        })

        it("should not have a platform for non-existed id", async () => {
            let randomPlatformId = 444
            let noPlatform = await Setup.platformsManager.getPlatformWithId.call(randomPlatformId)
            assert.equal(noPlatform, 0x0)
        })

        it("should not have a platform for detached id", async () => {
            let noPlatform = await Setup.platformsManager.getPlatformWithId.call(detachedId)
            assert.equal(noPlatform, 0x0)
        })

        it('revert', function (done) {
            reverter.revert(done, reverter.snapshotId - 1)
        })
    })
})
