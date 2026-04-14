import { Module } from "@nestjs/common";
import { ScoutingService } from "./scouting.service.js";
import { ScoutingController } from "./scouting.controller.js";

@Module({
  controllers: [ScoutingController],
  providers: [ScoutingService],
  exports: [ScoutingService],
})
export class ScoutingModule {}
