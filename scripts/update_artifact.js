var fs = require('fs');

let update_artifact = (artifact_name) => {
  const artifact_deployed_path = "../build-1.1.42/contracts/" + artifact_name + ".json";
  const artifact_new_path = "../build/contracts/" + artifact_name + ".json";

  if (!fs.existsSync(artifact_new_path)) {
    console.log("Skiped:", artifact_new_path);
    return;
  }

  var artifact_deployed = require(artifact_deployed_path);
  var artifact_new = require(artifact_new_path);

  if (artifact_deployed.contract_name != artifact_name) {
    console.error("Invalid [deployed] artifact:", artifact_deployed.contract_name, ". Required: ", artifact_name);
    return;
  }

  if (artifact_new.contractName != artifact_name) {
    console.error("Invalid [new] artifact:", artifact_new.contractName, ". Required: ", artifact_name);
    return;
  }

  artifact_new.networks = artifact_deployed.networks;
  fs.writeFileSync(artifact_new_path, JSON.stringify(artifact_new, null, 2));

  console.log("Updated", artifact_name);
}

var data = fs.readFileSync("./artifacts").toString('utf-8');
var artifacts = data.split("\n");

for (artifact of artifacts) {
  console.log("Update: ", artifact);
  update_artifact(artifact);
}
