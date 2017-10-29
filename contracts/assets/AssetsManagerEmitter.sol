pragma solidity ^0.4.11;

import '../core/event/MultiEventsHistoryAdapter.sol';

/**
* @dev TODO
*/
contract AssetsManagerEmitter is MultiEventsHistoryAdapter {

    /** TODO */
    event Error(address indexed self, uint errorCode);

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
