import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { WorkflowService } from "./workflow.service";
import { WorkflowOrchestratorService } from "./orchestrator/workflow-orchestrator.service";
import { JwtAuthGuard } from "@auth/guards/jwt-auth.guard";
import { CurrentUser } from "@auth/decorators/current-user.decorator";
import { User } from "@resume/entities/user.entity";
import { WorkflowStatus } from "./entities/workflow.entity";
import { RunTrigger } from "./entities/workflow-run.entity";
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  SaveWorkflowGraphDto,
  TriggerRunDto,
} from "./workflow.dto";

@UseGuards(JwtAuthGuard)
@Controller("workflows")
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly orchestrator: WorkflowOrchestratorService,
  ) {}

  // ── Workflow CRUD ────────────────────────────────────────────────────────────

  @Get()
  list(@CurrentUser() user: User) {
    return this.workflowService.listWorkflows(user.id);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: User) {
    return this.workflowService.getWorkflow(id, user.id);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.createWorkflow(user.id, dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @CurrentUser() user: User, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.updateWorkflow(id, user.id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    return this.workflowService.deleteWorkflow(id, user.id);
  }

  // ── Graph (atomic node+edge save from React Flow canvas) ─────────────────────

  @Put(":id/graph")
  saveGraph(@Param("id") id: string, @CurrentUser() user: User, @Body() dto: SaveWorkflowGraphDto) {
    return this.workflowService.saveGraph(id, user.id, dto);
  }

  // ── Activation ───────────────────────────────────────────────────────────────

  @Patch(":id/activate")
  activate(@Param("id") id: string, @CurrentUser() user: User) {
    return this.workflowService.setStatus(id, user.id, WorkflowStatus.ACTIVE);
  }

  @Patch(":id/pause")
  pause(@Param("id") id: string, @CurrentUser() user: User) {
    return this.workflowService.setStatus(id, user.id, WorkflowStatus.PAUSED);
  }

  // ── Runs ─────────────────────────────────────────────────────────────────────

  @Post(":id/runs")
  triggerRun(
    @Param("id") id: string,
    @CurrentUser() user: User,
    @Body() dto: TriggerRunDto,
  ) {
    return this.orchestrator.startRun(
      id,
      user.id,
      user.email,
      dto.triggeredBy ?? RunTrigger.MANUAL,
    );
  }

  @Get(":id/runs")
  listRuns(@Param("id") id: string, @CurrentUser() user: User) {
    return this.workflowService.listRuns(id, user.id);
  }

  @Get(":id/runs/:runId")
  getRun(@Param("runId") runId: string) {
    return this.workflowService.getRun(runId);
  }
}
