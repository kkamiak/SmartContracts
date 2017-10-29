pragma solidity ^0.4.11;

import "./TokenExtensionFallbackInterface.sol";
import "../core/common/Managed.sol";
import "../core/platform/ChronoBankPlatformInterface.sol";
import "../assets/AssetsManagerInterface.sol";
import "../assets/TokenManagementInterface.sol";

contract ChronoBankWalletFallbackSupporter is Managed, TokenExtensionFallbackInterface {

    /**
    * TODO:
    */
    modifier onlyTokenExtension() {
        if (!TokenExtensionRegistry(lookupManager("AssetsManager")).containsTokenExtension(msg.sender)) {
            revert();
        }
        _;
    }

    function ChronoBankWalletFallbackSupporter(Storage _store, bytes32 _crate) Managed(_store, _crate) {
    }

    /**
    * TODO:
    */
    function fallbackAsset(bytes32 _symbol) public onlyTokenExtension returns (bool)  {
        return true;
    }

    /**
    * TODO:
    */
    function fallbackAssetInvoke(bytes32 _symbol, address _from, bytes _data) public onlyTokenExtension returns (bool) {
        return _from.call(_data);
    }

    /**
    * TODO:
    */
    function fallbackAssetPassOwnership(bytes32 _symbol, address _to) public onlyTokenExtension returns (bool) {
        address _platform = TokenManagementInterface(msg.sender).platform();
        return ChronoBankPlatformInterface(_platform).changeOwnership(_symbol, _to) == OK;
    }
}
