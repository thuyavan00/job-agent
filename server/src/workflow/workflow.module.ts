import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { DiscoveryModule } from "@nestjs/core";
import { WorkflowController } from "./workflow.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowOrchestratorService } from "./orchestrator/workflow-orchestrator.service";
import { WorkflowExecutionProcessor } from "./orchestrator/workflow-execution.processor";
// Async handlers
import { TriggerJobMatchHandler } from "./orchestrator/handlers/trigger-job-match.handler";
import { AiResumeTailorHandler } from "./orchestrator/handlers/ai-resume-tailor.handler";
import { BrowserApplyHandler } from "./orchestrator/handlers/browser-apply.handler";
// Inline handlers
import { JobFilterHandler } from "./orchestrator/handlers/job-filter.handler";
import { SalaryCheckHandler } from "./orchestrator/handlers/salary-check.handler";
import { LocationCheckHandler } from "./orchestrator/handlers/location-check.handler";
import { SaveJobHandler } from "./orchestrator/handlers/save-job.handler";
// Registry
import { handlerRegistryProvider } from "./orchestrator/registry/handler-registry";
// Entities
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
    DiscoveryModule,
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
    // Async handlers
    TriggerJobMatchHandler,
    AiResumeTailorHandler,
    BrowserApplyHandler,
    // Inline handlers
    JobFilterHandler,
    SalaryCheckHandler,
    LocationCheckHandler,
    SaveJobHandler,
    // Handler registry (must come after all handler providers)
    handlerRegistryProvider,
  ],
  exports: [WorkflowService, WorkflowOrchestratorService],
})
export class WorkflowModule {}
