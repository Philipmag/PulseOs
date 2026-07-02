import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { loadConfig } from "./configuration.js";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Validate & coerce the whole environment once, at boot.
      validate: () => loadConfig(),
    }),
  ],
})
export class ConfigModule {}
