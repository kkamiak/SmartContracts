pragma solidity ^0.4.11;

import "../core/common/BasePlatformsManager.sol";
import "./PlatformRegistryInterface.sol";
import "./AssetsPlatformRegistryEmitter.sol";
import "./AssetsProviderInterface.sol";
import "../core/platform/ChronoBankPlatformInterface.sol";
import "../core/platform/ChronoBankAssetProxyInterface.sol";
import {ERC20ManagerInterface as ERC20Manager} from "../core/erc20/ERC20ManagerInterface.sol";
import "../crowdsale/base/BaseCrowdsale.sol";


contract CrowdsaleManager {
    function createCrowdsale(address _creator, bytes32 _symbol, bytes32 _factoryName) returns (address, uint);
    function deleteCrowdsale(address crowdsale) returns (uint);
}

/**
* @title Incapsulate ownership records about platforms registered (attached) by AssetsManager
* @dev Share functionality with AssetsManager
*/
contract AssetsPlatformRegistry is AssetsPlatformRegistryEmitter, BasePlatformsManager, PlatformRegistryInterface {
    uint constant ERROR_PLATFORM_REGISTRY_INVALID_INVOCATION = 19000;
    uint constant ERROR_PLATFORM_REGISTRY_PLATFORM_IS_ALREADY_ATTACHED = 19001;
    uint constant ERROR_PLATFORM_REGISTRY_PLATFORM_IS_ALREADY_DETACHED = 19002;
    uint constant ERROR_PLATFORM_REGISTRY_OWNER_CANNOT_OWN_MORE_THAN_ONE_PLATFORM = 19003;
    uint constant ERROR_PLATFORM_REGISTRY_PLATFORM_SHOULD_HAVE_AT_LEAST_ONE_OWNER = 19004;

    StorageInterface.AddressAddressMapping ownersToPlatforms;
    StorageInterface.OrderedAddressesSet allPlatformOwners;
    StorageInterface.AddressesSetMapping platformToOwners;
    StorageInterface.Address assetsProvider;
    StorageInterface.Address platformsDelegatedOwner;

    modifier onlyContractOwnerOrDelegatedOwner() {
        if (msg.sender == contractOwner ||
            msg.sender == store.get(platformsDelegatedOwner)) {
            _;
        }
    }

    modifier onlyContractOwnerOrPlatformOwner(address _platform) {
        if (msg.sender == contractOwner ||
            (_isPlatformOwner(msg.sender, _platform) && _isActiveOwner(msg.sender))) {
            _;
        }
    }

    modifier onlyPlatformOwner(address _user) {
        if (_isPlatformOwner(_user, getPlatformForUser(msg.sender))) {
            _;
        }
    }

    function AssetsPlatformRegistry(Storage _store, bytes32 _crate) BasePlatformsManager(_store, _crate) {
        ownersToPlatforms.init("ownersToPlatforms");
        platformToOwners.init("platformToOwners");
        allPlatformOwners.init("allPlatformOwners");
        assetsProvider.init("assetsProvider");
        platformsDelegatedOwner.init("platformsDelegatedOwner");
    }

    function init(address _contractsManager, address _platformsDelegatedOwner, address _assetsProvider) onlyContractOwner returns (uint errorCode) {
        BasePlatformsManager.init(_contractsManager, "PlatformRegistry");

        store.set(platformsDelegatedOwner, _platformsDelegatedOwner);
        setAssetsProvider(_assetsProvider);
        return OK;
    }

    function destroy() onlyContractOwner {
        address _platform;
        address _delegatedOwner = store.get(platformsDelegatedOwner);
        StorageInterface.Iterator memory iterator = store.listIterator(platforms);
        while (store.canGetNextWithIterator(platforms, iterator)) {
            _platform = store.getNextWithIterator(platforms, iterator);
             DelegatedPlatformOwner(_delegatedOwner).resignPlatformOwnership(_platform, msg.sender);
        }

        BaseManager.destroy();
    }

    /**
    * Provides a way to update assetsProvider service.
    * @dev Can be updated only by contract owner
    *
    * @param _assetsProvider assets provider interface supporter
    *
    * @return errorCode result code of operation
    */
    function setAssetsProvider(address _assetsProvider) onlyContractOwner returns (uint errorCode) {
        require(_assetsProvider != 0x0);

        store.set(assetsProvider, _assetsProvider);
        return OK;
    }

    /**
    * Gives an info about if an user is an owner of assets' symbol
    *
    * @param _symbol a symbol of assets
    * @param _owner a user to check on ownership
    *
    * @return `true` if a user is an owner, otherwise `false`
    */
    function isAssetOwner(bytes32 _symbol, address _owner) constant returns (bool) {
        address _platform = getPlatformForUser(_owner);
        if (_platform == 0x0) {
            return false;
        }

        return ChronoBankPlatformInterface(_platform).isCreated(_symbol);
    }

    /**
    * Gets user's assosiated platform
    *
    * @return address of an owned platform. 0x0 in case if no platform were found for an user
    */
    function getPlatform() constant returns(address) {
        return getPlatformForUser(msg.sender);
    }

    /**
    * Provides a platform assosicated with a passed user
    *
    * @param _user an user which might have a platform
    *
    * @return address of a found platform
    */
    function getPlatformForUser(address _user) constant returns (address) {
        address _platform = store.get(ownersToPlatforms, _user);
        if (!_isPlatformExist(_platform)) {
            return 0x0;
        }
        return _platform;
    }

    /**
    * Provides a way to get an address of platforms' delegated owner
    * @dev Most probably it would be AssetsManager contract
    *
    * @return address of an delegated owner contract
    */
    function getPlatformsDelegatedOwner() constant returns (address) {
        return store.get(platformsDelegatedOwner);
    }

    /**
    * Creates crowdsale campaign of a token with provided symbol
    *
    * @param _symbol a token symbol
    *
    * @return result code of an operation
    */
    function createCrowdsaleCampaign(bytes32 _symbol) returns (uint) {
        if (!isAssetOwner(_symbol, msg.sender)) {
            return _emitError(UNAUTHORIZED);
        }

        CrowdsaleManager crowdsaleManager = CrowdsaleManager(lookupManager("CrowdsaleManager"));

        var (crowdsale, result) = crowdsaleManager.createCrowdsale(msg.sender, _symbol, "TimeLimitedCrowdsaleFactory");
        if (OK != result) return _emitError(result);

        result = addPlatformOwner(crowdsale);
        if (OK != result) return _emitError(result);

        _emitCrowdsaleCampaignCreated(_symbol, crowdsale);

        return OK;
    }

    /**
    * Stops token's crowdsale
    *
    * @param _crowdsale a crowdsale address
    *
    * @return result result code of an operation
    */
    function deleteCrowdsaleCampaign(address _crowdsale) returns (uint result) {
        bytes32 symbol = BaseCrowdsale(_crowdsale).getSymbol();

        if (!isAssetOwner(symbol, msg.sender)) {
            return _emitError(UNAUTHORIZED);
        }

        CrowdsaleManager crowdsaleManager = CrowdsaleManager(lookupManager("CrowdsaleManager"));

        result = crowdsaleManager.deleteCrowdsale(_crowdsale);
        if (OK != result) return _emitError(result);

        result = removePlatformOwner(_crowdsale);
        if (OK != result) return _emitError(result);

        _emitCrowdsaleCampaignRemoved(symbol, _crowdsale);

        return OK;
    }

    /**
    * Performs adding a platform to the registry and assigns platformDelegatedOwner
    * as contract owner for a passed platform. Owner will be used to access the right
    * platform throughout contract's usage.
    *
    * @dev Return back original contract ownership is possible by detaching a platform.
    * Invocation of this method is only possible by contract owner or delegated owner
    *
    * @param _platform address of a platform
    * @param _owner address of a real platform's owner
    *
    * @return errorCode result code of the operation
    */
    function attachPlatform(address _platform, address _owner) onlyContractOwnerOrDelegatedOwner returns (uint errorCode) {
        if (_isPlatformExist(_platform)) {
            return _emitError(ERROR_PLATFORM_REGISTRY_PLATFORM_IS_ALREADY_ATTACHED);
        }

        if (_isActiveOwner(_owner)) {
            return _emitError(ERROR_PLATFORM_REGISTRY_OWNER_CANNOT_OWN_MORE_THAN_ONE_PLATFORM);
        }

        errorCode = DelegatedPlatformOwner(store.get(platformsDelegatedOwner)).capturePlatformOwnership(_platform);
        if (errorCode != OK) {
            return errorCode;
        }

        store.add(platforms, _platform);
        _addPlatformOwner(_platform, _owner);
        _emitPlatformAttached(_platform, _owner);
        return OK;
    }

    /**
    * Performs removing a platform from the registry and assigns back
    * the most appropriate owner as a platform owner. Also removes all asset symbols
    * from assetsProvider
    *
    * @dev Available for invocation only by contract owner or one of platform owners
    *
    * @param _platform address of a platform to remove
    *
    * @return errorCode result code of the operation
    */
    function detachPlatform(address _platform) onlyContractOwnerOrPlatformOwner(_platform) returns (uint errorCode) {
        if (!_isPlatformExist(_platform)) {
            return _emitError(ERROR_PLATFORM_REGISTRY_PLATFORM_IS_ALREADY_DETACHED);
        }

        bool _isContractOwner = msg.sender == contractOwner;
        address _to = _isContractOwner ? store.get(platformToOwners, bytes32(_platform), 0) : msg.sender;

        store.remove(platforms, _platform);

        errorCode = DelegatedPlatformOwner(store.get(platformsDelegatedOwner)).resignPlatformOwnership(_platform, _to);
        if (errorCode != OK) {
            return errorCode;
        }

        _emitPlatformDetached(_platform, _to);
        return OK;
    }

    /**
    * Adds a new user as a platform (asset) owner to an already existed platform
    * @dev Available only for platform owners
    *
    * @param _owner address of a user which will become an owner
    *
    * @return errorCode result code
    */
    function addPlatformOwner(address _owner) onlyPlatformOwner(msg.sender) returns (uint errorCode) {
        address _platform = getPlatformForUser(msg.sender);
        if (_isActiveOwner(_owner)) {
            return _emitError(ERROR_PLATFORM_REGISTRY_OWNER_CANNOT_OWN_MORE_THAN_ONE_PLATFORM);
        }

        _addPlatformOwner(_platform, _owner);
        _emitPlatformOwnerAdded(_platform, _owner, msg.sender);
        return OK;
    }

    /**
    * Removes an owner from a platform associated with a sender
    * @dev Allowed only when owner and sender are owners of the same platform
    *
    * @param _owner address of one of owners of a platform
    *
    * @return errorCode result code
    */
    function removePlatformOwner(address _owner) onlyPlatformOwner(msg.sender) onlyPlatformOwner(_owner) returns (uint errorCode) {
        address _platform = getPlatformForUser(msg.sender);

        if (_owner == msg.sender && store.count(platformToOwners, bytes32(_platform)) == 1) {
            return _emitError(ERROR_PLATFORM_REGISTRY_PLATFORM_SHOULD_HAVE_AT_LEAST_ONE_OWNER);
        }

        _removePlatformOwner(_platform, _owner);
        _emitPlatformOwnerRemoved(_platform, _owner, msg.sender);
        return OK;
    }

    /**
    * Prepares a list of users that owns an asses with passed symbol
    *
    * @param _symbol asset's symbol
    *
    * @return _result an array of asset owners
    */
    function getAssetOwners(bytes32 _symbol) constant returns (address[] _result) {
        address _asset = _assetWithSymbol(_symbol);
        address _platform = ChronoBankAssetProxyInterface(_asset).chronoBankPlatform();
        if (!_isPlatformExist(_platform)) {
            return;
        }

        _result = store.get(platformToOwners, bytes32(_platform));
    }

    /* Private methods */

    /**
    * Checks if a passed user is owner of a platform
    *
    * @param _user address of a potential platform's owner
    * @param _platform address of a platform
    *
    * @return `true` if a user is an owner of a platform, otherwise `false`
    */
    function _isPlatformOwner(address _user, address _platform) private constant returns (bool) {
        return store.includes(platformToOwners, bytes32(_platform), _user);
    }

    /**
    * Allows to know if an user owns any active platform
    *
    * @param _owner an user
    *
    * @return `true` if such platform exists, `false` otherwise
    */
    function _isActiveOwner(address _owner) private constant returns (bool) {
        return getPlatformForUser(_owner) != 0x0;
    }

    /**
    * Looks up for an asset by a symbol
    *
    * @param _symbol asset's symbol
    *
    * @return address of an asset with provided symbol
    */
    function _assetWithSymbol(bytes32 _symbol) private constant returns (address) {
        address erc20Manager = lookupManager("ERC20Manager");
        return ERC20Manager(erc20Manager).getTokenAddressBySymbol(_symbol);
    }

    /**
    * Adds owner to a passed platform
    * @dev Updates platform owners counter in any case
    *
    * @param _platform address of a platform
    * @param _owner user which become an owner
    */
    function _addPlatformOwner(address _platform, address _owner) private {
        address _oldPlatform = store.get(ownersToPlatforms, _owner);
        if (_oldPlatform != 0x0 && _oldPlatform != _platform) {
            store.remove(platformToOwners, bytes32(_oldPlatform), _owner);
        }
        if (_oldPlatform != _platform) {
            store.add(platformToOwners, bytes32(_platform), _owner);
        }
        store.add(allPlatformOwners, _owner);
        store.set(ownersToPlatforms, _owner, _platform);
    }

    /**
    * Removes an owner from a passed platform
    *
    * @param _platform address of a platform
    * @param _owner address of an owner
    */
    function _removePlatformOwner(address _platform, address _owner) private {
        store.remove(allPlatformOwners, _owner);
        store.set(ownersToPlatforms, _owner, 0x0);
        store.remove(platformToOwners, bytes32(_platform), _owner);
    }

    function _isPlatformExist(address _platform) private constant returns (bool) {
        return store.includes(platforms, _platform);
    }

    /* Events emitting */

    function _emitError(uint _error) internal returns (uint) {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitError(_error);
        return _error;
    }

    function _emitPlatformOwnerAdded(address _platform, address _owner, address _addedBy) internal {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitPlatformOwnerAdded(_platform, _owner, _addedBy);
    }

    function _emitPlatformOwnerRemoved(address _platform, address _owner, address _removedBy) internal {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitPlatformOwnerRemoved(_platform, _owner, _removedBy);
    }

    function _emitPlatformAttached(address _platform, address _owner) internal {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitPlatformAttached(_platform, _owner);
    }

    function _emitPlatformDetached(address _platform, address _to) internal {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitPlatformDetached(_platform, _to);
    }

    function _emitCrowdsaleCampaignCreated(bytes32 symbol, address campaign) internal {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitCrowdsaleCampaignCreated(symbol, campaign);
    }

    function _emitCrowdsaleCampaignRemoved(bytes32 symbol, address campaign) internal {
        AssetsPlatformRegistryEmitter(getEventsHistory()).emitCrowdsaleCampaignRemoved(symbol, campaign);
    }

    function() {
        throw;
    }
}
