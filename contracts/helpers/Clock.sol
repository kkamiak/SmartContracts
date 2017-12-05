pragma solidity ^0.4.11;

contract Clock {
    function time() view returns (uint) {
        return now;
    }
}
