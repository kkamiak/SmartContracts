pragma solidity ^0.4.11;

import "../core/common/BasePlatformsManager.sol";
import "./AssetsManagerInterface.sol";
import {ERC20ManagerInterface as ERC20Manager} from "../core/erc20/ERC20ManagerInterface.sol";
import "../core/platform/ChronoBankPlatformInterface.sol";
import "../core/platform/ChronoBankAssetInterface.sol";
import "../core/platform/ChronoBankAssetProxyInterface.sol";
import "../core/erc20/ERC20Interface.sol";
import "../core/common/OwnedInterface.sol";
import "./AssetsManagerEmitter.sol";
import "./PlatformRegistryInterface.sol";
import "./AssetsProviderInterface.sol";

contract ChronoBankAsset {
    function init(ChronoBankAssetProxyInterface _proxy) returns (bool);
}

contract ProxyFactory {
    function createAsset() returns(address);
    function createAssetWithFee(address owner) returns(address);
    function createProxy() returns(address);
}


contract PlatformFactory {
    function createPlatform(address _eventsHistory, address _owner) returns(address);
}


/**
* @title Contract provides a way to manage assets and platforms for different users
*/
contract AssetsManager is AssetsManagerInterface, AssetsManagerEmitter, BasePlatformsManager, DelegatedPlatformOwner {
    uint constant ERROR_ASSETS_INVALID_INVOCATION = 11000;
    uint constant ERROR_ASSETS_TOKEN_EXISTS = 11001;
    uint constant ERROR_ASSETS_CANNOT_CLAIM_PLATFORM_OWNERSHIP = 11002;
    uint constant ERROR_ASSETS_WRONG_PLATFORM = 11003;
    uint constant ERROR_ASSETS_NOT_A_PROXY = 11004;
    uint constant ERROR_ASSETS_CANNOT_ADD_TO_REGISTRY = 11005;
    uint constant ERROR_ASSETS_CANNOT_PASS_PLATFORM_OWNERSHIP = 11006;
    uint constant ERROR_ASSETS_CANNOT_FIND_REQUEST_FOR_CREATION = 11007;
    uint constant ERROR_ASSETS_CANNOT_PASS_ASSET_OWNERSHIP = 11008;
    uint constant ERROR_ASSETS_CANNOT_CLAIM_ASSET_OWNERSHIP = 11009;

    StorageInterface.Address proxyFactory;
    StorageInterface.Address platformFactory;
    StorageInterface.Address platformRegistry;
    StorageInterface.Bytes32SetMapping platformToAssets;
    StorageInterface.UIntBytes32Mapping pendingNewAssetIds;
    StorageInterface.UInt pendingIdsCounter;

    modifier onlyAssetOwner(bytes32 _symbol) {
        if (PlatformRegistryInterface(getPlatformRegistry()).isAssetOwner(_symbol, msg.sender)) {
            _;
        }
    }

    modifier onlyRegistry() {
        if (msg.sender == store.get(platformRegistry)) {
            _;
        }
    }

    modifier onlyContractOwnerOrRegistry() {
        if (msg.sender == contractOwner ||
            msg.sender == store.get(platformRegistry)) {
            _;
        }
    }

    function AssetsManager(Storage _store, bytes32 _crate) BasePlatformsManager(_store, _crate) {
        proxyFactory.init("proxyFactory");
        platformFactory.init("platformFactory");
        platformRegistry.init("platformRegistry");
        pendingNewAssetIds.init("pendingNewAssetIds");
        pendingIdsCounter.init("pendingIdCounter");

        platformToAssets.init('platformToAssets');
    }

    function init(address _contractsManager, address _proxyFactory, address _platformFactory, address _platformRegistry) onlyContractOwner returns (uint) {
        BasePlatformsManager.init(_contractsManager, "AssetsManager");

        store.set(proxyFactory, _proxyFactory);
        store.set(platformFactory, _platformFactory);
        store.set(platformRegistry, _platformRegistry);
        return OK;
    }

    /* DelegatedPlatformOwnerInterface */

    /**
    * Claims an ownership of a platform for AssetsManager
    *
    * @param _platform address of a target platform
    *
    * @return errorCode result code of an operation
    */
    function capturePlatformOwnership(address _platform) returns (uint errorCode) {
        if (!OwnedInterface(_platform).claimContractOwnership()) {
            return _emitError(ERROR_ASSETS_CANNOT_CLAIM_PLATFORM_OWNERSHIP);
        }
        return OK;
    }

    /**
    * Resigns an ownership of a platform from itself to a destination address
    * @dev Allowed only for contract owner or platform registry contract
    *
    * @param _platform address of a platform
    * @param _to destination address, possible owner
    *
    * @return errorCode result code of an operation
    */
    function resignPlatformOwnership(address _platform, address _to) onlyContractOwnerOrRegistry returns (uint errorCode) {
        if (!OwnedInterface(_platform).changeContractOwnership(_to)) {
            return _emitError(ERROR_ASSETS_CANNOT_PASS_PLATFORM_OWNERSHIP);
        }
        return OK;
    }

    /**
    * Captures an ownership of an asset
    * @dev A caller is responsible for being sure that an asset with provided symbol is a contract
    * inherits from `Owned` contract
    *
    * @param _symbol asset's symbol
    *
    * @return errorCode result code
    */
    function captureAssetContractOwnership(bytes32 _symbol) returns (uint errorCode) {
        address _asset = ChronoBankAssetProxyInterface(_assetWithSymbol(_symbol)).getLatestVersion();
        if (!OwnedInterface(_asset).claimContractOwnership()) {
            return _emitError(ERROR_ASSETS_CANNOT_CLAIM_ASSET_OWNERSHIP);
        }
        return OK;
    }

    /**
    * Passes an ownership of an asset to a new owner
    * @dev This is an opposite method to `captureAssetContractOwnership` and have the same restriction
    * and requirements about contract inheritance. Can be performed only by asset owner
    *
    * @param _symbol asset's symbol
    * @param _to destination, new owner's address
    *
    * @return errorCode result code
    */
    function resignAssetContractOwnership(bytes32 _symbol, address _to) onlyAssetOwner(_symbol) returns (uint errorCode) {
        address _asset = ChronoBankAssetProxyInterface(_assetWithSymbol(_symbol)).getLatestVersion();
        if (!OwnedInterface(_asset).changeContractOwnership(_to)) {
            return _emitError(ERROR_ASSETS_CANNOT_PASS_PLATFORM_OWNERSHIP);
        }
        return OK;
    }

    /* AssetsProviderInterface */

    /**
    * Shows if a provided symbol exists in a system
    * @dev Currently it checks if there are any asset with such symbol in ERC20Manager
    *
    * @param _symbol asset's symbol
    *
    * @return `true` if there is such symbol, `false` otherwise
    */
    function isAssetSymbolExists(bytes32 _symbol) constant returns (bool) {
        return _isAssetSymbolExistsGlobally(_symbol);
    }

    /**
    * Gets an address of a platform registry
    *
    * @return address of a platform registry
    */
    function getPlatformRegistry() constant returns (address) {
        return store.get(platformRegistry);
    }

    /**
    * Gets an asset's balance owned by this contract
    *
    * @param _symbol asset's symbol
    *
    * @return balance of an asset
    */
    function getAssetBalance(bytes32 _symbol) constant returns (uint) {
        return ERC20Interface(_assetWithSymbol(_symbol)).balanceOf(this);
    }

    /**
    * Gets an asset address by a provided symbol
    *
    * @param _symbol asset's symbol
    *
    * @return address of an asset
    */
    function getAssetBySymbol(bytes32 _symbol) constant returns (address) {
        return _assetWithSymbol(_symbol);
    }

    /**
    * Gets a list of assets' symbols for a given owner
    *
    * @param _owner an owner of assets
    *
    * @return result an array of symbols owned by a user
    */
    function getAssetsForOwner(address _owner) constant returns (bytes32[] result) {
        address _platform = _platformForUser(_owner);
        if (_platform == 0x0) {
            return;
        }

        return store.get(platformToAssets, bytes32(_platform));
    }

    /**
    * Gets a number of asset owners
    *
    * @param _owner an user checked for owning assets
    *
    * @return number of assets
    */
    function getAssetsForOwnerCount(address _owner) constant returns (uint) {
        address _platform = _platformForUser(_owner);
        if (_platform == 0x0) {
            return;
        }

        return store.count(platformToAssets, bytes32(_platform));
    }

    /**
    * Gets a specific asset symbol owned by an user at the provided index
    * @dev Can be iterated by index
    *
    * @param _owner an user checked for owning assets
    * @param _index an index of asset's symbol in a sequence of user's assets
    *
    * @return an asset symbol
    */
    function getAssetForOwnerAtIndex(address _owner, uint _index) constant returns (bytes32) {
        address _platform = _platformForUser(_owner);
        if (_platform == 0x0) {
            return;
        }

        return store.get(platformToAssets, bytes32(_platform), _index);
    }

    /**
    * Gets a list of assets' symbols
    *
    * @return _assets an array of symbols
    */
    function getAssetsSymbols() constant returns (bytes32[] _assets) {
        _assets = new bytes32[](getAssetsSymbolsCount());
        StorageInterface.Iterator memory iterator = store.listIterator(platforms);
        address _platform;
        for (uint idx = 0; store.canGetNextWithIterator(platforms, iterator);) {
            _platform = store.getNextWithIterator(platforms, iterator);
            uint assetsCount = store.count(platformToAssets, bytes32(_platform));
            for (uint assetIdx = 0; assetIdx < assetsCount; ++assetIdx) {
                _assets[idx++] = store.get(platformToAssets, bytes32(_platform), assetIdx);
            }
        }
    }

    /**
    * Gets a number of symbols
    *
    * @return number of symbols
    */
    function getAssetsSymbolsCount() constant returns (uint count) {
        StorageInterface.Iterator memory iterator = store.listIterator(platforms);
        while (store.canGetNextWithIterator(platforms, iterator)) {
            count += store.count(platformToAssets, bytes32(store.getNextWithIterator(platforms, iterator)));
        }
        return count;
    }

    /**
    * Redirects transferring of a asset's value to a destination address
    * @dev Allowed only for asset owners
    *
    * @param _symbol asset's symbol
    * @param _to address of a destination
    * @param _value amount of assset's value
    *
    * @return `true` if success, otherwise `false`
    */
    function sendAsset(bytes32 _symbol, address _to, uint _value) onlyAssetOwner(_symbol) returns (bool) {
        return ERC20Interface(_assetWithSymbol(_symbol)).transfer(_to, _value);
    }

    /**
    * Redirects reissuance of asset to a user's platform
    * @dev Allowed only for asset owners
    *
    * @param _symbol asset's symbol
    * @param _value amount of value to reissue
    *
    * @return `true` if success, otherwise `false`
    */
    function reissueAsset(bytes32 _symbol, uint _value) onlyAssetOwner(_symbol) returns (bool) {
        address _platform = _platformForUser(msg.sender);
        return ChronoBankPlatformInterface(_platform).reissueAsset(_symbol, _value) == OK;
    }

    /**
    * Redirects revoking of asset for a value
    * @dev Allowed only for asset owners
    *
    * @param _symbol asset's symbol
    * @param _value amount of value to reduce
    *
    * @return `true` if success, otherwise `false`
    */
    function revokeAsset(bytes32 _symbol, uint _value) onlyAssetOwner(_symbol) returns (bool) {
        address _platform = _platformForUser(msg.sender);
        return ChronoBankPlatformInterface(_platform).revokeAsset(_symbol, _value) == OK;
    }

    /**
    * First step to create your own asset. Book a new asset with a symbol and get requestId
    * which can be used for redeeming actual asset
    *
    * @dev Users can request the same symbol multiple times but only the first one who redeem its requestId
    * will be able to create an asset with such symbol. Users who redeem a new asset
    * should have an associated platform whene this asset can be saved
    *
    *
    * @param _symbol new asset's symbol
    *
    * @return errorCode result code of an operation
    */
    function requestNewAsset(bytes32 _symbol) returns (uint errorCode) {
        if (_isAssetSymbolExistsGlobally(_symbol)) {
            return _emitError(ERROR_ASSETS_TOKEN_EXISTS);
        }

        PlatformFactory factory = PlatformFactory(store.get(platformFactory));
        address _platform = _platformForUser(msg.sender);
        if (_platform == 0x0) {
            _platform = factory.createPlatform(getEventsHistory(), this);
            PlatformRegistryInterface(store.get(platformRegistry)).attachPlatform(_platform, msg.sender);
        }

        uint requestId = store.get(pendingIdsCounter) + 1;
        store.set(pendingIdsCounter, requestId);
        store.set(pendingNewAssetIds, requestId, _symbol);
        _emitNewAssetRequested(_symbol, _platform, msg.sender, requestId);
        return OK;
    }

    /**
    * Second step to create a brand new asset. Allowes to specify additional information about asset and
    * take requestId that had been received on the previous step.
    *
    * @dev Can be performed by anyone who has a platform in a registry and have a valid requestId
    *
    * @param _requestId identifier from requestNewAsset step
    * @param _name name of an asset
    * @param _description short description of an asset
    * @param _value amount of tokens
    * @param _decimals number of digits after floating point
    * @param _isMint `true` if asset can be reissueable, `false` otherwise
    * @param _withFee 'true' if asset can produce fee, `false` otherwise
    *
    * @return errorCode result code of an operation
    */
    function redeemNewAsset(uint _requestId, string _name, string _description, uint _value, uint8 _decimals, bool _isMint, bool _withFee) returns (uint errorCode) {
        bytes32 _symbol = store.get(pendingNewAssetIds, _requestId);
        if (_symbol == bytes32(0)) {
            return _emitError(ERROR_ASSETS_CANNOT_FIND_REQUEST_FOR_CREATION);
        }

        address _erc20Manager = lookupManager("ERC20Manager");
        if (ERC20Manager(_erc20Manager).getTokenAddressBySymbol(_symbol) != 0x0) {
            return _emitError(ERROR_ASSETS_TOKEN_EXISTS);
        }

        address _token;
        (errorCode, _token) = _createNewAsset(_erc20Manager, _symbol, _name, _description, _value, _decimals, _isMint, _withFee);
        if (errorCode != OK) {
            return _emitError(errorCode);
        }

        store.set(pendingNewAssetIds, _requestId, bytes32(0));
        address _platfrom = _platformForUser(msg.sender);
        store.add(platformToAssets, bytes32(_platfrom), _symbol);
        _emitAssetCreated(_symbol, _token);
        return OK;
    }

    /* Helper functions */

    /**
    * Issues an asset in a platform and creates asset contract
    *
    * @param erc20Manager ERC20Manager interface compliant contract
    * @param symbol asset's symbol
    * @param name name of an asset
    * @param description short description of an asset
    * @param value amount of tokens
    * @param decimals number of digits after floating point
    * @param isMint `true` if asset can be reissueable, `false` otherwise
    * @param withFee 'true' if asset can produce fee, `false` otherwise
    *
    * @return {
        errorCode: result code
        token: address of a created token
    }
    */
    function _createNewAsset(address erc20Manager, bytes32 symbol, string name, string description, uint value, uint8 decimals, bool isMint, bool withFee) private returns(uint errorCode, address token) {
        ProxyFactory factory = ProxyFactory(store.get(proxyFactory));
        token = factory.createProxy();
        address platform = _platformForUser(msg.sender);

        errorCode = ChronoBankPlatformInterface(platform).issueAsset(symbol, value, name, description, decimals, isMint);
        if (errorCode != OK) {
            return (errorCode, 0x0);
        }

        address asset;
        if (withFee) {
            asset = factory.createAssetWithFee(this);
            asset.call(bytes4(keccak256("claimContractOwnership()")));
        } else {
            asset = factory.createAsset();
        }

        errorCode = ChronoBankPlatformInterface(platform).setProxy(token, symbol);
        if (errorCode != OK) {
            return (errorCode, 0x0);
        }

        ChronoBankAssetProxyInterface(token).init(platform, bytes32ToString(symbol), name);
        ChronoBankAssetProxyInterface(token).proposeUpgrade(asset);
        ChronoBankAsset(asset).init(ChronoBankAssetProxyInterface(token));

        errorCode = _addToken(erc20Manager, token, symbol, decimals);
        if (errorCode != OK) {
            return (errorCode, 0x0);
        }

        return (OK, token);
    }

    /**
    * Adds token to ERC20Manager contract
    * @dev Make as a separate function because of stack size limits
    *
    * @param erc20Manager ERC20Manager interface compliant contract
    * @param token token's address
    * @param symbol asset's symbol
    * @param decimals number of digits after floating point
    *
    * @return errorCode result code of an operation
    */
    function _addToken(address erc20Manager, address token, bytes32 symbol, uint8 decimals) private returns (uint errorCode) {
        errorCode = ERC20Manager(erc20Manager).addToken(token, bytes32(0), symbol, bytes32(0), decimals, bytes32(0), bytes32(0));
    }

    /* Helper functions */

    /**
    * Checks if asset with a provided symbol exists globally
    *
    * @param _symbol asset's symbol
    *
    * @return `true` if found, `false` otherwise
    */
    function _isAssetSymbolExistsGlobally(bytes32 _symbol) private constant returns (bool) {
        return _assetWithSymbol(_symbol) != 0x0;
    }

    /**
    * Get a platform where user is an owner
    *
    * @param _user user
    *
    * @return address of owned platform
    */
    function _platformForUser(address _user) private constant returns (address) {
        return PlatformRegistryInterface(store.get(platformRegistry)).getPlatformForUser(_user);
    }

    /*
    * Get token address for provided symbol
    *
    * @param _symbol token symbol
    *
    * @return address of assosiated token
    */
    function _assetWithSymbol(bytes32 _symbol) private constant returns (address) {
        address erc20Manager = lookupManager("ERC20Manager");
        return ERC20Manager(erc20Manager).getTokenAddressBySymbol(_symbol);
    }

    /** @dev TODO: Move to an external library */
    function bytes32ToString(bytes32 x) private constant returns (string) {
        bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }

    /* Events emitting */

    function _emitError(uint error) internal returns (uint) {
        AssetsManager(getEventsHistory()).emitError(error);
        return error;
    }

    function _emitNewAssetRequested(bytes32 symbol, address platform, address owner, uint requestId) internal {
        AssetsManagerEmitter(getEventsHistory()).emitNewAssetRequested(symbol, platform, owner, requestId);
    }

    function _emitAssetAdded(address asset, bytes32 symbol, address owner) internal {
        AssetsManagerEmitter(getEventsHistory()).emitAssetAdded(asset, symbol, owner);
    }

    function _emitAssetCreated(bytes32 symbol, address token) internal {
        AssetsManagerEmitter(getEventsHistory()).emitAssetCreated(symbol, token);
    }

    function() {
        throw;
    }
}
