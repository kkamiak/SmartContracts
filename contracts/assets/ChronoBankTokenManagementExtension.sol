pragma solidity ^0.4.11;

import "./BaseTokenManagementExtension.sol";
import "../core/platform/ChronoBankPlatformInterface.sol";
import "../core/erc20/ERC20Interface.sol";
import "../core/erc20/ERC20ManagerInterface.sol";
import "../core/common/Owned.sol";
import "../core/common/OwnedInterface.sol";
import "./TokenExtensionFallbackInterface.sol";


contract ChronoBankTokenManagementExtension is BaseTokenManagementExtension, Owned {

    /** Error codes */

    uint constant ERROR_TOKEN_EXTENSION_CANNOT_PASS_PLATFORM_OWNERSHIP = 23051;
    uint constant ERROR_TOKEN_EXTENSION_CANNOT_CLAIM_PLATFORM_OWNERSHIP = 23052;
    uint constant ERROR_TOKEN_EXTENSION_SENDER_DOES_NOT_SUPPORT_ASSET_FALLBACK = 23053;
    uint constant ERROR_TOKEN_EXTENSION_CANNOT_PASS_ASSET_OWNERSHIP = 23054;
    uint constant ERROR_TOKEN_EXTENSION_CANNOT_CLAIM_ASSET_OWNERSHIP = 23055;

    /**
    * @dev TODO
    */
    struct Asset {
        address owner;
        mapping (address => bool) partowners;
    }

    /**
    * @dev TODO
    */
    mapping (bytes32 => Asset) assets;

    /**
    * @dev TODO
    */
    modifier onlyPlatformOwner() {
        if (msg.sender == contractOwner) {
            _;
        }
    }

    /**
    * @dev TODO
    */
    modifier onlyAssetRootOwner(bytes32 _symbol) {
        if (assets[_symbol].owner == msg.sender) {
            _;
        }
    }

    function ChronoBankTokenManagementExtension(address _platform, address _serviceProvider)
    BaseTokenManagementExtension(_platform, _serviceProvider)
    Owned() {
    }

    /**
    * @dev TODO
    */
    function passPlatformOwnership(address _to) onlyContractOwner public returns (uint) {
        if (!OwnedInterface(platform).changeContractOwnership(_to)) {
            return _emitError(ERROR_TOKEN_EXTENSION_CANNOT_PASS_PLATFORM_OWNERSHIP);
        }
        return OK;
    }

    /**
    * @dev TODO
    */
    function claimPlatformOwnership() public returns (uint) {
        if (!OwnedInterface(platform).claimContractOwnership()) {
            return _emitError(ERROR_TOKEN_EXTENSION_CANNOT_CLAIM_PLATFORM_OWNERSHIP);
        }

        return OK;
    }

    /**
    * @dev TODO
    */
    function claimAssetOwnership(bytes32 _symbol) onlyContractOwner public returns (uint) {
        ChronoBankPlatformInterface _platform = ChronoBankPlatformInterface(platform);
        if (!_platform.isCreated(_symbol) || _platform.isOwner(this, _symbol)) {
            return _emitError(ERROR_TOKEN_EXTENSION_CANNOT_CLAIM_ASSET_OWNERSHIP);
        }

        address _owner = _platform.owner(_symbol);
        assets[_symbol].owner = _owner;
        this.assetOwnershipChanged(address(_platform), _symbol, 0x0, _owner);

        return OK;
    }

    /**
    * @dev TODO
    */
    function passAssetOwnership(bytes32 _symbol) onlyContractOwner public returns (uint) {
        address _owner = assets[_symbol].owner;
        if (_owner == 0x0) {
            return _emitError(ERROR_TOKEN_EXTENSION_CANNOT_PASS_ASSET_OWNERSHIP);
        }

        return ChronoBankPlatformInterface(platform).changeOwnership(_symbol, _owner);
    }

    /**
    * @dev TODO
    */
    function checkIsOnlyOneOfOwners(bytes32 _symbol) internal constant returns (uint errorCode) {
        if (hasAssetRights(msg.sender, _symbol)) {
            return OK;
        }
        return _emitError(UNAUTHORIZED);
    }

    /**
    * @dev TODO
    */
    function getAssetOwnershipManager() public constant returns (address) {
        return this;
    }

    /**
    * @dev TODO
    */
    function getReissueAssetProxy() constant returns (ReissuableAssetProxyInterface) {
        return ReissuableAssetProxyInterface(this);
    }

    /**
    * @dev TODO
    */
    function getRevokeAssetProxy() constant returns (RevokableAssetProxyInterface) {
        return RevokableAssetProxyInterface(platform);
    }

    /**
    * @dev TODO
    */
    function assetOwnershipListener() public constant returns (address) {
        return this;
    }

    /**
    * @dev TODO
    */
    function setAssetOwnershipListener(address _listener) public returns (uint errorCode) {
        revert();
    }

    /**
    * @dev TODO
    */
    function removeAssetPartOwner(bytes32 _symbol, address _partowner) public returns (uint errorCode) {
        require(_symbol != bytes32(0));
        require(_partowner != 0x0);

        errorCode = checkIsOnlyOneOfOwners(_symbol);
        if (errorCode != OK) {
            return errorCode;
        }

        delete assets[_symbol].partowners[_partowner];
        this.assetOwnershipChanged(platform, _symbol, _partowner, 0x0);
    }

    /**
    * @dev TODO
    */
    function addAssetPartOwner(bytes32 _symbol, address _partowner) public returns (uint errorCode) {
        require(_symbol != bytes32(0));
        require(_partowner != 0x0);

        errorCode = checkIsOnlyOneOfOwners(_symbol);
        if (errorCode != OK) {
            return errorCode;
        }

        assets[_symbol].partowners[_partowner] = true;
        this.assetOwnershipChanged(platform, _symbol, 0x0, _partowner);
    }

    /**
    * @dev TODO
    */
    function changeOwnership(bytes32 _symbol, address _newOwner) onlyAssetRootOwner(_symbol) public returns(uint errorCode) {
        require(_symbol != bytes32(0));
        require(_newOwner != 0x0);

        address oldOwner = assets[_symbol].owner;
        assets[_symbol].owner = _newOwner;
        this.assetOwnershipChanged(platform, _symbol, oldOwner, _newOwner);
        return OK;
    }

    /**
    * @dev TODO
    */
    function hasAssetRights(address _owner, bytes32 _symbol) public constant returns (bool) {
        return ChronoBankPlatformInterface(platform).isCreated(_symbol) &&
        (assets[_symbol].owner == _owner || assets[_symbol].partowners[_owner]);
    }

    /**
    * @dev TODO
    */
    function addPartOwner(address _partowner) onlyContractOwner public returns (uint) {
        revert();
    }

    /**
    * @dev TODO
    */
    function removePartOwner(address _partowner) onlyContractOwner public returns (uint) {
        revert();
    }

    /**
    * @dev TODO
    */
    function reissueAsset(bytes32 _symbol, uint _value) public returns (uint errorCode) {
        errorCode = checkIsOnlyOneOfOwners(_symbol);
        if (errorCode != OK) {
            return errorCode;
        }

        bool isContract;
        assembly {
            /* SECURITY NOTE: Despite the fact that `extcodesize` can return 0 size for contracts during its constructor invocation
                we are sure that this code can be reached only after full contract initialization
            */
            isContract := gt(extcodesize(caller), 0)
        }

        /* @dev for now only for contract invocations */
        if (!isContract) {
            revert();
        }

        TokenExtensionFallbackInterface assetFallback = TokenExtensionFallbackInterface(msg.sender);
        if (!assetFallback.fallbackAsset(_symbol)) {
            return _emitError(ERROR_TOKEN_EXTENSION_SENDER_DOES_NOT_SUPPORT_ASSET_FALLBACK);
        }

        if (ChronoBankPlatformInterface(platform).changeOwnership(_symbol, msg.sender) != OK) {
            revert();
        }

        if (!assetFallback.fallbackAssetInvoke(_symbol, platform, msg.data)) {
            revert();
        }

        if (!assetFallback.fallbackAssetPassOwnership(_symbol, address(this))) {
            revert();
        }

        if (ChronoBankPlatformInterface(platform).owner(_symbol) != address(this)) {
            revert();
        }

        return OK;
    }

    /**
    * @dev TODO
    */
    function _assetCreationSetupFinished(bytes32 _symbol, address _platform, address _token, address _sender) internal {
        assets[_symbol].owner = address(this);
        assets[_symbol].partowners[address(this)] = true;
    }
}
