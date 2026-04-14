import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class DistributeYieldDto {
  @ApiProperty({ example: "babar-azam" })
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @ApiProperty({ example: 85, description: "Match performance score 0-100" })
  @IsInt()
  @Min(0)
  @Max(100)
  performanceScore!: number;
}
