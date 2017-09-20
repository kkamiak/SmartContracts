pragma solidity ^0.4.11;

contract PlatformRegistryInterface {
    function addPlatformOwner(address _owner) returns (uint errorCode);
    function removePlatformOwner(address _owner) returns (uint errorCode);

    function isAssetOwner(bytes32 _symbol, address _owner) constant returns (bool);
    function getAssetOwners(bytes32 _symbol) constant returns (address[] result);

    function createCrowdsaleCampaign(bytes32 _symbol) returns (uint);
    function deleteCrowdsaleCampaign(address _crowdsale) returns (uint);

    function attachPlatform(address _platform, address _owner) returns (uint errorCode);
    function detachPlatform(address _platform) returns (uint errorCode);

    function getPlatformForUser(address _user) constant returns (address);
    function getPlatformsDelegatedOwner() constant returns (address);
}


contract DelegatedPlatformOwner {
    function capturePlatformOwnership(address _platform) returns (uint errorCode);
    function resignPlatformOwnership(address _platform, address _to) returns (uint errorCode);
}
