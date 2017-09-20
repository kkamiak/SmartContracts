pragma solidity ^0.4.11;

import "./BaseManager.sol";

contract BasePlatformsManager is BaseManager {

    StorageInterface.OrderedAddressesSet platforms;

    function BasePlatformsManager(Storage _store, bytes32 _crate) BaseManager(_store, _crate) {
        platforms.init("platforms");
    }

    function init(address _contractsManager, bytes32 _type) internal returns (uint resultCode) {
        BaseManager.init(_contractsManager, _type);
    }
    /**
    * Gets a list for platforms registered in a registry
    *
    * @return _platforms addresses of platforms stored in registry
    */
    function getRegisteredPlatforms() constant returns(address[] _platforms) {
        StorageInterface.Iterator memory iterator = store.listIterator(platforms);
        _platforms = new address[](iterator.count());
        for (uint idx = 0; store.canGetNextWithIterator(platforms, iterator); ++idx) {
            _platforms[idx] = store.getNextWithIterator(platforms, iterator);
        }
    }

    /**
    * Gets number of registered platforms
    *
    * @return number of registrered platforms
    */
    function getRegisteredPlatformsCount() constant returns(uint) {
        return store.count(platforms);
    }
}
