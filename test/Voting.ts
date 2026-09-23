import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("Privacy-Preserving Voting Contract", function () {
  async function deployVotingFixture() {
    const [owner, voter1, voter2] = await ethers.getSigners();
    const voting = await ethers.deployContract("Voting");
    return { voting, owner, voter1, voter2 };
  }

  it("Should set the deployer as owner", async function () {
    const { voting, owner } = await networkHelpers.loadFixture(deployVotingFixture);
    expect(await voting.owner()).to.equal(owner.address);
  });

  it("Should add and edit candidates", async function () {
    const { voting } = await networkHelpers.loadFixture(deployVotingFixture);

    await voting.addCandidate("Alice", "Party A", "🌟", "Candidate Alice");
    expect(await voting.candidateCount()).to.equal(1n);

    let candidate = await voting.getCandidate(1);
    expect(candidate.name).to.equal("Alice");
    expect(candidate.party).to.equal("Party A");
    expect(candidate.symbol).to.equal("🌟");
    expect(candidate.active).to.equal(true);

    // Edit candidate
    await voting.editCandidate(1, "Alice Updated", "Party A+", "⭐", "Alice Bio");
    candidate = await voting.getCandidate(1);
    expect(candidate.name).to.equal("Alice Updated");
    expect(candidate.party).to.equal("Party A+");
  });

  it("Should disable candidates and prevent voting for disabled candidate", async function () {
    const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);

    await voting.addCandidate("Bob", "Party B", "🔥", "Candidate Bob");
    await voting.startElection();
    await voting.disableCandidate(1);

    const candidate = await voting.getCandidate(1);
    expect(candidate.active).to.equal(false);

    await expect(voting.connect(voter1).vote(1)).to.be.revertedWith("Candidate is disabled");
  });

  it("Should support privacy-preserving voting with nullifiers", async function () {
    const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);

    await voting.addCandidate("Alice", "Party A", "🌟", "Candidate Alice");
    await voting.startElection();

    const commitment = ethers.keccak256(ethers.toUtf8Bytes("ballot-commitment-1"));
    const nullifier = ethers.keccak256(ethers.toUtf8Bytes("nullifier-secret-1"));

    await expect(voting.connect(voter1).voteWithCommitment(commitment, nullifier, 1))
      .to.emit(voting, "BallotCast");

    const candidate = await voting.getCandidate(1);
    expect(candidate.voteCount).to.equal(1n);

    // Double voting attempt with same nullifier should revert
    await expect(
      voting.connect(voter1).voteWithCommitment(commitment, nullifier, 1)
    ).to.be.revertedWith("Voting credential has already been consumed");
  });

  it("Should prevent voting before election starts", async function () {
    const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);
    await voting.addCandidate("Alice", "Party A", "🌟", "Candidate Alice");

    await expect(voting.connect(voter1).vote(1)).to.be.revertedWith("Election has not started");
  });

  it("Should end election and prevent further voting", async function () {
    const { voting, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);
    await voting.addCandidate("Alice", "Party A", "🌟", "Candidate Alice");
    await voting.startElection();
    await voting.endElection();

    expect(await voting.electionEnded()).to.equal(true);
    await expect(voting.connect(voter1).vote(1)).to.be.revertedWith("Election has ended");
  });
});
