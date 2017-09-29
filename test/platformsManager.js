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

        it("should not create platform on request if an user already has one in ownership", async () => {
            let requestPlatformTx = await Setup.platformsManager.requestPlatform({ from: owner })
            let requestPlatformEvent = eventsHelper.extractEvents(requestPlatformTx, "PlatformRequested")[0]
            assert.isDefined(requestPlatformEvent)

            let platform = await ChronoBankPlatform.at(requestPlatformEvent.args.platform)
            await platform.claimContractOwnership({ from: owner })

            let secondRequestPlatformTx = await Setup.platformsManager.requestPlatform({ from: owner })
            let secondRequestPlatformEvent = eventsHelper.extractEvents(secondRequestPlatformTx, "PlatformRequested")[0]
            assert.isDefined(secondRequestPlatformEvent)

            assert.equal(requestPlatformEvent.args.platform, secondRequestPlatformEvent.args.platform)
            assert.equal(requestPlatformEvent.args.platformId.toNumber(), secondRequestPlatformEvent.args.platformId.toNumber())
        })

        it("revert", reverter.revert)

        it("should create a new platform for an user if she has no platform in ownership", async () => {
            let noPlatform = await Setup.platformsManager.getPlatformForUser.call(owner)
            assert.equal(noPlatform, 0x0)

            let requestPlatformTx = await Setup.platformsManager.requestPlatform({ from: owner })
            let requestPlatformEvent = eventsHelper.extractEvents(requestPlatformTx, "PlatformRequested")[0]
            assert.isDefined(requestPlatformEvent)
            assert.notEqual(requestPlatformEvent.args.tokenExtension, 0x0)

            let platform = await ChronoBankPlatform.at(requestPlatformEvent.args.platform)
            await platform.claimContractOwnership({ from: owner })

            let existedPlatform = await Setup.platformsManager.getPlatformForUser.call(owner)
            assert.notEqual(existedPlatform, 0x0)
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

        it("should not be able to attach a platform for a user that already has a platform in ownership", async () => {
            let anotherPlatform = await createPlatform(owner)
            let failedPlatformResultCode = await Setup.platformsManager.attachPlatform.call(anotherPlatform.address, { from: systemOwner })
            assert.equal(failedPlatformResultCode, ErrorsEnum.PLATFORMS_CANNOT_OWN_MORE_THAN_ONE_PLATFORM)
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

        it("should not be allowed by non-contract owner", async () => {
            let failedReplaceResultCode = await Setup.platformsManager.replacePlatform.call(attachedPlatform.address, freePlatform.address, { from: owner })
            assert.equal(failedReplaceResultCode, ErrorsEnum.UNAUTHORIZED)
        })

        it("should not be allowed to replace platforms from different owners", async () => {
            let otherOwnerPlatform = await createPlatform(otherOwner)
            let failedReplaceResultCode = await Setup.platformsManager.replacePlatform.call(attachedPlatform.address, otherOwnerPlatform.address, { from: systemOwner })
            assert.equal(failedReplaceResultCode, ErrorsEnum.PLATFORMS_DIFFERENT_PLATFORM_OWNERS)
        })

        it("should not be allowed to replace a platform that doesn't exist in a registry", async () => {
            let failedReplaceResultCode = await Setup.platformsManager.replacePlatform.call(freePlatform.address, attachedPlatform.address, { from: systemOwner })
            assert.equal(failedReplaceResultCode, ErrorsEnum.PLATFORMS_PLATFORM_DOES_NOT_EXIST)
        })

        it("should allow a contract owner to replace an existed platform with another one", async () => {
            let attachedPlatformId = await Setup.platformsManager.getIdForPlatform.call(attachedPlatform.address)

            let successReplaceResultCode = await Setup.platformsManager.replacePlatform.call(attachedPlatform.address, freePlatform.address, { from: systemOwner })
            assert.equal(successReplaceResultCode, ErrorsEnum.OK)

            let successReplaceTx = await Setup.platformsManager.replacePlatform(attachedPlatform.address, freePlatform.address, { from: systemOwner })
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

        it("should fail on updating associated platform ownership when a recipient of a new contract ownership is already holding a platform", async () => {
            await platform.changeContractOwnership(owner, { from: otherOwner })
            await platform.claimContractOwnership({ from: owner })

            let successRequestPlatformResultCode = await Setup.platformsManager.requestPlatform.call({ from: owner})
            assert.equal(successRequestPlatformResultCode, ErrorsEnum.OK)

            let successRequestPlatformTx = await Setup.platformsManager.requestPlatform({ from: owner})
            let event = eventsHelper.extractEvents(successRequestPlatformTx, "PlatformRequested")[0]
            assert.isDefined(event)

            let platformId = event.args.platformId
            assert.notEqual(platformId.toNumber(), 0)

            let failedUpdateAssociatedPlatformResultCode = await Setup.platformsManager.replaceAssociatedPlatformFromOwner.call(platform.address, otherOwner, { from: owner })
            assert.equal(failedUpdateAssociatedPlatformResultCode, ErrorsEnum.PLATFORMS_CANNOT_OWN_MORE_THAN_ONE_PLATFORM)
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
            let gotPlatformAddress = await Setup.platformsManager.getPlatformForUser.call(owner)
            assert.equal(platform.address, gotPlatformAddress)
        })

        it("should return no platform for non platform owner", async () => {
            let noPlatformAddress = await Setup.platformsManager.getPlatformForUser.call(nonOwner)
            assert.equal(noPlatformAddress, 0x0)
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
