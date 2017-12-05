pragma solidity ^0.4.11;

import "../core/contracts/ContractsManagerInterface.sol";
import "../assets/AssetsManagerInterface.sol";

contract AssetsManagerMock is AssetsManagerInterface {

    uint constant OK = 1;

    address contractsManager;
    bytes32[] symbols;
    mapping(bytes32 => address) assets;

    function init(address _contractsManager) public returns(bool) {
        if(contractsManager != 0x0) {
            return false;
        }

        uint errorCode = ContractsManagerInterface(_contractsManager).addContract(this, "AssetsManager");
        if (OK != errorCode) {
            return false;
        }

        contractsManager = _contractsManager;
        return true;
    }


    function isAssetSymbolExists(bytes32 _symbol) public view returns (bool) {
        return assets[_symbol] != 0x0;
    }

    function getAssetsSymbols() public view returns (bytes32[]) {
        return symbols;
    }

    function getAssetsSymbolsCount() public view returns (uint) {
        return symbols.length;
    }

    function getAssetBySymbol(bytes32 symbol) public view returns (address) {
        return assets[symbol];
    }

    function addAsset(address asset, bytes32 _symbol, address owner) public returns (bool) {
        owner == 0x0;
        if (assets[_symbol] == 0x0) {
            symbols.push(_symbol);
            assets[_symbol] = asset;
            return true;
        }
        return false;
    }

    function() public {
        revert();
    }

    function getAssetsForOwner(address platform, address owner) public view returns (bytes32[]) {
        owner = 0x0;
        platform = 0x0;
        return symbols;
    }

    function getAssetsForOwnerCount(address platform, address owner) public view returns (uint) {
        owner = 0x0;
        platform = 0x0;
        return symbols.length;
    }

    function getAssetForOwnerAtIndex(address platform, address owner, uint _index) public view returns (bytes32) {
        owner = 0x0;
        platform = 0x0;
        return symbols[_index];
    }

    function isAssetOwner(bytes32 _symbol, address _user) public view returns (bool) {
        _symbol = 0x0;
        _user = 0x0;
        return true;
    }

    function getTokenExtension(address _platform) public view returns (address) {
        _platform = 0x0;
        revert();
    }

    function requestTokenExtension(address _platform) public returns (uint) {
        _platform = 0x0;
        revert();
    }
}
