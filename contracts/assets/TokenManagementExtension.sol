pragma solidity ^0.4.11;

import "./BaseTokenManagementExtension.sol";

/**
* @dev TODO
*/
contract TokenManagementExtension is BaseTokenManagementExtension {

    function TokenManagementExtension(address _platform, address _serviceProvider) BaseTokenManagementExtension(_platform, _serviceProvider) {
    }

    /**
    * @dev TODO
    */
    function getAssetOwnershipManager() constant returns (address) {
        return platform;
    }

    /**
    * @dev TODO
    */
    function getReissueAssetProxy() constant returns (ReissuableAssetProxyInterface) {
        return ReissuableAssetProxyInterface(platform);
    }

    /**
    * @dev TODO
    */
    function getRevokeAssetProxy() constant returns (RevokableAssetProxyInterface) {
        return RevokableAssetProxyInterface(platform);
    }
}
