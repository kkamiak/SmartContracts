pragma solidity ^0.4.11;

contract PlatformsManagerInterface {
    function getPlatformForUser(address _user) public constant returns (address);
    function getPlatformWithId(uint _id) public constant returns (address);
    function getIdForPlatform(address _platform) public constant returns (uint);
}
