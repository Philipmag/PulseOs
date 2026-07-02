import { Global, Module } from "@nestjs/common";
import { ModelRouter } from "./model-router.service.js";

@Global()
@Module({
  providers: [ModelRouter],
  exports: [ModelRouter],
})
export class AiModule {}
