// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ─── Custom Errors (gas-optimized) ──────────────────────────────────────────
error ZeroAmount();
error TransferFailed();
error InsufficientStake();
error PlayerNotFound();
error InsufficientYieldReserve();
error InvalidMetadataURI();

/// @title  PSL ScoutingPool — Module 4
/// @notice Fans stake native WIRE tokens to back cricket players. The backend
///         Oracle calls `distributeYield` after match performance events,
///         and proportional earnings accrue to every staker in that pool.
/// @dev    Uses CEI (Checks-Effects-Interactions) + ReentrancyGuard.
///         Rewritten to use native WIRE instead of ERC-20, consistent with
///         YieldDistribution's native token pattern.
contract ScoutingPool is ReentrancyGuard, Ownable {

    // ─── State ──────────────────────────────────────────────────────────

    /// @notice Native WIRE reserved exclusively for yield payouts
    uint256 public yieldReserve;

    struct PlayerPool {
        uint256 totalStaked;
        uint256 totalEarningsProcessed;
        mapping(address => uint256) userStakes;
    }

    /// @dev playerId ➜ pool
    mapping(string => PlayerPool) private pools;
    /// @dev playerId ➜ IPFS metadata URI (set by Oracle)
    mapping(string => string) public playerMetadataURI;

    // ─── Events ─────────────────────────────────────────────────────────
    event Staked(string indexed playerId, address indexed fan, uint256 amount);
    event Withdrawn(string indexed playerId, address indexed fan, uint256 amount);
    event YieldDistributed(string indexed playerId, uint256 totalAmount);
    event YieldReserveFunded(address indexed funder, uint256 amount);
    event PlayerMetadataUpdated(string indexed playerId, string uri);

    // ─── Constructor ────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ─── Receive native WIRE ─────────────────────────────────────────────
    /// @notice Allows contract to receive native WIRE (e.g. from yield reserve funding)
    receive() external payable {}

    // ─── Fan Actions ────────────────────────────────────────────────────

    /// @notice Stake native WIRE to back a player's career
    function stake(string calldata playerId) external payable nonReentrant {
        if (msg.value == 0) revert ZeroAmount();

        pools[playerId].userStakes[msg.sender] += msg.value;
        pools[playerId].totalStaked += msg.value;

        emit Staked(playerId, msg.sender, msg.value);
    }

    /// @notice Withdraw original stake + proportional share of earnings
    function withdraw(string calldata playerId) external nonReentrant {
        uint256 userStake = pools[playerId].userStakes[msg.sender];
        if (userStake == 0) revert InsufficientStake();

        uint256 shareOfEarnings = (userStake * pools[playerId].totalEarningsProcessed)
                                  / pools[playerId].totalStaked;
        uint256 totalToReturn = userStake + shareOfEarnings;

        // CEI: zero-out state BEFORE external call
        pools[playerId].totalStaked            -= userStake;
        pools[playerId].userStakes[msg.sender]  = 0;

        (bool ok, ) = payable(msg.sender).call{value: totalToReturn}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(playerId, msg.sender, totalToReturn);
    }

    // ─── Oracle / Backend Actions ───────────────────────────────────────

    /// @notice Owner pre-funds the yield reserve with native WIRE
    function fundYieldReserve() external payable onlyOwner {
        if (msg.value == 0) revert ZeroAmount();
        yieldReserve += msg.value;
        emit YieldReserveFunded(msg.sender, msg.value);
    }

    /// @notice Distribute yield to a player pool (called by NestJS Oracle)
    function distributeYield(
        string calldata playerId,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (pools[playerId].totalStaked == 0) revert PlayerNotFound();
        if (yieldReserve < amount) revert InsufficientYieldReserve();

        yieldReserve -= amount;
        pools[playerId].totalEarningsProcessed += amount;

        emit YieldDistributed(playerId, amount);
    }

    /// @notice Attach IPFS metadata to a player (called after Pinata upload)
    function setPlayerMetadata(
        string calldata playerId,
        string calldata uri
    ) external onlyOwner {
        if (bytes(uri).length == 0) revert InvalidMetadataURI();
        playerMetadataURI[playerId] = uri;
        emit PlayerMetadataUpdated(playerId, uri);
    }

    // ─── View Helpers ───────────────────────────────────────────────────

    function getPoolData(string calldata playerId)
        external view returns (uint256 staked, uint256 earnings)
    {
        return (pools[playerId].totalStaked, pools[playerId].totalEarningsProcessed);
    }

    function getUserStake(string calldata playerId, address user)
        external view returns (uint256)
    {
        return pools[playerId].userStakes[user];
    }
}
