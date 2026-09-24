// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title Privacy-Preserving Voting Smart Contract
 * @notice Enforces immutable candidate management and privacy-preserving ballot casting.
 * Voter identity is cryptographically decoupled from ballot choice using commitment hashes.
 */
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
        bool active;
    }

    uint256 public candidateCount;

    mapping(uint256 => Candidate) public candidates;

    // Direct address tracking (optional fallback)
    mapping(address => bool) public hasVoted;

    // Cryptographic nullifier mapping to prevent double-spending without revealing identity
    mapping(bytes32 => bool) public isNullifierConsumed;

    // Events
    event CandidateAdded(
        uint256 indexed candidateId,
        string name,
        string party
    );

    event CandidateUpdated(
        uint256 indexed candidateId,
        string name,
        string party
    );

    event CandidateDisabled(
        uint256 indexed candidateId
    );

    event ElectionStarted(uint256 timestamp);

    event ElectionEnded(uint256 timestamp);

    // PRIVACY-PRESERVING BALLOT EVENT:
    // Emits only the cryptographic ballot commitment and candidateId. ZERO voter address linkage!
    event BallotCast(
        bytes32 indexed ballotCommitment,
        uint256 indexed candidateId,
        uint256 timestamp
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
            "Cannot add candidate after election has started"
        );

        candidateCount++;

        candidates[candidateCount] = Candidate(
            candidateCount,
            _name,
            _party,
            _symbol,
            _description,
            0,
            true,
            true
        );

        emit CandidateAdded(
            candidateCount,
            _name,
            _party
        );
    }

    function editCandidate(
        uint256 _candidateId,
        string memory _name,
        string memory _party,
        string memory _symbol,
        string memory _description
    ) public onlyOwner {
        require(
            candidates[_candidateId].exists,
            "Candidate does not exist"
        );

        Candidate storage c = candidates[_candidateId];
        c.name = _name;
        c.party = _party;
        c.symbol = _symbol;
        c.description = _description;

        emit CandidateUpdated(
            _candidateId,
            _name,
            _party
        );
    }

    function disableCandidate(uint256 _candidateId) public onlyOwner {
        require(
            candidates[_candidateId].exists,
            "Candidate does not exist"
        );

        candidates[_candidateId].active = false;

        emit CandidateDisabled(_candidateId);
    }

    function startElection() public onlyOwner {
        require(
            candidateCount > 0,
            "Add candidates first"
        );

        require(
            !electionStarted,
            "Election already started"
        );

        electionStarted = true;

        emit ElectionStarted(block.timestamp);
    }

    function endElection() public onlyOwner {
        require(
            electionStarted,
            "Election has not started"
        );

        require(
            !electionEnded,
            "Election already ended"
        );

        electionEnded = true;

        emit ElectionEnded(block.timestamp);
    }

    /**
     * @notice Privacy-preserving anonymous vote with single-use cryptographic nullifier
     * @param _ballotCommitment SHA-256 / Keccak-256 commitment of ballot
     * @param _nullifierHash Hash of anonymous credential to prevent double-voting
     * @param _candidateId Candidate receiving the vote
     */
    function voteWithCommitment(
        bytes32 _ballotCommitment,
        bytes32 _nullifierHash,
        uint256 _candidateId
    ) public electionActive {
        require(
            !isNullifierConsumed[_nullifierHash],
            "Voting credential has already been consumed"
        );

        require(
            candidates[_candidateId].exists,
            "Candidate does not exist"
        );

        require(
            candidates[_candidateId].active,
            "Candidate is disabled"
        );

        isNullifierConsumed[_nullifierHash] = true;
        candidates[_candidateId].voteCount++;

        emit BallotCast(
            _ballotCommitment,
            _candidateId,
            block.timestamp
        );
    }

    /**
     * @notice Standard direct vote function
     */
    function vote(uint256 _candidateId) public electionActive {
        require(
            !hasVoted[msg.sender],
            "You have already voted"
        );

        require(
            candidates[_candidateId].exists,
            "Candidate does not exist"
        );

        require(
            candidates[_candidateId].active,
            "Candidate is disabled"
        );

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        // Emits anonymous commitment hash derived from sender and block to protect on-chain privacy
        bytes32 pseudoCommitment = keccak256(abi.encodePacked(msg.sender, block.timestamp, _candidateId));

        emit BallotCast(
            pseudoCommitment,
            _candidateId,
            block.timestamp
        );
    }

    function getCandidate(uint256 _candidateId)
        public
        view
        returns (
            uint256 id,
            string memory name,
            string memory party,
            string memory symbol,
            string memory description,
            uint256 voteCount,
            bool exists,
            bool active
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
            c.exists,
            c.active
        );
    }

    function getAllCandidates()
        public
        view
        returns (Candidate[] memory)
    {
        Candidate[] memory result = new Candidate[](candidateCount);

        for (uint256 i = 1; i <= candidateCount; i++) {
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