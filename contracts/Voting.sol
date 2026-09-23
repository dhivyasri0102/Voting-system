// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

contract Voting {

    address public owner;

    bool public electionStarted;
    bool public electionEnded;

    struct Candidate {
        uint256 id;
        string name;
        string party;
        string symbol;
        string description;
        uint256 voteCount;
        bool exists;
    }

    uint256 public candidateCount;

    mapping(uint256 => Candidate) public candidates;

    mapping(address => bool) public hasVoted;

    event CandidateAdded(
        uint256 indexed candidateId,
        string name
    );

    event ElectionStarted();

    event ElectionEnded();

    event VoteCast(
        address indexed voter,
        uint256 indexed candidateId
    );

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only owner can perform this action"
        );
        _;
    }

    modifier electionActive() {
        require(
            electionStarted,
            "Election has not started"
        );

        require(
            !electionEnded,
            "Election has ended"
        );

        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addCandidate(
        string memory _name,
        string memory _party,
        string memory _symbol,
        string memory _description
    ) public onlyOwner {

        require(
            !electionStarted,
            "Election already started"
        );

        candidateCount++;

        candidates[candidateCount] = Candidate(
            candidateCount,
            _name,
            _party,
            _symbol,
            _description,
            0,
            true
        );

        emit CandidateAdded(
            candidateCount,
            _name
        );
    }

    function startElection()
        public
        onlyOwner
    {
        require(
            candidateCount > 0,
            "Add candidates first"
        );

        require(
            !electionStarted,
            "Election already started"
        );

        electionStarted = true;

        emit ElectionStarted();
    }

    function endElection()
        public
        onlyOwner
    {
        require(
            electionStarted,
            "Election has not started"
        );

        require(
            !electionEnded,
            "Election already ended"
        );

        electionEnded = true;

        emit ElectionEnded();
    }

    function vote(uint256 _candidateId)
        public
        electionActive
    {
        require(
            !hasVoted[msg.sender],
            "You have already voted"
        );

        require(
            candidates[_candidateId].exists,
            "Candidate does not exist"
        );

        hasVoted[msg.sender] = true;

        candidates[_candidateId].voteCount++;

        emit VoteCast(
            msg.sender,
            _candidateId
        );
    }

    function getCandidate(uint256 _candidateId)
        public
        view
        returns (
            uint256,
            string memory,
            string memory,
            string memory,
            string memory,
            uint256,
            bool
        )
    {
        Candidate memory c = candidates[_candidateId];

        return (
            c.id,
            c.name,
            c.party,
            c.symbol,
            c.description,
            c.voteCount,
            c.exists
        );
    }

    function getAllCandidates()
        public
        view
        returns (Candidate[] memory)
    {
        Candidate[] memory result =
            new Candidate[](candidateCount);

        for (
            uint256 i = 1;
            i <= candidateCount;
            i++
        ) {
            result[i - 1] = candidates[i];
        }

        return result;
    }

    function hasAddressVoted(address voter)
        public
        view
        returns (bool)
    {
        return hasVoted[voter];
    }
}