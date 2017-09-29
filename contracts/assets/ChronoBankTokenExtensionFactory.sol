pragma solidity ^0.4.11;

import "./TokenManagementExtension.sol";

/**
* @dev TODO
*/
contract ChronoBankTokenExtensionFactory {

    /** TODO */
    address contractsManager;

    function ChronoBankTokenExtensionFactory(address _contractsManager) {
        contractsManager = _contractsManager;
    }

    /**
    * @dev TODO
    */
    function createTokenExtension(address _platform) public returns (address) {
        TokenManagementExtension tokenExtension = new TokenManagementExtension(_platform, contractsManager);
        return tokenExtension;
    }
}
