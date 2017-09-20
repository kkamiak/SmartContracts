pragma solidity ^0.4.11;

import "../core/contracts/ContractsManagerInterface.sol";
import "../assets/AssetsManagerInterface.sol";

contract AssetsManagerMock is AssetsManagerInterface {

    uint constant OK = 1;

    address contractsManager;
    bytes32[] symbols;
    mapping(bytes32 => address) assets;
    address platformRegistry;

    function init(address _contractsManager, address _platformRegistry) returns(bool) {
        if(contractsManager != 0x0) {
            return false;
        }

        platformRegistry = _platformRegistry;

        uint errorCode = ContractsManagerInterface(_contractsManager).addContract(this, "AssetsManager");
        if(OK != errorCode) {
            return false;
        }

        contractsManager = _contractsManager;
        return true;
    }


    function isAssetSymbolExists(bytes32 _symbol) constant returns (bool) {
        return assets[_symbol] != 0x0;
    }

    function getAssetsSymbols() constant returns (bytes32[]) {
        return symbols;
    }

    function getAssetsSymbolsCount() constant returns (uint) {
        return symbols.length;
    }

    function getAssetBySymbol(bytes32 symbol) constant returns (address) {
        return assets[symbol];
    }

    function addAsset(address asset, bytes32 _symbol, address owner) returns (bool) {
        symbols.push(_symbol);
        assets[_symbol] = asset;
    }

    function getPlatformRegistry() constant returns (address) {
        return platformRegistry;
    }

    function() {
        throw;
    }

    function getAssetsForOwner(address owner) constant returns (bytes32[]) {
        throw;
    }

    function getAssetsForOwnerCount(address owner) constant returns (uint) {
        return symbols.length;
    }

    function getAssetForOwnerAtIndex(address owner, uint _index) constant returns (bytes32) {
        return symbols[_index];
    }

    /*function isAssetsPresentedInPlatform(address _platform) constant returns (bool) {
        throw;
    }*/

    function removeAssetRecord(bytes32 _symbol) {
        throw;
    }

    function sendAsset(bytes32 _symbol, address _to, uint _value) returns (bool) {
        throw;
    }

    function reissueAsset(bytes32 _symbol, uint _value) returns (bool) {
        throw;
    }

    function revokeAsset(bytes32 _symbol, uint _value) returns (bool) {
        throw;
    }

    function requestNewAsset(bytes32 _symbol) returns (uint errorCode) {
        throw;
    }

    function redeemNewAsset(uint _requestId, string _name, string _description, uint _value, uint8 _decimals, bool _isMint, bool _withFee) returns (uint errorCode) {
        throw;
    }
}
