import { Injectable } from "@nestjs/common";
import { Prisma } from "@pulseos/database";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * Records every background job's lifecycle in the system_jobs table so the UI can
 * show progress and so AI prompts containing brand data are logged to
 * system_jobs.input (Security Requirements: 90-day retention). Log first, process
 * second (Execution Rule #3 applies the same principle to learning_events).
 */
@Injectable()
export class SystemJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(
    jobType: string,
    brandId: string | null,
    input: Prisma.InputJsonValue,
  ) {
    return this.prisma.systemJob.create({
      data: {
        jobType,
        brandId,
        input,
        status: "running",
        startedAt: new Date(),
      },
    });
  }

  async progress(jobId: string, progress: number) {
    return this.prisma.systemJob.update({
      where: { id: jobId },
      data: { progress: Math.max(0, Math.min(100, Math.round(progress))) },
    });
  }

  async complete(jobId: string, output: Prisma.InputJsonValue) {
    return this.prisma.systemJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        progress: 100,
        output,
        completedAt: new Date(),
      },
    });
  }

  async fail(jobId: string, error: string) {
    return this.prisma.systemJob.update({
      where: { id: jobId },
      data: { status: "failed", error, completedAt: new Date() },
    });
  }
}
