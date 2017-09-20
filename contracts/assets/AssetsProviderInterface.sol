pragma solidity ^0.4.11;

contract AssetsProviderInterface {
    function isAssetSymbolExists(bytes32 _symbol) constant returns (bool);
    function getAssetsSymbols() constant returns (bytes32[]);
    function getAssetsSymbolsCount() constant returns (uint);
}
