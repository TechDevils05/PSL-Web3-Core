import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class RegisterPlayerDto {
  @ApiProperty({ example: "Babar Azam" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "Peshawar Zalmi" })
  @IsString()
  @IsNotEmpty()
  team!: string;

  @ApiProperty({ example: "batsman", enum: ["batsman", "bowler", "all-rounder", "wicketkeeper"] })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional({
    example: { matches: 95, runs: 3200, average: 44.2, strikeRate: 131.5 },
  })
  @IsObject()
  @IsOptional()
  stats?: Record<string, unknown>;

  @ApiPropertyOptional({ description: "Base64-encoded player image" })
  @IsString()
  @IsOptional()
  imageBase64?: string;
}
