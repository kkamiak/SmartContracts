pragma solidity ^0.4.11;

import "./ChronoBankPlatform.sol";

contract EventsHistory {
    function authorize(address _caller) returns(bool);
}

contract PlatformFactory {

    function createPlatform(EventsHistory history, address owner) returns(address) {
        ChronoBankPlatform platform = new ChronoBankPlatform();
        history.authorize(platform);
        platform.setupEventsHistory(history);
        platform.changeContractOwnership(owner);
        return platform;
    }

    function() {
        throw;
    }
}
