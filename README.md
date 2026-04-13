# Dynamic Fantasy Moments — PSL x Web3
### Complete Project Reference Doc (Hackathon Edition)

---

## 1. THE CORE CONCEPT

Dynamic NFTs that evolve based on real-world PSL performance. Every significant moment (Babar century, Shaheen five-for, last-ball six) is minted as an ERC-721 + ERC-6551 Token Bound Account NFT. As the player performs, the oracle detects it, and the NFT upgrades itself — new rarity tier, new visual, new AI-generated narrative, higher value. The fan does nothing. The blockchain does everything.

**The killer argument:** WireFluid abstracts gas fees entirely. No MetaMask popup. No ETH balance required. A cricket fan in Lahore buys with a credit card and watches their asset evolve like a Web2 app. Without WireFluid, the experience collapses the second a gas prompt appears.

---

## 2. THE FULL EVENT CHAIN

One command triggers the entire sequence on demo day:

```
node oracle/triggerDemo.js EVT-DEMO
```

**End-to-end flow:**
1. Oracle script reads `mockPSLStats.json`
2. Score calculator runs → computes Performance Score (0–1000)
3. New score pushed on-chain via `oracleContract.updatePlayerStats()`
4. Smart contract checks tier threshold → determines upgrade
5. If upgraded: Claude API generates new NFT narrative
6. New metadata JSON built with narrative + stats
7. Metadata pinned to IPFS → `tokenURI` updated on-chain
8. Frontend detects change via React Query polling (every 3s)
9. NFT card animates the tier change
10. Yield contract routes platform fees into NFT's ERC-6551 wallet

---

## 3. RARITY TIERS

| Tier | Performance Score | Description |
|------|-----------------|-------------|
| COMMON | 0–199 | Base state |
| RARE | 200–449 | Solid performer |
| EPIC | 450–699 | Standout moments |
| LEGEND | 700–899 | Historic performances |
| ICON | 900–1000 | Once-in-a-generation |

**Raw stats thresholds (from mock data):**

| Tier | Min Runs | Min SR | Min Wickets |
|------|---------|--------|-------------|
| COMMON | 0 | 0 | 0 |
| RARE | 30 | 120 | 2 |
| EPIC | 50 | 150 | 3 |
| LEGEND | 100 | 160 | 5 |

---

## 4. PERFORMANCE SCORE FORMULA

Four components feed the live score (0–1000 cap):

| Component | Weight | Description |
|-----------|--------|-------------|
| Recent Form | 40% (max 400pts) | Average of last 5 matches |
| Career Milestones | 25% (max 250pts) | Cumulative, never decays |
| Trade Popularity | 20% (max 200pts) | Volume vs. platform max |
| Mint Rarity | 15% (max 150pts) | Fixed at mint time |

**Milestone point values:**

| Milestone | Points |
|-----------|--------|
| hat_trick | 100 |
| psl_title | 150 |
| five_wicket_haul | 90 |
| century | 80 |
| national_squad | 50 |
| player_of_match | 40 |
| half_century | 30 |

**Key design insight:** The decay on Recent Form creates speculative tension. An injured player's NFT slowly loses score → cheap buy opportunity → player returns and scores a century → rockets back to ICON. Automated, no human intervention. This is the story to tell on stage.

---

## 5. FILE STRUCTURE

```
project/
├── contracts/
│   ├── DynamicMomentNFT.sol       # ERC-721 + ERC-6551 TBA
│   ├── OracleIntegration.sol      # Receives stats, triggers upgrades
│   └── YieldDistribution.sol      # Routes platform fees to NFT wallets
├── oracle/
│   ├── data/
│   │   └── mockPSLStats.json      # Pre-scripted demo events
│   ├── triggerDemo.js             # Main demo trigger script
│   ├── scoreCalculator.js         # Converts stats → Performance Score
│   └── generateMetadata.js        # Claude API → NFT narrative
├── frontend/
│   ├── src/
│   │   ├── abi/
│   │   │   └── OracleIntegration.json
│   │   ├── components/
│   │   │   └── NFTCard.jsx        # Live-polling upgrade UI
│   │   └── App.jsx
│   └── .env
├── hardhat.config.js
└── .env                           # SEPOLIA_RPC_URL, PRIVATE_KEY, ORACLE_CONTRACT_ADDRESS
```

