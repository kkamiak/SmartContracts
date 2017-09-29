pragma solidity ^0.4.11;

contract ReissuableAssetProxyInterface {
    function reissueAsset(bytes32 _symbol, uint _value) returns(uint errorCode);
}

contract RevokableAssetProxyInterface {
    function revokeAsset(bytes32 _symbol, uint _value) returns(uint errorCode);
}

contract TokenManagementInterface {
    address public platform;
    function createAsset(bytes32 symbol, string _name, string _description, uint _value, uint8 _decimals, bool _isMint, bool _withFee) returns (uint);

    function getAssetOwnershipManager() constant returns (address);
    function getReissueAssetProxy() constant returns (ReissuableAssetProxyInterface);
    function getRevokeAssetProxy() constant returns (RevokableAssetProxyInterface);
}
