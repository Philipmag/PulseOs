import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ResponseEnvelopeInterceptor } from "./common/response-envelope.interceptor.js";

/**
 * Single codebase, two roles (Phase 6). PROCESS_ROLE=api serves HTTP; the worker
 * role will attach BullMQ processors once the job modules exist. Both share the
 * same DI container so services (ModelRouter, BrandBrainService, ...) are reused.
 */
async function bootstrap(): Promise<void> {
  const role = process.env.PROCESS_ROLE ?? "api";
  const logger = new Logger("Bootstrap");

  if (role === "worker") {
    // Workers still need the DI container, just not the HTTP listener.
    const app = await NestFactory.createApplicationContext(AppModule);
    await app.init();
    logger.log("Worker context started (BullMQ processors register here).");
    return;
  }

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  logger.log(`API listening on :${port} (prefix /api/v1)`);
}

void bootstrap();