---

## 6. KEY CODE FILES

### `oracle/data/mockPSLStats.json` (truncated — key events)

```json
{
  "season": "PSL 2026",
  "matches": [
    {
      "matchId": "PSL2026-FINAL",
      "events": [{
        "eventId": "EVT-DEMO",
        "playerId": "babar-azam",
        "playerName": "Babar Azam",
        "eventType": "BATTING_MILESTONE",
        "stat": "century",
        "runs": 119,
        "strikeRate": 167.6,
        "rarityTrigger": "LEGEND",
        "narrativeHint": "The king of Karachi crowns himself in the final"
      }]
    }
  ]
}
```

Set `rarityTrigger` to `"LEGEND"` or `"ICON"` for `EVT-DEMO` to guarantee maximum visual upgrade on stage.

---

### `oracle/triggerDemo.js`

```javascript
require("dotenv").config();
const { ethers } = require("ethers");
const mockData = require("./data/mockPSLStats.json");
const { generateNFTNarrative } = require("./generateMetadata");

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function triggerUpgrade(eventId) {
  const event = mockData.matches
    .flatMap(m => m.events)
    .find(e => e.eventId === eventId);

  const narrative = await generateNFTNarrative(event);
  console.log("Generated narrative:\n", narrative);

  const oracleContract = new ethers.Contract(
    process.env.ORACLE_CONTRACT_ADDRESS,
    require("../frontend/src/abi/OracleIntegration.json"),
    signer
  );

  const tx = await oracleContract.updatePlayerStats(
    event.playerId,
    event.runs || 0,
    Math.floor(event.strikeRate || 0),
    event.wickets || 0,
    event.rarityTrigger
  );

  await tx.wait();
  console.log("NFT upgraded on-chain. No gas paid by user.");
}

triggerUpgrade(process.argv[2] || "EVT-DEMO");
```

---

### `oracle/scoreCalculator.js`

```javascript
function calculatePerformanceScore(playerData) {
  const { recentMatches, milestones, tradeVolume, maxTradeVolume, mintRarity } = playerData;

  const last5 = recentMatches.slice(-5);
  const avgForm = last5.reduce((sum, m) => sum + m.formPoints, 0) / last5.length;
  const formScore      = (avgForm / 100) * 400;
  const milestoneScore = Math.min(milestones.reduce((s, m) => s + m.points, 0), 250);
  const popScore       = (tradeVolume / maxTradeVolume) * 200;
  const rarityScore    = (mintRarity / 100) * 150;

  const total = Math.min(Math.round(formScore + milestoneScore + popScore + rarityScore), 1000);
  return { total, tier: getTier(total) };
}

function getTier(score) {
  if (score >= 900) return "ICON";
  if (score >= 700) return "LEGEND";
  if (score >= 450) return "EPIC";
  if (score >= 200) return "RARE";
  return "COMMON";
}

const MILESTONE_POINTS = {
  century: 80, half_century: 30, five_wicket_haul: 90,
  hat_trick: 100, player_of_match: 40, psl_title: 150, national_squad: 50,
};

module.exports = { calculatePerformanceScore, getTier, MILESTONE_POINTS };
```

---

### `oracle/generateMetadata.js`

```javascript
const Anthropic = require("@anthropic-ai/sdk");
const client = new Anthropic();

async function generateNFTNarrative(event) {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Write a 2-sentence NFT description for this cricket moment.
Player: ${event.playerName}
Achievement: ${event.stat} — ${event.runs || event.wickets} ${event.eventType === "BATTING_MILESTONE" ? "runs" : "wickets"}
Context: ${event.matchContext}
Tone: dramatic, collectible, legendary. No hashtags. No emojis.`
    }]
  });
  return message.content[0].text;
}

