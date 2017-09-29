pragma solidity ^0.4.11;

import "../core/platform/ChronoBankPlatformInterface.sol";
import "../core/platform/ChronoBankAssetOwnershipManager.sol";
import "../core/platform/ChronoBankAssetProxyInterface.sol";
import "../core/common/OwnedInterface.sol";
import "../core/contracts/ContractsManagerInterface.sol";
import "../core/erc20/ERC20ManagerInterface.sol";
import "../core/erc20/ERC20Interface.sol";
import "./AssetsManagerInterface.sol";
import "./TokenManagementInterface.sol";


contract ChronoBankAsset {
    function init(ChronoBankAssetProxyInterface _proxy) returns (bool);
}


contract TokenFactory {
    function createAsset() returns (address);
    function createAssetWithFee(address owner) returns (address);
    function createProxy() returns (address);
}


contract PlatformFactory {
    function createPlatform(address _eventsHistory, address _owner) returns (address);
}


contract FactoryProvider {
    function getTokenFactory() returns (TokenFactory);
}


contract CrowdsaleManager {
    function createCrowdsale(address _creator, bytes32 _symbol, bytes32 _factoryName) returns (address, uint);
    function deleteCrowdsale(address crowdsale) returns (uint);
}


contract BaseCrowdsale {
    function getSymbol() constant returns (bytes32);
}


contract OwnedContract {
    address public contractOwner;
}


