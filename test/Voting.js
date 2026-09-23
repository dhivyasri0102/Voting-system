import { expect } from "chai";
import hre from "hardhat";

describe("Voting", function () {

    async function deployVoting() {

        const { ethers } = await hre.network.connect();

        const [owner, voter1, voter2] = await ethers.getSigners();

        const Voting = await ethers.getContractFactory("Voting");

        const voting = await Voting.deploy();

        return { voting, owner, voter1, voter2 };
    }


    it("Should set the deployer as owner", async function () {

        const { voting, owner } = await deployVoting();

        expect(await voting.owner()).to.equal(owner.address);
    });


    it("Should add candidates", async function () {

        const { voting } = await deployVoting();

        await voting.addCandidate(
            "Alice",
            "Party A",
            "🌟",
            "Candidate Alice"
        );

        expect(await voting.candidateCount()).to.equal(1);

        const candidate = await voting.getCandidate(1);

        expect(candidate[1]).to.equal("Alice");
        expect(candidate[2]).to.equal("Party A");
        expect(candidate[3]).to.equal("🌟");
        expect(candidate[4]).to.equal("Candidate Alice");
        expect(candidate[5]).to.equal(0);
        expect(candidate[6]).to.equal(true);
    });


    it("Should start the election", async function () {

        const { voting } = await deployVoting();

        await voting.addCandidate(
            "Alice",
            "Party A",
            "🌟",
            "Candidate Alice"
        );

        await voting.startElection();

        expect(await voting.electionStarted()).to.equal(true);
    });


    it("Should allow a voter to vote", async function () {

        const { voting, voter1 } = await deployVoting();

        await voting.addCandidate(
            "Alice",
            "Party A",
            "🌟",
            "Candidate Alice"
        );

        await voting.startElection();

        await voting.connect(voter1).vote(1);

        const candidate = await voting.getCandidate(1);

        expect(candidate[5]).to.equal(1);

        expect(
            await voting.hasAddressVoted(voter1.address)
        ).to.equal(true);
    });


    it("Should prevent a voter from voting twice", async function () {

        const { voting, voter1 } = await deployVoting();

        await voting.addCandidate(
            "Alice",
            "Party A",
            "🌟",
            "Candidate Alice"
        );

        await voting.startElection();

        await voting.connect(voter1).vote(1);

        await expect(
            voting.connect(voter1).vote(1)
        ).to.be.revertedWith("You have already voted");
    });


    it("Should prevent voting before election starts", async function () {

        const { voting, voter1 } = await deployVoting();

        await voting.addCandidate(
            "Alice",
            "Party A",
            "🌟",
            "Candidate Alice"
        );

        await expect(
            voting.connect(voter1).vote(1)
        ).to.be.revertedWith("Election has not started");
    });


    it("Should prevent non-owner from adding candidates", async function () {

        const { voting, voter1 } = await deployVoting();

        await expect(
            voting.connect(voter1).addCandidate(
                "Bob",
                "Party B",
                "🔥",
                "Candidate Bob"
            )
        ).to.be.revertedWith(
            "Only owner can perform this action"
        );
    });


    it("Should end the election", async function () {

        const { voting } = await deployVoting();

        await voting.addCandidate(
            "Alice",
            "Party A",
            "🌟",
            "Candidate Alice"
        );

        await voting.startElection();

        await voting.endElection();

        expect(await voting.electionEnded()).to.equal(true);
    });

});