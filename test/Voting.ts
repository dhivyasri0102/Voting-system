import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("Privacy-Preserving & Cyber-Resilient Voting Contract", function () {
  async function deployVotingFixture() {
    const [admin, officer, auditor, voter1, voter2, attacker] = await ethers.getSigners();
    const voting = await ethers.deployContract("Voting");

    // Assign roles
    await voting.setElectionOfficer(officer.address, true);
    await voting.setAuditor(auditor.address, true);

    return { voting, admin, officer, auditor, voter1, voter2, attacker };
  }

  describe("Role-Based Access Control (RBAC)", function () {
    it("Should correctly initialize admin, officer, and auditor roles", async function () {
      const { voting, admin, officer, auditor, attacker } = await networkHelpers.loadFixture(deployVotingFixture);
      expect(await voting.admin()).to.equal(admin.address);
      expect(await voting.owner()).to.equal(admin.address);
      expect(await voting.electionOfficers(officer.address)).to.equal(true);
      expect(await voting.auditors(auditor.address)).to.equal(true);
      expect(await voting.electionOfficers(attacker.address)).to.equal(false);
    });

    it("Should reject non-admin attempts to grant roles", async function () {
      const { voting, attacker } = await networkHelpers.loadFixture(deployVotingFixture);
      await expect(
        voting.connect(attacker).setElectionOfficer(attacker.address, true)
      ).to.be.revertedWith("Security: Caller is not Admin");
    });
  });

  describe("Candidate Management & Anti-DoS Input Validation", function () {
    it("Should allow authorized officer to add candidate with bounded inputs", async function () {
      const { voting, officer } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.connect(officer).addCandidate("Dr. A. Raman", "Alliance Party", "☀️", "Serving Chennai Central");
      expect(await voting.candidateCount()).to.equal(1n);

      const candidate = await voting.getCandidate(1);
      expect(candidate.name).to.equal("Dr. A. Raman");
      expect(candidate.active).to.equal(true);
    });

    it("Should reject oversized candidate name (DoS attack prevention)", async function () {
      const { voting, officer } = await networkHelpers.loadFixture(deployVotingFixture);
      const longName = "A".repeat(150); // Max allowed is 128
      await expect(
        voting.connect(officer).addCandidate(longName, "Party", "Symbol", "Bio")
      ).to.be.revertedWith("Security: Invalid candidate name length");
    });
  });

  describe("Emergency Circuit Breaker (Pausable)", function () {
    it("Should allow officer to pause election and block voting during cyber incident", async function () {
      const { voting, officer, admin, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.connect(officer).addCandidate("Candidate 1", "Party A", "🌟", "Desc");
      await voting.connect(officer).startElection();

      // Trigger emergency pause
      await voting.connect(officer).emergencyPause("Suspected DDoS and network anomaly");
      expect(await voting.paused()).to.equal(true);

      // Voting must be blocked while paused
      await expect(
        voting.connect(voter1).vote(1)
      ).to.be.revertedWith("Security: Contract operations paused by Emergency Circuit Breaker");

      // Admin unpauses after incident containment
      await voting.connect(admin).emergencyUnpause();
      expect(await voting.paused()).to.equal(false);

      // Voting succeeds after unpause
      await expect(voting.connect(voter1).vote(1)).to.emit(voting, "BallotCast");
    });
  });

  describe("Privacy-Preserving Voting & Anti-Replay Nullifiers", function () {
    it("Should cast ballot using commitment and reject duplicate nullifiers", async function () {
      const { voting, officer, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.connect(officer).addCandidate("Alice", "Party A", "🌟", "Candidate Alice");
      await voting.connect(officer).startElection();

      const commitment = ethers.keccak256(ethers.toUtf8Bytes("secret-ballot-vote-1"));
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("voter-token-hash-xyz-123"));

      // First vote succeeds
      await expect(voting.connect(voter1).voteWithCommitment(commitment, nullifier, 1))
        .to.emit(voting, "BallotCast");

      expect(await voting.isNullifierUsed(nullifier)).to.equal(true);

      const candidate = await voting.getCandidate(1);
      expect(candidate.voteCount).to.equal(1n);

      // Replay attack with same nullifier is strictly blocked
      await expect(
        voting.connect(voter1).voteWithCommitment(commitment, nullifier, 1)
      ).to.be.revertedWith("Security: Voting credential has already been consumed");
    });

    it("Should prevent voting before start or after conclusion", async function () {
      const { voting, officer, voter1 } = await networkHelpers.loadFixture(deployVotingFixture);
      await voting.connect(officer).addCandidate("Bob", "Party B", "🔥", "Candidate Bob");

      await expect(voting.connect(voter1).vote(1)).to.be.revertedWith(
        "Election: Voting period has not started"
      );

      await voting.connect(officer).startElection();
      await voting.connect(officer).endElection();

      await expect(voting.connect(voter1).vote(1)).to.be.revertedWith(
        "Election: Voting period has closed"
      );
    });
  });

  describe("On-Chain Cryptographic Audit Root Anchoring", function () {
    it("Should allow auditor to anchor final Merkle Root after election close", async function () {
      const { voting, officer, auditor } = await networkHelpers.loadFixture(deployVotingFixture);

      await voting.connect(officer).addCandidate("Alice", "Party A", "🌟", "Candidate Alice");
      await voting.connect(officer).startElection();
      await voting.connect(officer).endElection();

      const electionId = "ELEC-2026-CHENN-01";
      const merkleRoot = ethers.keccak256(ethers.toUtf8Bytes("cag-verified-merkle-root-proof"));

      await expect(
        voting.connect(auditor).anchorAuditProof(electionId, merkleRoot, 5420n)
      ).to.emit(voting, "AuditRootAnchored");

      const anchor = await voting.getAuditAnchor(electionId);
      expect(anchor.anchored).to.equal(true);
      expect(anchor.merkleRoot).to.equal(merkleRoot);
      expect(anchor.totalBallots).to.equal(5420n);
      expect(anchor.auditor).to.equal(auditor.address);
    });
  });
});
