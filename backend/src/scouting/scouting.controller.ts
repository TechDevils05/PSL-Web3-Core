import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ScoutingService } from "./scouting.service.js";
import { RegisterPlayerDto } from "./dto/register-player.dto.js";
import { DistributeYieldDto } from "./dto/distribute-yield.dto.js";

@ApiTags("scouting")
@Controller("scouting")
export class ScoutingController {
  constructor(private readonly scouting: ScoutingService) {}

  /* ================================================================== */
  /*  Player registration (IPFS + On-chain)                             */
  /* ================================================================== */

  @Post("register-player")
  @ApiOperation({
    summary: "Upload player metadata to IPFS & store CID on-chain",
  })
  async registerPlayer(@Body() dto: RegisterPlayerDto) {
    return this.scouting.registerPlayer(dto);
  }

  /* ================================================================== */
  /*  Pool queries                                                      */
  /* ================================================================== */

  @Get("pool/:playerId")
  @ApiOperation({ summary: "Get staking pool data for a player" })
  async getPoolData(@Param("playerId") playerId: string) {
    return this.scouting.getPoolData(playerId);
  }

  @Get("stake/:playerId/:userAddress")
  @ApiOperation({ summary: "Get a specific user's stake in a player pool" })
  async getUserStake(
    @Param("playerId") playerId: string,
    @Param("userAddress") userAddress: string,
  ) {
    const stake = await this.scouting.getUserStake(playerId, userAddress);
    return { playerId, userAddress, stake };
  }

  /* ================================================================== */
  /*  Yield distribution                                                */
  /* ================================================================== */

  @Post("distribute-yield")
  @ApiOperation({
    summary: "Trigger yield distribution based on match performance",
  })
  async distributeYield(@Body() dto: DistributeYieldDto) {
    return this.scouting.distributeYield(dto.playerId, dto.performanceScore);
  }

  @Post("simulate-match/:playerId")
  @ApiOperation({
    summary: "Simulate a random match & auto-distribute yield (demo)",
  })
  async simulateMatch(@Param("playerId") playerId: string) {
    return this.scouting.simulateMatchPerformance(playerId);
  }
}