module.exports = { generateNFTNarrative };
```

---

## 7. SMART CONTRACT ARCHITECTURE

**Three contracts, three jobs:**

| Contract | Job |
|---------|-----|
| `DynamicMomentNFT.sol` | ERC-721 + ERC-6551 TBA — minting, token identity, owns its own wallet |
| `OracleIntegration.sol` | Receives `updatePlayerStats()` calls, runs upgrade logic, updates `tokenURI` |
| `YieldDistribution.sol` | Collects platform fees, routes proportionally into each NFT's TBA wallet |

**Royalty split on every trade (auto-executed by contract):**
- 85% → Seller
- 10% → Player royalty
- 5% → Platform fee (partial flow to yield contract)

**Upgrade logic flow in `OracleIntegration.sol`:**
1. Receive `(playerId, runs, strikeRate, wickets, rarityTrigger)`
2. Map `rarityTrigger` string to enum tier
3. If tier > current tier: trigger upgrade
4. Call Claude API (off-chain via oracle), pin new metadata to IPFS
5. Call `setTokenURI(tokenId, newIPFSHash)` on NFT contract

---

## 8. TECH STACK SUMMARY

| Layer | Language/Framework |
|-------|--------------------|
| Smart contracts | Solidity |
| Contract testing | Hardhat + Chai (JavaScript) |
| Oracle scripts | Node.js |
| Frontend | React + Tailwind CSS |
| Blockchain interaction | ethers.js |
| AI narrative generation | Anthropic SDK (`claude-sonnet-4-20250514`) |
| Metadata storage | IPFS (Pinata or NFT.Storage) |
| Gasless transactions | WireFluid SDK |
| Testnet | Sepolia |
| Data polling | React Query (3s interval) |

**Bottom line:** 75% of the codebase is JavaScript. Solidity syntax is similar to JS/Java. The only genuinely new concepts for a web dev are ethers.js patterns and Hardhat workflow.

---

## 9. TEAM RESPONSIBILITIES

| Role | Scope |
|------|-------|
| Smart Contracts | ERC-721, ERC-6551, OracleIntegration, YieldDistribution — Solidity, Hardhat, Sepolia deploy |
| Frontend | React app, WireFluid SDK, ethers.js hooks, live NFT dashboard + marketplace UI |
| Data / Oracle | Mock data scripts, Claude API integration, score calculator, IPFS pinning |
| Presentation | Demo flow, judge narrative — land "bleed value" and "trap liquidity" at exactly the right moment |

---

## 10. DEMO DAY CHECKLIST

**Three things that MUST be bulletproof (judges will verify live):**
1. ✅ Upgrade engine — tier changes visually on-screen
2. ✅ Royalty split — 10/5/85 executes automatically on trade
3. ✅ Gasless transactions — zero MetaMask popups, zero ETH prompts

**Demo sequence on stage:**
```bash
# Terminal 1 — trigger the oracle event
node oracle/triggerDemo.js EVT-DEMO

# Frontend — already open, React Query polling every 3s
# Judges watch the NFT card animate from RARE → LEGEND
# No clicks required. No gas. No wallet setup.
```

**Closing line to judges:** "Try building this anywhere else. The moment you ask a cricket fan to buy ETH for gas, you've already lost them. WireFluid is not a feature of our app — it's the reason our app can exist."

---

## 11. ENV VARIABLES NEEDED

```env
SEPOLIA_RPC_URL=
PRIVATE_KEY=
ORACLE_CONTRACT_ADDRESS=
ANTHROPIC_API_KEY=
PINATA_API_KEY=
PINATA_SECRET_KEY=
WIREFLUID_API_KEY=
```

---

*Last updated: Hackathon prep — PSL x Web3 / Entangle 2026*
