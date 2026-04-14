// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ─── Custom Errors (gas-optimized vs require strings) ───────────────────────
error ZeroAmount();
error TransferFailed();
error InsufficientStake();
error PlayerNotFound();
error InsufficientYieldReserve();
error InvalidMetadataURI();

/// @title  PSL ScoutingPool — Module 4
/// @notice Fans stake ERC-20 tokens to back cricket players. The backend
///         Oracle calls `distributeYield` after match performance events,
///         and proportional earnings accrue to every staker in that pool.
/// @dev    Uses CEI (Checks-Effects-Interactions) + ReentrancyGuard.
contract ScoutingPool is ReentrancyGuard, Ownable {

    // ─── State ──────────────────────────────────────────────────────────
    IERC20 public immutable wireFluidToken;

    /// @notice Tokens reserved exclusively for yield payouts
    uint256 public yieldReserve;

    struct PlayerPool {
        uint256 totalStaked;
        uint256 totalEarningsProcessed;
        mapping(address => uint256) userStakes;
    }

    /// @dev playerId ➜ pool
    mapping(string => PlayerPool) private pools;
    /// @dev playerId ➜ IPFS metadata URI  (set by Oracle)
    mapping(string => string) public playerMetadataURI;

    // ─── Events ─────────────────────────────────────────────────────────
    event Staked(string indexed playerId, address indexed fan, uint256 amount);
    event Withdrawn(string indexed playerId, address indexed fan, uint256 amount);
    event YieldDistributed(string indexed playerId, uint256 totalAmount);
    event YieldReserveFunded(address indexed funder, uint256 amount);
    event PlayerMetadataUpdated(string indexed playerId, string uri);

    // ─── Constructor ────────────────────────────────────────────────────
    constructor(address _tokenAddress) Ownable(msg.sender) {
        wireFluidToken = IERC20(_tokenAddress);
    }

    // ─── Fan Actions ────────────────────────────────────────────────────

    /// @notice Stake tokens to back a player's career
    function stake(string calldata playerId, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        bool ok = wireFluidToken.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        pools[playerId].userStakes[msg.sender] += amount;
        pools[playerId].totalStaked += amount;

        emit Staked(playerId, msg.sender, amount);
    }

    /// @notice Withdraw original stake + proportional share of earnings
    function withdraw(string calldata playerId) external nonReentrant {
        uint256 userStake = pools[playerId].userStakes[msg.sender];
        if (userStake == 0) revert InsufficientStake();

        uint256 shareOfEarnings = (userStake * pools[playerId].totalEarningsProcessed)
                                  / pools[playerId].totalStaked;
        uint256 totalToReturn   = userStake + shareOfEarnings;

        // CEI: zero-out state BEFORE external call
        pools[playerId].totalStaked          -= userStake;
        pools[playerId].userStakes[msg.sender] = 0;

        bool ok = wireFluidToken.transfer(msg.sender, totalToReturn);
        if (!ok) revert TransferFailed();

        emit Withdrawn(playerId, msg.sender, totalToReturn);
    }

    // ─── Oracle / Backend Actions ───────────────────────────────────────

    /// @notice Owner pre-funds the yield reserve
    function fundYieldReserve(uint256 amount) external onlyOwner nonReentrant {
        if (amount == 0) revert ZeroAmount();

        bool ok = wireFluidToken.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        yieldReserve += amount;
        emit YieldReserveFunded(msg.sender, amount);
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