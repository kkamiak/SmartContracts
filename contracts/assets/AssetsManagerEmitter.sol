pragma solidity ^0.4.11;

import '../core/event/MultiEventsHistoryAdapter.sol';

/**
* @dev TODO
*/
contract AssetsManagerEmitter is MultiEventsHistoryAdapter {

    /** TODO */
    event Error(address indexed self, uint errorCode);

    /** TODO */
    event AssetOwnerAdded(address indexed self, address platform, bytes32 symbol, address owner);

    /** TODO */
    event AssetOwnerRemoved(address indexed self, address platform, bytes32 symbol, address owner);

    /** TODO */
    event TokenExtensionRequested(address indexed self, address platform, address tokenExtension);

    /** TODO */
    event TokenExtensionRegistered(address indexed self, address platform, address tokenExtension);

    /** TODO */
    event TokenExtensionUnregistered(address indexed self, address tokenExtension);

    /** Emitting events */

    function emitError(uint errorCode) {
        Error(_self(), errorCode);
    }

    function emitAssetOwnerAdded(address _platform, bytes32 _symbol, address _owner) {
        AssetOwnerAdded(_self(), _platform, _symbol, _owner);
    }

    function emitAssetOwnerRemoved(address _platform, bytes32 _symbol, address _owner) {
        AssetOwnerRemoved(_self(), _platform, _symbol, _owner);
    }

    function emitTokenExtensionRequested(address _platform, address _tokenExtension) {
        TokenExtensionRequested(_self(), _platform, _tokenExtension);
    }

    function emitTokenExtensionRegistered(address _platform, address _tokenExtension) {
        TokenExtensionRegistered(_self(), _platform, _tokenExtension);
    }

    function emitTokenExtensionUnregistered(address _tokenExtension) {
        TokenExtensionUnregistered(_self(), _tokenExtension);
    }
}
