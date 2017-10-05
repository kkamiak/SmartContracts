pragma solidity ^0.4.11;

import "../core/contracts/ContractsManagerInterface.sol";


/**
* @dev TODO
*/
contract PlatformsManagerMock {

    event PlatformAttached(address indexed self, uint platformId, address platform);
    event PlatformDetached(address indexed self, uint platformId, address platform);
    /*event PlatformRequested(address indexed self, uint platformId, address platform, address tokenExtension);*/

    uint constant OK = 1;
    uint constant INVALID_INVOCATION = 123456789;
    address contractsManager;
    mapping (uint => address) idToPlatform;
    mapping (address => uint) platformToId;
    mapping (address => address) ownerToPlatform;
    uint idCounter = 1000;

    function init(address _contractsManager) public returns (uint) {
        if (contractsManager != 0x0) {
            return INVALID_INVOCATION;
        }

        uint errorCode = ContractsManagerInterface(_contractsManager).addContract(this, "PlatformsManager");
        if (OK != errorCode) {
            return errorCode;
        }

        contractsManager = _contractsManager;
        return OK;
    }

    function addPlatformWithId(address platform, uint id) public returns (uint) {
        idToPlatform[id] = platform;
        platformToId[platform] = id;
        return OK;
    }

    /**
    * @dev TODO
    */
    function getPlatformForUser(address _user) public constant returns (address) {
        return ownerToPlatform[_user];
    }

    /**
    * @dev TODO
    */
    function getPlatformWithId(uint _id) public constant returns (address) {
        return idToPlatform[_id];
    }

    /**
    * @dev TODO
    */
    function getIdForPlatform(address _platform) public constant returns (uint) {
        return platformToId[_platform];
    }

    /**
    * @dev TODO
    */
    function attachPlatform(address _platform) public returns (uint resultCode) {
        if (platformToId[_platform] != 0) {
            return INVALID_INVOCATION;
        }

        uint _id = idCounter + 1;
        platformToId[_platform] = _id;
        idToPlatform[_id] = _platform;
        idCounter = _id;

        PlatformAttached(this, _id, _platform);
        return OK;
    }

    /**
    * @dev TODO
    */
    function detachPlatform(address _platform) public returns (uint) {
        uint _platformId = platformToId[_platform];
        return _performDetachingPlatform(_platform, _platformId);
    }

    /**
    * @dev TODO
    */
    function detachPlatformWithId(uint _platformId) public returns (uint) {
        address _platform = idToPlatform[_platformId];
        return _performDetachingPlatform(_platform, _platformId);
    }

    /**
    * @dev TODO
    */
    function createPlatform() public returns (uint resultCode) {
        revert();
    }

    /**
    * @dev TODO
    */
    function _performDetachingPlatform(address _platform, uint _id) private returns (uint resultCode) {
        if (_id == 0) {
            return INVALID_INVOCATION;
        }

        delete platformToId[_platform];
        delete idToPlatform[_id];
        PlatformDetached(this, _id, _platform);
        return OK;
    }
}
