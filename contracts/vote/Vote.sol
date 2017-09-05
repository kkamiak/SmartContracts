pragma solidity ^0.4.11;

import "../core/common/BaseManager.sol";
import "./VoteEmitter.sol";

contract Vote is VoteEmitter, BaseManager {
  // Vote errors
    uint constant ERROR_VOTE_INVALID_PARAMETER = 8000;
    uint constant ERROR_VOTE_INVALID_INVOCATION = 8001;
    uint constant ERROR_VOTE_ADD_CONTRACT = 8002;
    uint constant ERROR_VOTE_LIMIT_EXCEEDED = 8003;
    uint constant ERROR_VOTE_POLL_LIMIT_REACHED = 8004;
    uint constant ERROR_VOTE_POLL_WRONG_STATUS = 8005;
    uint constant ERROR_VOTE_POLL_INACTIVE = 8006;
    uint constant ERROR_VOTE_POLL_NO_SHARES = 8007;
    uint constant ERROR_VOTE_POLL_ALREADY_VOTED = 8008;
    uint constant ERROR_VOTE_ACTIVE_POLL_LIMIT_REACHED = 8009;
    uint constant ERROR_VOTE_UNABLE_TO_ACTIVATE_POLL = 8010;
    uint constant ERROR_VOTE_OPTIONS_LIMIT_REACHED = 8011;
    uint constant ERROR_VOTE_POLL_SHOULD_BE_INACTIVE = 8013;
    uint constant ERROR_VOTE_POLL_DOES_NOT_EXIST = 8014;
    uint constant ERROR_VOTE_OPTION_CHOICE_OUT_OF_RANGE = 8015;
    uint constant ERROR_VOTE_OPTIONS_EMPTY_LIST = 8016;
    uint constant ERROR_VOTE_DETAILS_HASH_INVALID_PARAMETER = 8017;
    uint constant ERROR_VOTE_DEADLINE_INVALID_PARAMETER = 8018;
    uint constant ERROR_VOTE_HASH_INVALID_PARAMETER = 8019;
    uint constant ERROR_VOTE_SHARES_PERCENT_OUT_OF_RANGE = 8020;
    uint constant ERROR_VOTE_OPTION_INVALID_PARAMETER = 8021;

    StorageInterface.UInt activePollsCount;

    StorageInterface.OrderedUIntSet polls;

    StorageInterface.UIntAddressMapping owner;
    StorageInterface.UIntBytes32Mapping detailsIpfsHash;
    StorageInterface.UIntUIntMapping votelimit;
    StorageInterface.UIntUIntMapping deadline;
    StorageInterface.UIntBoolMapping status;
    StorageInterface.UIntBoolMapping active;

    StorageInterface.UIntAddressUIntMapping memberOption;
    StorageInterface.UIntAddressUIntMapping memberVotes;
    StorageInterface.UIntUIntUIntMapping options;
    StorageInterface.UIntUIntUIntMapping optionsStats;

    StorageInterface.AddressOrderedSetMapping members;
    StorageInterface.UIntOrderedSetMapping memberPolls;
    StorageInterface.Bytes32OrderedSetMapping ipfsHashes;
    StorageInterface.Bytes32OrderedSetMapping optionsId;

     function Vote(Storage _store, bytes32 _crate) BaseManager(_store, _crate) {
        activePollsCount.init('activePollsCount');
        polls.init('polls');
        owner.init('owner');
        detailsIpfsHash.init('detailsIpfsHash');
        votelimit.init('votelimit');
        deadline.init('deadline');
        status.init('status');
        active.init('active');
        memberOption.init('memberOption');
        memberVotes.init('memberVotes');
        options.init('options');
        optionsStats.init('optionsStats');
        members.init('members');
        memberPolls.init('memberPolls');
        ipfsHashes.init('ipfsHashes');
        optionsId.init('optionsId');
    }

    function checkPollIsActive(uint _pollId) constant returns (bool) {
        return store.get(active, _pollId);
    }

    function checkPollIsInactive(uint _pollId) internal constant returns (bool) {
        return !checkPollIsActive(_pollId);
    }

    modifier onlyCreator(uint _id) {
        if (isPollOwner(_id)) {
            _;
        }
    }

    function isPollOwner(uint _id) constant returns (bool) {
        return store.get(owner, _id) == msg.sender;
    }

    //when time or vote limit is reached, set the poll status to false
    function endPoll(uint _pollId) internal returns (uint) {
        if (!store.get(status, _pollId))  {
            return ERROR_VOTE_INVALID_PARAMETER;
        }

        store.set(status, _pollId, false);
        store.set(active, _pollId, false);
        store.set(activePollsCount, store.get(activePollsCount) - 1);

        _emitPollEnded(_pollId);
        return OK;
    }

    function _emitPollEnded(uint pollId) internal {
        address eventsHistory = getEventsHistory();
        if (eventsHistory != 0x0) {
            VoteEmitter(eventsHistory).emitPollEnded(pollId);
        }
    }

    function isPollExist(uint _id) internal constant returns (bool) {
        return store.includes(polls, _id);
    }

    function() {
        throw;
    }
}
