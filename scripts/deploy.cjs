const { ethers } = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying CertificateSupplyChain with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const Contract = await ethers.getContractFactory("CertificateSupplyChain");
  const registry = await Contract.deploy();
  await registry.deployed();

  const address = registry.address;
  const network = await ethers.provider.getNetwork();

  console.log("CertificateSupplyChain deployed to:", address);
  console.log("Network:", network.name, Number(network.chainId));

  const artifact = readArtifact("CertificateSupplyChain");
  const outputDir = path.join(process.cwd(), "src", "contracts");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "deployment.json"),
    JSON.stringify(
      {
        address,
        chainId: Number(network.chainId),
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  fs.writeFileSync(path.join(outputDir, "CertificateSupplyChain.abi.json"), JSON.stringify(artifact.abi, null, 2));

  console.log("Frontend contract files written to src/contracts/");
}

function readArtifact(contractName) {
  const artifactPath = path.join(process.cwd(), "artifacts", "contracts", `${contractName}.sol`, `${contractName}.json`);
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
