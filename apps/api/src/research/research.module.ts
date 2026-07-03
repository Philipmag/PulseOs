import { Global, Module } from "@nestjs/common";
import { FirecrawlClient } from "./firecrawl.client.js";

@Global()
@Module({ providers: [FirecrawlClient], exports: [FirecrawlClient] })
export class ResearchModule {}
