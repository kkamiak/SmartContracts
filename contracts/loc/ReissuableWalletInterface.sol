pragma solidity ^0.4.11;

import "../timeholder/DepositWalletInterface.sol";

contract ReissuableWalletInterface is DepositWalletInterface {
    function reissue(address _platform, bytes32 _symbol, uint256 _amount) returns (uint);
    function revoke(address _platform, bytes32 _symbol, uint256 _amount) returns (uint);
}
