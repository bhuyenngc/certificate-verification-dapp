const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateSupplyChain", function () {
  async function deployFixture() {
    const [owner, issuer, verifier, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CertificateSupplyChain");
    const registry = await Factory.deploy();
    await registry.deployed();
    await registry.setRole(issuer.address, 2);
    await registry.setRole(verifier.address, 3);
    return { registry, owner, issuer, verifier, stranger };
  }

  it("creates, issues, verifies, and records history", async function () {
    const { registry, issuer } = await deployFixture();

    await registry
      .connect(issuer)
      .createAsset("CERT-2026-001", "Nguyen Van A", "Blockchain Fundamentals", "ipfs://demo", "2026-05-17");

    let result = await registry.verifyAsset("CERT-2026-001");
    expect(result.exists).to.equal(true);
    expect(result.valid).to.equal(false);
    expect(result.status).to.equal(0);

    await registry.connect(issuer).issueAsset("CERT-2026-001", "Approved after review");

    result = await registry.verifyAsset("CERT-2026-001");
    expect(result.valid).to.equal(true);
    expect(result.status).to.equal(1);

    const asset = await registry.getAsset("CERT-2026-001");
    expect(asset.holderName).to.equal("Nguyen Van A");
    expect(asset.issuer).to.equal(issuer.address);

    const history = await registry.getHistory("CERT-2026-001");
    expect(history.length).to.equal(2);
    expect(history[1].note).to.equal("Approved after review");
  });

  it("blocks unauthorized users from creating or updating assets", async function () {
    const { registry, issuer, stranger } = await deployFixture();

    await expectRevert(
      registry
        .connect(stranger)
        .createAsset("CERT-2026-002", "Tran Thi B", "Supply Chain 101", "", "2026-05-17"),
      "ONLY_ISSUER"
    );

    await registry
      .connect(issuer)
      .createAsset("CERT-2026-002", "Tran Thi B", "Supply Chain 101", "", "2026-05-17");

    await expectRevert(registry.connect(stranger).issueAsset("CERT-2026-002", "try update"), "ONLY_ISSUER");
  });

  it("does not allow updates after revocation", async function () {
    const { registry, issuer } = await deployFixture();

    await registry
      .connect(issuer)
      .createAsset("CERT-2026-003", "Le Van C", "Pharma Traceability", "", "2026-05-17");
    await registry.connect(issuer).revokeAsset("CERT-2026-003", "Fraud detected");

    await expectRevert(registry.connect(issuer).issueAsset("CERT-2026-003", "restore"), "ASSET_REVOKED_FINAL");
  });
});

async function expectRevert(tx, reason) {
  try {
    await tx;
    expect.fail(`Expected transaction to revert with ${reason}`);
  } catch (error) {
    expect(error.message).to.include(reason);
  }
}
