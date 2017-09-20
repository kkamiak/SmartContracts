pragma solidity ^0.4.11;

import "../../core/common/Object.sol";
import "../../core/contracts/ContractsManagerInterface.sol";
import "../../assets/AssetsManagerInterface.sol";
import "../../core/lib/SafeMath.sol";

contract Bounty {
    function reissueAsset(bytes32 _symbol, uint _value) returns (bool);
    function sendAsset(bytes32 _symbol, address _to, uint _value) returns (bool);
    function isAssetSymbolExists(bytes32 _symbol) returns (bool);
}

contract BountyRegistryProvider {
    function getPlatformRegistry() returns (address);
}

contract BountyRegistry {
    function isAssetOwner(bytes32 _symbol, address _owner) returns (bool);

}

/**
* @title BaseCrowdsale is a base crowdsale contract.
*/
contract BaseCrowdsale is Object {

    uint constant OK = 1;

    using SafeMath for uint;

    /* token symbol, must be valid id for using with Bounty */
    bytes32 private symbol;
    /* the number of tokens already sold through this contract*/
    uint private tokensSold = 0;

    address serviceProvider;

    event MintTokenEvent(address indexed sender, address beneficiary, uint amount);
    event WithdrawToken(address indexed sender, address holder, uint amount);

    /** @dev Crowdfunding running checks */
    modifier onlyRunning {
        if (!isRunning()) revert();
        _;
    }

    /** @dev Crowdfundung failure checks */
    modifier onlyFailure {
        if (!isFailed()) revert();
        _;
    }

    /** @dev Crowdfunding success checks */
    modifier onlySuccess {
        if (!isSuccessed()) revert();
        _;
    }

    /** @dev Access rights checks */
    modifier onlyAuthorised() {
        if (lookupBountyRegistry().isAssetOwner(symbol, msg.sender)) _;
    }

    /**
    *  @dev Crowdfunding contract initial
    *  @param _serviceProvider address
    *  @param _symbol Bounty token symbol
    *  @notice this contract should be owner of bounty token
    */
    function BaseCrowdsale(address _serviceProvider, bytes32 _symbol) {
        require(_serviceProvider != 0x0);
        require(_symbol != 0x0);

        serviceProvider = _serviceProvider;

        // do not allow to create Crowdsale for unknown symbol
        require(lookupBounty().isAssetSymbolExists(_symbol));

        symbol = _symbol;
    }

    /**
    *  Returns token's symbol;
    */
    function getSymbol() constant returns (bytes32) {
        return symbol;
    }

    /**
    *  How many tokens are sold.
    */
    function getTokensSold() constant returns (uint) {
        return tokensSold;
    }

    /**
    *  Destroy the Crowdsale contract. Throws if the Crowdsale is not ended yet.
    */
    function destroy() onlyContractOwner {
        if (!hasEnded()) revert();

        Owned.destroy();
    }

    /**
    *  It is just a base constact which is designed to be inherited.
    *  Implement payable function in dereved if necessary
    */
    function () payable onlyRunning {
        revert();
    }

    function hasEnded() constant returns (bool) {
        // withdraw() before destroy
        if (isSuccessed() && this.balance > 0) return false;

        // wait until all funds will be refunded
        if (isFailed() && tokensSold > 0) return false;

        // wait until success or fail
        if (isRunning()) return false;

        return true;
    }

    /**
    *  Tells whether or not the Crowdsale is running
    *  Must be implemented accorting to Crowdsale strategy
    *
    *  @return true if the Crowdsale is running
    */
    function isRunning() constant returns (bool);

    /**
    *  Tells whether or not the Crowdsale is failed
    *  Must be implemented accorting to Crowdsale strategy
    *
    *  @return true if the Crowdsale is failed
    */
    function isFailed() constant returns (bool);

    /**
    *  Tells whether or not the Crowdsale is successed.
    *  Must be implemented accorting to Crowdsale strategy
    *
    *  @return true if the Crowdsale is successed
    */
    function isSuccessed() constant returns (bool);

    /**
    *  This function mints the tokens and moves the crowdsale needle.
    */
    function mintTokensTo(address beneficiary, uint amount) internal onlyRunning {
        tokensSold = tokensSold.add(amount);

        if (!lookupBounty().reissueAsset(symbol, amount)) revert();

        if (!lookupBounty().sendAsset(symbol, beneficiary, amount)) revert();

        MintTokenEvent(address(this), beneficiary, amount);
    }

    /**
    *  TODO
    */
    function withdrawTokensFrom(address holder) internal onlyFailure {
        tokensSold = tokensSold.sub(0);

        //TODO: ahiatsevich no way to calculate amount revoked tokens
        //if (!lookupBounty().revokeAsset(symbol, amount)) revert();

        WithdrawToken(address(this), holder, 0);
    }

    function lookupBounty() constant returns (Bounty) {
        return Bounty(lookupService("AssetsManager"));
    }

    function lookupBountyRegistry() constant returns (BountyRegistry) {
        return BountyRegistry(BountyRegistryProvider(lookupService("AssetsManager")).getPlatformRegistry());
    }

    function lookupService(bytes32 _identifier) constant returns (address manager) {
        manager = ContractsManagerInterface(serviceProvider).getContractAddressByType(_identifier);
        require(manager != 0x0);
    }
}