/**
* @dev TODO
*/
contract BaseTokenManagementExtension is TokenManagementInterface {
    uint constant OK = 1;
    uint constant UNAUTHORIZED = 0;
    uint constant ERROR_TOKEN_EXTENSION_ASSET_TOKEN_EXISTS = 23001;
    uint constant ERROR_TOKEN_EXTENSION_ASSET_COULD_NOT_BE_REISSUED = 23002;
    uint constant ERROR_TOKEN_EXTENSION_ASSET_COULD_NOT_BE_REVOKED = 23003;
    uint constant ERROR_TOKEN_EXTENSION_ASSET_OWNER_ONLY = 23004;

    event Error(address indexed self, uint errorCode);
    event AssetCreated(address indexed self, address platform, bytes32 symbol, address token);
    event AssetOwnershipClaimRequired(address indexed self, address asset, address owner);
    event CrowdsaleCampaignCreated(address indexed self, address platform, bytes32 symbol, address campaign);
    event CrowdsaleCampaignRemoved(address indexed self, address platform, bytes32 symbol, address campaign);

    address public platform;
    address serviceProvider;

    /**
    * @dev TODO
    */
    modifier onlyPlatformOwner() {
        if (OwnedContract(platform).contractOwner() == msg.sender ||
            msg.sender == address(this)) {
            _;
        }
    }

    /**
    * @dev TODO
    */
    modifier onlyPlatform() {
        if (msg.sender == platform ||
            msg.sender == address(this)) {
            _;
        }
    }

    /**
    * @dev TODO
    */
    function BaseTokenManagementExtension(address _platform, address _serviceProvider) {
        platform = _platform;
        serviceProvider = _serviceProvider;
    }

    /**
    * @dev TODO
    */
    function setServiceProvider(address _serviceProvider) onlyPlatformOwner public returns (uint) {
        require(_serviceProvider != 0x0);

        serviceProvider = _serviceProvider;
        return OK;
    }

    /**
    * @dev TODO
    */
    function assetOwnershipChanged(address _platform, bytes32 _symbol, address _from, address _to) onlyPlatform public {
        if (_from == _to) {
            return;
        }

        if (_from != 0x0) {
            lookupAssetsRegistry().removeRecordForAssetOwner(_symbol, _platform, _from);
        }
        if (_to != 0x0) {
            lookupAssetsRegistry().addRecordForAssetOwner(_symbol, _platform, _to);
        }
    }

    /**
    * @dev TODO
    */
    function createAsset(bytes32 _symbol, string _name, string _description, uint _value, uint8 _decimals, bool _isMint, bool _withFee) onlyPlatformOwner public returns (uint resultCode) {
        require(_symbol != bytes32(0));

        ERC20ManagerInterface _erc20Manager = ERC20ManagerInterface(lookupService("ERC20Manager"));
        if (_erc20Manager.getTokenAddressBySymbol(_symbol) != 0x0) {
            return _emitError(ERROR_TOKEN_EXTENSION_ASSET_TOKEN_EXISTS);
        }

        address _token;
        (resultCode, _token) = _createNewAsset(_erc20Manager, _symbol, _name, _description, _value, _decimals, _isMint, _withFee);
        if (resultCode != OK) {
            return _emitError(resultCode);
        }

        AssetCreated(this, platform, _symbol, _token);
        return OK;
    }


    /**
    * Creates crowdsale campaign of a token with provided symbol
    *
    * @param _symbol a token symbol
    *
    * @return result code of an operation
    */
    function createCrowdsaleCampaign(bytes32 _symbol, bytes32 _crowdsaleFactoryName) public returns (uint) {
        ChronoBankAssetOwnershipManager _assetOwnershipManager = ChronoBankAssetOwnershipManager(getAssetOwnershipManager());
        if (!_assetOwnershipManager.hasAssetRights(msg.sender, _symbol)) {
            return _emitError(UNAUTHORIZED);
        }

        CrowdsaleManager crowdsaleManager = CrowdsaleManager(lookupService("CrowdsaleManager"));

        var (_crowdsale, result) = crowdsaleManager.createCrowdsale(msg.sender, _symbol, _crowdsaleFactoryName);
        if (result != OK) {
            return _emitError(result);
        }

        result = _assetOwnershipManager.addAssetPartOwner(_symbol, _crowdsale);
        if (result != OK) {
            return _emitError(result);
        }

        CrowdsaleCampaignCreated(this, platform, _symbol, _crowdsale);
        return OK;
    }

    /**
    * Stops token's crowdsale
    *
    * @param _crowdsale a crowdsale address
    *
    * @return result result code of an operation
    */
    function deleteCrowdsaleCampaign(address _crowdsale) public returns (uint result) {
        bytes32 _symbol = BaseCrowdsale(_crowdsale).getSymbol();
        ChronoBankAssetOwnershipManager _assetOwnershipManager = ChronoBankAssetOwnershipManager(getAssetOwnershipManager());
        if (!_assetOwnershipManager.hasAssetRights(msg.sender, _symbol)) {
            return _emitError(UNAUTHORIZED);
        }

        CrowdsaleManager crowdsaleManager = CrowdsaleManager(lookupService("CrowdsaleManager"));

        result = crowdsaleManager.deleteCrowdsale(_crowdsale);
        if (result != OK) {
            return _emitError(result);
        }

        result = _assetOwnershipManager.removeAssetPartOwner(_symbol, _crowdsale);
        if (result != OK) {
            return _emitError(result);
        }

        CrowdsaleCampaignRemoved(this, platform, _symbol, _crowdsale);
        return OK;
    }

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
        TokenFactory factory = lookupFactoryProvider().getTokenFactory();
        token = factory.createProxy();

        errorCode = ChronoBankPlatformInterface(platform).issueAsset(symbol, value, name, description, decimals, isMint);
        if (errorCode != OK) {
            return (errorCode, 0x0);
        }

        address asset;
        if (withFee) {
            asset = factory.createAssetWithFee(msg.sender);
        } else {
            asset = factory.createAsset();
        }

        errorCode = ChronoBankPlatformInterface(platform).setProxy(token, symbol);
        if (errorCode != OK) {
            return (errorCode, 0x0);
        }

        ChronoBankAssetOwnershipManager _assetOwnershipManager = ChronoBankAssetOwnershipManager(getAssetOwnershipManager());

        ChronoBankAssetProxyInterface(token).init(platform, bytes32ToString(symbol), name);
        ChronoBankAssetProxyInterface(token).proposeUpgrade(asset);
        ChronoBankAsset(asset).init(ChronoBankAssetProxyInterface(token));
        _assetCreationSetupFinished(symbol, platform, token, msg.sender);
        _assetOwnershipManager.addAssetPartOwner(symbol, this);
        _assetOwnershipManager.changeOwnership(symbol, msg.sender);
        if (value > 0 && !ERC20Interface(token).transfer(msg.sender, value)) {
            revert();
        }

        // if with fee then fire an event that ownership assignment is required
        if (withFee) {
            AssetOwnershipClaimRequired(this, asset, msg.sender);
        }

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
        errorCode = ERC20ManagerInterface(erc20Manager).addToken(token, bytes32(0), symbol, bytes32(0), decimals, bytes32(0), bytes32(0));
    }

    /**
    * @dev TODO
    */
    function lookupService(bytes32 _identifier) internal constant returns (address manager) {
        manager = ContractsManagerInterface(serviceProvider).getContractAddressByType(_identifier);
        if (manager == 0x0) {
            revert();
        }
    }

    /**
    * @dev TODO
    */
    function lookupFactoryProvider() internal constant returns (FactoryProvider) {
        return FactoryProvider(lookupService("AssetsManager"));
    }

    /**
    * @dev TODO
    */
    function lookupAssetsRegistry() internal constant returns (AssetsRegistry) {
        return AssetsRegistry(lookupService("AssetsManager"));
    }

    // TODO: ahiatsevich - move to library
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

    /**
    * TODO
    * @dev no-op and implement in inhereted contracts
    */
    function _assetCreationSetupFinished(bytes32 _symbol, address _platform, address _token, address _sender) internal {
    }

    function _emitError(uint _errorCode) internal returns (uint) {
        Error(this, _errorCode);
        return _errorCode;
    }
}
