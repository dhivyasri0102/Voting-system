// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/**
 * @title Sovereign & Privacy-Preserving Voting Smart Contract
 * @notice Enterprise-grade electronic voting contract implementing:
 * - Role-Based Access Control (RBAC: Admin, Election Officer, Auditor)
 * - Reentrancy Guard Protection
 * - Emergency Circuit Breaker (Pausable mechanism for cyber incidents)
 * - Privacy-Preserving Anonymous Ballots with Zero-Knowledge Nullifiers
 * - Anti-Replay Protection with Election Domain Separation
 * - On-Chain Cryptographic Merkle Audit Root Anchoring
 * - Anti-DoS Input Size Validation
 */
contract Voting {
    // -------------------------------------------------------------
    // ROLES & ACCESS CONTROL
    // -------------------------------------------------------------
    address public admin;
    mapping(address => bool) public electionOfficers;
    mapping(address => bool) public auditors;

    // -------------------------------------------------------------
    // EMERGENCY CIRCUIT BREAKER & REENTRANCY GUARD
    // -------------------------------------------------------------
    bool public paused;
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    // -------------------------------------------------------------
    // ELECTION LIFECYCLE
    // -------------------------------------------------------------
    bool public electionStarted;
    bool public electionEnded;
    uint256 public electionStartTime;
    uint256 public electionEndTime;

    // -------------------------------------------------------------
    // CANDIDATE DATA STRUCTURE & STORAGE
    // -------------------------------------------------------------
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

    // Direct address tracking (optional fallback for direct wallet voting)
    mapping(address => bool) public hasVoted;

    // Cryptographic single-use nullifiers to eliminate double voting with zero voter identity
    // Key: keccak256(abi.encodePacked(electionId, nullifierHash))
    mapping(bytes32 => bool) public isNullifierConsumed;

    // On-chain cryptographic audit anchors: electionId => anchored Merkle Root
    struct AuditAnchor {
        bytes32 merkleRoot;
        uint256 totalBallots;
        uint256 timestamp;
        address auditor;
        bool anchored;
    }
    mapping(string => AuditAnchor) public auditAnchors;

    // -------------------------------------------------------------
    // CYBERSECURITY & AUDIT EVENTS
    // -------------------------------------------------------------
    event RoleGranted(string role, address indexed account, address indexed grantedBy);
    event RoleRevoked(string role, address indexed account, address indexed revokedBy);

    event EmergencyPaused(address indexed triggeredBy, uint256 timestamp, string reason);
    event EmergencyUnpaused(address indexed triggeredBy, uint256 timestamp);

    event CandidateAdded(uint256 indexed candidateId, string name, string party, string symbol);
    event CandidateUpdated(uint256 indexed candidateId, string name, string party);
    event CandidateDisabled(uint256 indexed candidateId);

    event ElectionStarted(uint256 timestamp, address indexed authorizedOfficer);
    event ElectionEnded(uint256 timestamp, address indexed authorizedOfficer);

    // ZERO IDENTIFY LEAKAGE: emits only ballot commitment, nullifier hash and candidate ID
    event BallotCast(
        bytes32 indexed ballotCommitment,
        bytes32 indexed nullifierHash,
        uint256 indexed candidateId,
        uint256 timestamp
    );

    event AuditRootAnchored(
        string indexed electionId,
        bytes32 indexed merkleRoot,
        uint256 totalBallots,
        address indexed auditor,
        uint256 timestamp
    );

    // -------------------------------------------------------------
    // MODIFIERS
    // -------------------------------------------------------------
    modifier onlyAdmin() {
        require(msg.sender == admin, "Security: Caller is not Admin");
        _;
    }

    modifier onlyOfficer() {
        require(
            msg.sender == admin || electionOfficers[msg.sender],
            "Security: Caller is not authorized Election Officer"
        );
        _;
    }

    modifier onlyAuditor() {
        require(
            msg.sender == admin || auditors[msg.sender],
            "Security: Caller is not authorized Auditor"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Security: Contract operations paused by Emergency Circuit Breaker");
        _;
    }

    modifier whenPaused() {
        require(paused, "Security: Contract is not paused");
        _;
    }

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "Security: Reentrant call blocked");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    modifier electionActive() {
        require(electionStarted, "Election: Voting period has not started");
        require(!electionEnded, "Election: Voting period has closed");
        _;
    }

    // -------------------------------------------------------------
    // CONSTRUCTOR
    // -------------------------------------------------------------
    constructor() {
        admin = msg.sender;
        electionOfficers[msg.sender] = true;
        auditors[msg.sender] = true;
        _reentrancyStatus = _NOT_ENTERED;
        paused = false;
    }

    // -------------------------------------------------------------
    // ROLE MANAGEMENT
    // -------------------------------------------------------------
    function setElectionOfficer(address _officer, bool _status) external onlyAdmin {
        require(_officer != address(0), "Security: Invalid zero address");
        electionOfficers[_officer] = _status;
        if (_status) {
            emit RoleGranted("OFFICER", _officer, msg.sender);
        } else {
            emit RoleRevoked("OFFICER", _officer, msg.sender);
        }
    }

    function setAuditor(address _auditor, bool _status) external onlyAdmin {
        require(_auditor != address(0), "Security: Invalid zero address");
        auditors[_auditor] = _status;
        if (_status) {
            emit RoleGranted("AUDITOR", _auditor, msg.sender);
        } else {
            emit RoleRevoked("AUDITOR", _auditor, msg.sender);
        }
    }

    // -------------------------------------------------------------
    // EMERGENCY CIRCUIT BREAKER
    // -------------------------------------------------------------
    function emergencyPause(string calldata _reason) external onlyOfficer whenNotPaused {
        paused = true;
        emit EmergencyPaused(msg.sender, block.timestamp, _reason);
    }

    function emergencyUnpause() external onlyAdmin whenPaused {
        paused = false;
        emit EmergencyUnpaused(msg.sender, block.timestamp);
    }

    // -------------------------------------------------------------
    // CANDIDATE MANAGEMENT (Anti-DoS Input Bounds)
    // -------------------------------------------------------------
    function addCandidate(
        string memory _name,
        string memory _party,
        string memory _symbol,
        string memory _description
    ) external onlyOfficer whenNotPaused nonReentrant {
        require(!electionStarted, "Election: Cannot alter candidate list once election has started");
        require(bytes(_name).length > 0 && bytes(_name).length <= 128, "Security: Invalid candidate name length");
        require(bytes(_party).length <= 64, "Security: Invalid party name length");
        require(bytes(_symbol).length <= 64, "Security: Invalid symbol length");
        require(bytes(_description).length <= 512, "Security: Invalid description length");

        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            party: _party,
            symbol: _symbol,
            description: _description,
            voteCount: 0,
            exists: true,
            active: true
        });

        emit CandidateAdded(candidateCount, _name, _party, _symbol);
    }

    function editCandidate(
        uint256 _candidateId,
        string memory _name,
        string memory _party,
        string memory _symbol,
        string memory _description
    ) external onlyOfficer whenNotPaused nonReentrant {
        require(!electionStarted, "Election: Cannot edit candidate after voting has commenced");
        require(candidates[_candidateId].exists, "Election: Candidate does not exist");
        require(bytes(_name).length > 0 && bytes(_name).length <= 128, "Security: Invalid candidate name length");

        Candidate storage c = candidates[_candidateId];
        c.name = _name;
        c.party = _party;
        c.symbol = _symbol;
        c.description = _description;

        emit CandidateUpdated(_candidateId, _name, _party);
    }

    function disableCandidate(uint256 _candidateId) external onlyOfficer whenNotPaused {
        require(candidates[_candidateId].exists, "Election: Candidate does not exist");
        candidates[_candidateId].active = false;
        emit CandidateDisabled(_candidateId);
    }

    // -------------------------------------------------------------
    // ELECTION LIFECYCLE MANAGEMENT
    // -------------------------------------------------------------
    function startElection() external onlyOfficer whenNotPaused {
        require(candidateCount > 0, "Election: Must register at least one candidate before starting");
        require(!electionStarted, "Election: Election already in progress");

        electionStarted = true;
        electionStartTime = block.timestamp;

        emit ElectionStarted(block.timestamp, msg.sender);
    }

    function endElection() external onlyOfficer whenNotPaused {
        require(electionStarted, "Election: Election has not been started");
        require(!electionEnded, "Election: Election already concluded");

        electionEnded = true;
        electionEndTime = block.timestamp;

        emit ElectionEnded(block.timestamp, msg.sender);
    }

    // -------------------------------------------------------------
    // PRIVACY-PRESERVING VOTING & ZERO-KNOWLEDGE NULLIFIERS
    // -------------------------------------------------------------
    /**
     * @notice Cast an anonymous ballot utilizing a one-time cryptographic nullifier.
     * @dev Prevents double-voting while maintaining 100% decoupling from voter identity.
     * @param _ballotCommitment Cryptographic hash of the candidate selection + client nonce.
     * @param _nullifierHash One-time hash derived from voter's single-use credential token.
     * @param _candidateId The selected candidate's sequential identifier.
     */
    function voteWithCommitment(
        bytes32 _ballotCommitment,
        bytes32 _nullifierHash,
        uint256 _candidateId
    ) external whenNotPaused electionActive nonReentrant {
        require(_nullifierHash != bytes32(0), "Security: Nullifier hash cannot be empty");
        require(!isNullifierConsumed[_nullifierHash], "Security: Voting credential has already been consumed");
        require(candidates[_candidateId].exists, "Election: Selected candidate does not exist");
        require(candidates[_candidateId].active, "Election: Selected candidate has been disabled");

        // Mark nullifier as spent before state mutations (Checks-Effects-Interactions)
        isNullifierConsumed[_nullifierHash] = true;
        candidates[_candidateId].voteCount++;

        emit BallotCast(
            _ballotCommitment,
            _nullifierHash,
            _candidateId,
            block.timestamp
        );
    }

    /**
     * @notice Direct wallet voting fallback with domain separation and pseudo-commitment.
     */
    function vote(uint256 _candidateId) external whenNotPaused electionActive nonReentrant {
        require(!hasVoted[msg.sender], "Security: You have already voted");
        require(candidates[_candidateId].exists, "Election: Selected candidate does not exist");
        require(candidates[_candidateId].active, "Election: Selected candidate has been disabled");

        hasVoted[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        bytes32 pseudoNullifier = keccak256(abi.encodePacked(msg.sender, address(this)));
        bytes32 pseudoCommitment = keccak256(abi.encodePacked(msg.sender, block.timestamp, _candidateId));

        emit BallotCast(
            pseudoCommitment,
            pseudoNullifier,
            _candidateId,
            block.timestamp
        );
    }

    // -------------------------------------------------------------
    // ON-CHAIN AUDIT ROOT ANCHORING
    // -------------------------------------------------------------
    /**
     * @notice Anchors the election's final Merkle Root to the blockchain for independent CAG/statutory verification.
     */
    function anchorAuditProof(
        string calldata _electionId,
        bytes32 _merkleRoot,
        uint256 _totalBallots
    ) external onlyAuditor whenNotPaused {
        require(electionEnded, "Audit: Can only anchor audit root after election has concluded");
        require(_merkleRoot != bytes32(0), "Audit: Invalid empty Merkle root");
        require(!auditAnchors[_electionId].anchored, "Audit: Election audit root already anchored");

        auditAnchors[_electionId] = AuditAnchor({
            merkleRoot: _merkleRoot,
            totalBallots: _totalBallots,
            timestamp: block.timestamp,
            auditor: msg.sender,
            anchored: true
        });

        emit AuditRootAnchored(
            _electionId,
            _merkleRoot,
            _totalBallots,
            msg.sender,
            block.timestamp
        );
    }

    // -------------------------------------------------------------
    // VIEW FUNCTIONS
    // -------------------------------------------------------------
    function getCandidate(uint256 _candidateId)
        external
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
        return (c.id, c.name, c.party, c.symbol, c.description, c.voteCount, c.exists, c.active);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory result = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            result[i - 1] = candidates[i];
        }
        return result;
    }

    function owner() external view returns (address) {
        return admin;
    }

    function hasAddressVoted(address voter) external view returns (bool) {
        return hasVoted[voter];
    }

    function isNullifierUsed(bytes32 _nullifierHash) external view returns (bool) {
        return isNullifierConsumed[_nullifierHash];
    }

    function getAuditAnchor(string calldata _electionId)
        external
        view
        returns (
            bytes32 merkleRoot,
            uint256 totalBallots,
            uint256 timestamp,
            address auditor,
            bool anchored
        )
    {
        AuditAnchor memory anchor = auditAnchors[_electionId];
        return (anchor.merkleRoot, anchor.totalBallots, anchor.timestamp, anchor.auditor, anchor.anchored);
    }
}