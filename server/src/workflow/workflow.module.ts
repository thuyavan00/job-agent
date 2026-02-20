import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowOrchestratorService } from "./orchestrator/workflow-orchestrator.service";
import { WorkflowExecutionProcessor } from "./orchestrator/workflow-execution.processor";
import { TriggerJobMatchHandler } from "./orchestrator/handlers/trigger-job-match.handler";
import { AiResumeTailorHandler } from "./orchestrator/handlers/ai-resume-tailor.handler";
import { BrowserApplyHandler } from "./orchestrator/handlers/browser-apply.handler";
import { Workflow } from "./entities/workflow.entity";
import { WorkflowNode } from "./entities/workflow-node.entity";
import { WorkflowEdge } from "./entities/workflow-edge.entity";
import { WorkflowRun } from "./entities/workflow-run.entity";
import { WorkflowNodeRun } from "./entities/workflow-node-run.entity";
import { Profile } from "@resume/entities/profile.entity";
import { JobApplication } from "@dashboard/entities/job-application.entity";
import { JobsModule } from "@jobs/jobs.module";
import { WORKFLOW_QUEUE } from "./orchestrator/workflow-queue.types";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workflow,
      WorkflowNode,
      WorkflowEdge,
      WorkflowRun,
      WorkflowNodeRun,
      // Entities needed by handlers
      Profile,
      JobApplication,
    ]),
    BullModule.registerQueue({ name: WORKFLOW_QUEUE }),
    JobsModule, // provides JobsService for TriggerJobMatchHandler
  ],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowOrchestratorService,
    WorkflowExecutionProcessor,
    TriggerJobMatchHandler,
    AiResumeTailorHandler,
    BrowserApplyHandler,
  ],
  exports: [WorkflowService, WorkflowOrchestratorService],
})
export class WorkflowModule {}
