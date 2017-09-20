pragma solidity ^0.4.11;

import "../core/contracts/ContractsManagerInterface.sol";
import "../assets/PlatformRegistryInterface.sol";

contract AssetsPlatformRegistryMock is PlatformRegistryInterface {

    uint constant OK = 1;

    address contractsManager;
    address delegatedOwner;

    function init(address _contractsManager, address _delegatedOwner) returns (bool) {
        if(contractsManager != 0x0) {
            return false;
        }

        delegatedOwner = _delegatedOwner;

        uint errorCode = ContractsManagerInterface(_contractsManager).addContract(this, "PlatformRegistry");
        if(OK != errorCode) {
            return false;
        }

        contractsManager = _contractsManager;
        return true;
    }

    function addPlatformOwner(address _owner) returns (uint errorCode) {
        return OK;
    }

    function removePlatformOwner(address _owner) returns (uint errorCode)  {
        return OK;
    }

    function isAssetOwner(bytes32 _symbol, address _owner) constant returns (bool)  {
        return true;
    }

    function getAssetOwners(bytes32 _symbol) constant returns (address[] result) {
    }

    function attachPlatform(address _platform, address _owner) returns (uint errorCode) {
        return OK;
    }

    function detachPlatform(address _platform) returns (uint errorCode) {
        return OK;
    }

    function deleteCrowdsaleCampaign(address _crowdsale) returns (uint) {
        return OK;
    }

    function createCrowdsaleCampaign(bytes32 _symbol) returns (uint) {
        return OK;
    }

    function getPlatformForUser(address _user) constant returns (address) {

    }

    function getRegisteredPlatforms() constant returns (address[]) {

    }

    function getRegisteredPlatformsCount() constant returns (uint) {

    }

    function getPlatformsDelegatedOwner() constant returns (address) {

    }

    function() {
        throw;
    }
}
