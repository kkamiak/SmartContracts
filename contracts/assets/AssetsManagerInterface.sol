pragma solidity ^0.4.11;

contract AssetsManagerInterface {
    function isAssetSymbolExists(bytes32 _symbol) constant returns (bool);

    function isAssetOwner(bytes32 _symbol, address _user) constant returns (bool);
    function getAssetBySymbol(bytes32 _symbol) constant returns (address);

    function getAssetsForOwnerCount(address _platform, address _owner) constant returns (uint);
    function getAssetForOwnerAtIndex(address _platform, address _owner, uint idx) constant returns (bytes32);

    function getTokenExtension(address _platform) constant returns (address);
    function requestTokenExtension(address _platform) returns (uint);
}


contract TokenExtensionRegistry {
    function containsTokenExtension(address _tokenExtension) public constant returns (bool);
}
