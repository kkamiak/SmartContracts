pragma solidity ^0.4.11;

contract Once {
    mapping (bytes4 => bool) methods;

    modifier onlyOnce() {
        if (!methods[msg.sig]) {
            _;
            methods[msg.sig] = true;
        }
    }
}
