pragma solidity ^0.4.11;

import '../core/event/MultiEventsHistoryAdapter.sol';

contract AssetsPlatformRegistryEmitter is MultiEventsHistoryAdapter {
    event Error(address indexed self, uint errorCode);
    event PlatformOwnerAdded(address indexed self, address platform, address owner, address addedBy);
    event PlatformOwnerRemoved(address indexed self, address platform, address owner, address removedBy);
    event PlatformAttached(address indexed self, address platform, address owner);
    event PlatformDetached(address indexed self, address platform, address to);
    event CrowdsaleCampaignCreated(address indexed self, bytes32 symbol, address campaign);
    event CrowdsaleCampaignRemoved(address indexed self, bytes32 symbol, address campaign);

    function emitError(uint errorCode) {
        Error(_self(), errorCode);
    }

    function emitPlatformOwnerAdded(address platform, address owner, address addedBy) {
        PlatformOwnerAdded(_self(), platform, owner, addedBy);
    }

    function emitPlatformOwnerRemoved(address platform, address owner, address removedBy) {
        PlatformOwnerRemoved(_self(), platform, owner, removedBy);
    }

    function emitPlatformAttached(address platform, address owner) {
        PlatformAttached(_self(), platform, owner);
    }

    function emitPlatformDetached(address platform, address to) {
        PlatformDetached(_self(), platform, to);
    }

    function emitCrowdsaleCampaignCreated(bytes32 symbol, address campaign) {
        CrowdsaleCampaignCreated(_self(), symbol, campaign);
    }

    function emitCrowdsaleCampaignRemoved(bytes32 symbol, address campaign) {
        CrowdsaleCampaignRemoved(_self(), symbol, campaign);
    }
}
