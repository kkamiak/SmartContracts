pragma solidity ^0.4.11;

import "../core/common/BaseManager.sol";
import "../core/common/OwnedInterface.sol";
import "../core/platform/ChronoBankAssetOwnershipManager.sol";
import "./PlatformsManagerEmitter.sol";
import "./AssetsManagerInterface.sol";
import "./PlatformsManagerInterface.sol";


contract PartOwnedInterface is OwnedInterface {
    mapping(address => bool) public partowners;

    function checkOnlyOneOfContractOwners() constant returns (bool);
    function isOnlyOneOfContractOwners(address _owner) constant returns (bool);
}


contract PlatformsFactory {
    function createPlatform(address eventsHistory, address owner) returns (address);
}


contract OwnedContract {
    address public contractOwner;
}


/**
* @dev TODO
*/
contract PlatformsManager is BaseManager, PlatformsManagerEmitter {

    /** Error codes */

    uint constant ERROR_PLATFORMS_ATTACHING_PLATFORM_ALREADY_EXISTS = 21001;
    uint constant ERROR_PLATFORMS_PLATFORM_DOES_NOT_EXIST = 21002;
    uint constant ERROR_PLATFORMS_INCONSISTENT_INTERNAL_STATE = 21003;

    /** Storage keys */

    /** TODO */
    StorageInterface.Address platformsFactory;

    /** * @dev DEPRECATED. Will be removed in next release */
    StorageInterface.AddressAddressMapping ownerToPlatform;

    /** TODO */
    StorageInterface.AddressesSetMapping ownerToPlatforms;

    /** TODO */
    StorageInterface.OrderedAddressesSet platforms;

    /** TODO */
    StorageInterface.UIntAddressMapping idToPlatform;

    /** TODO */
    StorageInterface.AddressUIntMapping platformToId;

    /** TODO */
    StorageInterface.UInt idCounter;

    /**
    * @dev TODO
    */
    modifier onlyPlatformOwner(address _platform) {
        if (_isPlatformOwner(_platform)) {
            _;
        }
    }

    /**
    * @dev TODO
    */
    modifier onlyPlatformIdOwner(uint _id) {
        address _platform = store.get(idToPlatform, _id);
        if (_isPlatformOwner(_platform)) {
            _;
        }
    }

    /**
    * @dev TODO
    */
    modifier onlyPreviousPlatformOwner(address _platform, address _previousOwner) {
        if (!store.includes(ownerToPlatforms, bytes32(_previousOwner), _platform)) {
            revert();
        }
        _;
    }

    function PlatformsManager(Storage _store, bytes32 _crate) BaseManager(_store, _crate) {
        platformsFactory.init("platformsFactory");
        ownerToPlatform.init("ownerToPlatform");
        ownerToPlatforms.init("ownerToPlatforms");
        platforms.init("platforms");
        idToPlatform.init("idToPlatform");
        platformToId.init("platformToId");
        idCounter.init("idCounter");
    }

    function init(address _contractsManager, address _platformsFactory) onlyContractOwner public returns (uint) {
        BaseManager.init(_contractsManager, "PlatformsManager");

        store.set(platformsFactory, _platformsFactory);

        return OK;
    }

    /**
    * @dev TODO DEPRECATED. Will be removed in next release
    */
    function getPlatformForUser(address _user) public constant returns (address) {
        return store.get(ownerToPlatform, _user);
    }

    /**
    * @dev TODO
    */
    function getPlatformForUserAtIndex(address _user, uint _idx) public constant returns (address) {
        return store.get(ownerToPlatforms, bytes32(_user), _idx);
    }

    /**
    * @dev TODO
    */
    function getPlatformsForUserCount(address _user) public constant returns (uint) {
        return store.count(ownerToPlatforms, bytes32(_user));
    }

    /**
    * @dev TODO
    */
    function getPlatformWithId(uint _id) public constant returns (address) {
        return store.get(idToPlatform, _id);
    }

    /**
    * @dev TODO
    */
    function getIdForPlatform(address _platform) public constant returns (uint) {
        return store.get(platformToId, _platform);
    }

    /**
    * @dev TODO
    */
    function attachPlatform(address _platform) onlyContractOwner public returns (uint resultCode) {
        if (store.includes(platforms, _platform)) {
            return _emitError(ERROR_PLATFORMS_ATTACHING_PLATFORM_ALREADY_EXISTS);
        }

        uint _id = _attachPlatformWithoutValidation(_platform, OwnedContract(_platform).contractOwner());
        _emitPlatformAttached(_id, _platform);
        return OK;
    }

    /**
    * @dev TODO
    */
    function detachPlatform(address _platform) onlyPlatformOwner(_platform) public returns (uint) {
        uint _platformId = store.get(platformToId, _platform);
        return _performDetachingPlatform(_platform, _platformId);
    }

    /**
    * @dev TODO
    */
    function detachPlatformWithId(uint _platformId) onlyPlatformIdOwner(_platformId) public returns (uint) {
        address _platform = store.get(idToPlatform, _platformId);
        return _performDetachingPlatform(_platform, _platformId);
    }

    /**
    * @dev TODO
    */
    function replacePlatform(address _fromPlatform, address _toPlatform)
    onlyPlatformOwner(_fromPlatform)
    onlyPlatformOwner(_toPlatform)
    public returns (uint resultCode) {
        if (!store.includes(platforms, _fromPlatform)) {
            return _emitError(ERROR_PLATFORMS_PLATFORM_DOES_NOT_EXIST);
        }

        if (store.includes(platforms, _toPlatform)) {
            return _emitError(ERROR_PLATFORMS_ATTACHING_PLATFORM_ALREADY_EXISTS);
        }

        address _owner = OwnedContract(_toPlatform).contractOwner();
        uint id = store.get(platformToId, _fromPlatform);
        store.add(platforms, _toPlatform);
        store.remove(platforms, _fromPlatform);
        store.remove(ownerToPlatforms, bytes32(_owner), _fromPlatform);
        store.add(ownerToPlatforms, bytes32(_owner), _toPlatform);
        store.set(platformToId, _toPlatform, id);
        store.set(platformToId, _fromPlatform, 0);
        store.set(idToPlatform, id, _toPlatform);

        _emitPlatformReplaced(id, _fromPlatform, _toPlatform);
        return OK;
    }

    /**
    * @dev TODO
    */
    function replaceAssociatedPlatformFromOwner(address _platform, address _from)
    onlyPlatformOwner(_platform)
    onlyPreviousPlatformOwner(_platform, _from)
    public returns (uint resultCode) {
        store.add(ownerToPlatforms, bytes32(msg.sender), _platform);
        store.remove(ownerToPlatforms, bytes32(_from), _platform);
        return OK;
    }

    /**
    * @dev TODO
    */
    function createPlatform() public returns (uint resultCode) {
        PlatformsFactory factory = PlatformsFactory(store.get(platformsFactory));
        address _platform = factory.createPlatform(getEventsHistory(), this);
        OwnedInterface(_platform).claimContractOwnership();
        uint _platformId = _attachPlatformWithoutValidation(_platform, msg.sender);

        AssetsManagerInterface assetsManager = AssetsManagerInterface(lookupManager("AssetsManager"));
        resultCode = assetsManager.requestTokenExtension(_platform);
        address _tokenExtension;
        if (resultCode == OK) {
            _tokenExtension = assetsManager.getTokenExtension(_platform);
            ChronoBankAssetOwnershipManager(_platform).addPartOwner(_tokenExtension);
        }

        OwnedInterface(_platform).changeContractOwnership(msg.sender);
        _emitPlatformRequested(_platformId, _platform, _tokenExtension);
        return OK;
    }

    /**
    * @dev TODO private
    */
    function _attachPlatformWithoutValidation(address _platform, address _owner) private returns (uint platformId) {
        store.add(ownerToPlatforms, bytes32(_owner), _platform);
        store.add(platforms, _platform);

        platformId = store.get(idCounter) + 1;
        store.set(idToPlatform, platformId, _platform);
        store.set(platformToId, _platform, platformId);
        store.set(idCounter, platformId);
    }

    /**
    * @dev TODO
    */
    function _performDetachingPlatform(address _platform, uint _id) private returns (uint resultCode) {
        if (!store.includes(platforms, _platform)) {
            return _emitError(ERROR_PLATFORMS_PLATFORM_DOES_NOT_EXIST);
        }

        address _owner = OwnedContract(_platform).contractOwner();
        if (!store.includes(ownerToPlatforms, bytes32(_owner), _platform)) {
            /* @dev TODO: have to think how to avoid this situation */
            return _emitError(ERROR_PLATFORMS_INCONSISTENT_INTERNAL_STATE);
        }

        store.remove(ownerToPlatforms, bytes32(_owner), _platform);
        store.set(idToPlatform, _id, 0x0);
        store.set(platformToId, _platform, 0);
        store.remove(platforms, _platform);

        _emitPlatformDetached(_id, _platform);
        return OK;
    }

    function _isPlatformOwner(address _platform) private constant returns (bool) {
        return OwnedContract(_platform).contractOwner() == msg.sender;
    }

    /**
    * Events emitting
    */

    function _emitError(uint _errorCode) private returns (uint) {
        PlatformsManagerEmitter(getEventsHistory()).emitError(_errorCode);
        return _errorCode;
    }

    function _emitPlatformAttached(uint _platformId, address _platform) private {
        PlatformsManagerEmitter(getEventsHistory()).emitPlatformAttached(_platformId, _platform);
    }

    function _emitPlatformDetached(uint _platformId, address _platform) private {
        PlatformsManagerEmitter(getEventsHistory()).emitPlatformDetached(_platformId, _platform);
    }

    function _emitPlatformRequested(uint _platformId, address _platform, address _tokenExtension) private {
        PlatformsManagerEmitter(getEventsHistory()).emitPlatformRequested(_platformId, _platform, _tokenExtension);
    }

    function _emitPlatformReplaced(uint _platformId, address _fromPlatform, address _toPlatform) private {
        PlatformsManagerEmitter(getEventsHistory()).emitPlatformReplaced(_platformId, _fromPlatform, _toPlatform);
    }
}
