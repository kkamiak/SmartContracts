pragma solidity ^0.4.11;

import '../core/event/MultiEventsHistoryAdapter.sol';

/**
* Emitter with support of events history for PlatformsManager
*/
contract PlatformsManagerEmitter is MultiEventsHistoryAdapter {

    /**
    * @dev TODO
    */
    event PlatformAttached(address indexed self, uint platformId, address platform);

    /**
    * @dev TODO
    */
    event PlatformDetached(address indexed self, uint platformId, address platform);

    /**
    * @dev TODO
    */
    event PlatformRequested(address indexed self, uint platformId, address platform, address tokenExtension);

    /**
    * @dev TODO
    */
    event PlatformReplaced(address indexed self, uint platformId, address fromPlatform, address toPlatform);

    /**
    * @dev TODO
    */
    event Error(address indexed self, uint errorCode);

    /**
    * Emitting events
    */

    function emitPlatformAttached(uint _platformId, address _platform) {
        PlatformAttached(_self(), _platformId, _platform);
    }

    function emitPlatformDetached(uint _platformId, address _platform) {
        PlatformDetached(_self(), _platformId, _platform);
    }

    function emitPlatformRequested(uint _platformId, address _platform, address _tokenExtension) {
        PlatformRequested(_self(), _platformId, _platform, _tokenExtension);
    }

    function emitPlatformReplaced(uint _platformId, address _fromPlatform, address _toPlatform) {
        PlatformReplaced(_self(), _platformId, _fromPlatform, _toPlatform);
    }

    function emitError(uint _errorCode) {
        Error(_self(), _errorCode);
    }
}
