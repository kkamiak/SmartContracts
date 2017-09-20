pragma solidity ^0.4.11;

import "./AssetsProviderInterface.sol";

contract AssetsManagerInterface is AssetsProviderInterface {
    function sendAsset(bytes32 _symbol, address _to, uint _value) returns (bool);
    function reissueAsset(bytes32 _symbol, uint _value) returns (bool);
    function revokeAsset(bytes32 _symbol, uint _value) returns (bool);
    function requestNewAsset(bytes32 _symbol) returns (uint errorCode);
    function redeemNewAsset(uint _requestId, string _name, string _description, uint _value, uint8 _decimals, bool _isMint, bool _withFee) returns (uint errorCode);

    function getAssetBySymbol(bytes32 symbol) constant returns (address);
    function getAssetsForOwner(address owner) constant returns (bytes32[]);
    function getAssetsForOwnerCount(address owner) constant returns (uint);
    function getAssetForOwnerAtIndex(address owner, uint _index) constant returns (bytes32);

    function getPlatformRegistry() constant returns (address);
}
