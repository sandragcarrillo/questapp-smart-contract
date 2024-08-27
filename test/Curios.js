const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("Tavern Contract", function () {
  let Tavern, tavern, owner, addr1, addr2, addr3;
  let merkleTree, leafNodes, merkleRoot;

  beforeEach(async function () {
    // Get the ContractFactory and Signers
    Tavern = await ethers.getContractFactory("Tavern");
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy the contract
    tavern = await Tavern.deploy(owner.address);

    // Create Merkle Tree
    leafNodes = [addr1.address, addr2.address, addr3.address].map((addr) => keccak256(addr));
    merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
    merkleRoot = merkleTree.getRoot().toString('hex');
  });

  it("should allow the owner to create a quest", async function () {
    await tavern.createQuest(
      owner.address,
      "First Quest",
      "A simple quest",
      3,
      "0x" + merkleRoot,
      "Merkle body example",
      "metadata_url"
    );

    const quest = await tavern.getQuest(owner.address, 0);
    expect(quest.name).to.equal("First Quest");
    expect(quest.maxWinners).to.equal(3);
    expect(quest.valid).to.equal(true);
  });

  it("should allow users to submit valid proofs and complete the quest", async function () {
    await tavern.createQuest(
      owner.address,
      "First Quest",
      "A simple quest",
      3,
      "0x" + merkleRoot,
      "Merkle body example",
      "metadata_url"
    );

    const leaf = keccak256(addr1.address);
    const proof = merkleTree.getHexProof(leaf);

    await tavern.connect(addr1).submitProof(owner.address, 0, proof, leaf);

    const winners = await tavern.getQuestWinners(owner.address, 0);
    expect(winners).to.include(addr1.address);
  });

  it("should reject invalid Merkle proofs", async function () {
    await tavern.createQuest(
      owner.address,
      "First Quest",
      "A simple quest",
      3,
      "0x" + merkleRoot,
      "Merkle body example",
      "metadata_url"
    );

    const invalidLeaf = keccak256("invalid_address");
    const invalidProof = merkleTree.getHexProof(invalidLeaf);

    try {
      await tavern.connect(addr2).submitProof(owner.address, 0, invalidProof, invalidLeaf);
      expect.fail("Expected revert not received");
    } catch (error) {
      expect(error.message).to.include("Invalid Merkle proof", "Expected 'Invalid Merkle proof' revert, got: " + error.message);
    }
  });

  it("should not allow the quest creator to participate", async function () {
    await tavern.createQuest(
      owner.address,
      "First Quest",
      "A simple quest",
      3,
      "0x" + merkleRoot,
      "Merkle body example",
      "metadata_url"
    );

    const leaf = keccak256(owner.address);
    const proof = merkleTree.getHexProof(leaf);

    try {
      await tavern.connect(owner).submitProof(owner.address, 0, proof, leaf);
      expect.fail("Expected revert not received");
    } catch (error) {
      expect(error.message).to.include("Creator cannot win their own quest", "Expected 'Creator cannot win their own quest' revert, got: " + error.message);
    }
  });

  it("should allow the owner or creator to invalidate a quest", async function () {
    await tavern.createQuest(
      owner.address,
      "First Quest",
      "A simple quest",
      3,
      "0x" + merkleRoot,
      "Merkle body example",
      "metadata_url"
    );

    await tavern.connect(owner).invalidateQuest(owner.address, 0);
    const quest = await tavern.getQuest(owner.address, 0);

    expect(quest.valid).to.equal(false);
  });
});
