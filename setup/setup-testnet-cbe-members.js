const UserManager = artifacts.require("./UserManager.sol");
const Q = require("q");

var exit = function () {
  process.exit()
}

var setupCBE = function (callback) {
  if (this.artifacts.options.network === "main") {
      throw new Error('Is not alloved for main network!');
  }

  const addresses = [
    "0xc38f003c0a14a05f11421d793edc9696a25cb2b3", //dkchv
	"0xa41e838cbf9c553f014953a70178aedd0ab58e48", //vladislav.ankudinov
	"0xf96abbd4df8112c1c7315ce621e323558649f998", //ipavlenko
	"0x39866462ffb2914a115be6ac439acaba8adc6fc4", //zdv
    "0x5c571bb06b6edb58761b06894e2ee6a14909c371"  //ahiatsevich
  ]

  let _setupCBE = (userManager, addresses) => {
    var chain = Q.when();

    for(let address of addresses) {
         chain = chain.then(function() {
            return userManager.addCBE(address, 0x1)
                      .then(() => userManager.isAuthorized.call(address))
                      .then((r) => {if (r) {console.log(address + " is CBE");} return r;});
         });
    }

    return Q.all(chain);
  }

  return UserManager.deployed()
    .then(_userManager => _setupCBE(_userManager, addresses))
    .then(() => callback())
    .catch(function (e) {
        console.log(e)
        callback(e);
      })
}

module.exports.setupCBE = setupCBE

module.exports = (callback) => {
  return setupCBE(callback)
}
