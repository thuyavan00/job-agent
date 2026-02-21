import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Workflow, WorkflowStatus } from "./entities/workflow.entity";
import { WorkflowNode, NodeSetupStatus } from "./entities/workflow-node.entity";
import { WorkflowEdge } from "./entities/workflow-edge.entity";
import { WorkflowRun, RunStatus, RunTrigger } from "./entities/workflow-run.entity";
import { WorkflowNodeRun } from "./entities/workflow-node-run.entity";
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  SaveWorkflowGraphDto,
  TriggerRunDto,
} from "./workflow.dto";

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepo: Repository<Workflow>,
    @InjectRepository(WorkflowNode)
    private readonly nodeRepo: Repository<WorkflowNode>,
    @InjectRepository(WorkflowEdge)
    private readonly edgeRepo: Repository<WorkflowEdge>,
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeRun)
    private readonly nodeRunRepo: Repository<WorkflowNodeRun>,
  ) {}

  // ── Workflow CRUD ────────────────────────────────────────────────────────────

  async listWorkflows(userId: string): Promise<Workflow[]> {
    return this.workflowRepo.find({
      where: { user: { id: userId } },
      order: { updatedAt: "DESC" },
    });
  }

  async getWorkflow(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.workflowRepo.findOne({
      where: { id, user: { id: userId } },
      relations: ["nodes", "edges", "edges.source", "edges.target"],
    });
    if (!workflow) throw new NotFoundException("Workflow not found");
    return workflow;
  }

  async createWorkflow(userId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowRepo.create({
      name: dto.name,
      mode: dto.mode,
      user: { id: userId },
    });
    return this.workflowRepo.save(workflow);
  }

  async updateWorkflow(id: string, userId: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.getWorkflow(id, userId);
    Object.assign(workflow, dto);
    return this.workflowRepo.save(workflow);
  }

  async deleteWorkflow(id: string, userId: string): Promise<void> {
    const workflow = await this.getWorkflow(id, userId);
    await this.workflowRepo.remove(workflow);
  }

  // ── Graph save (atomic replace of nodes + edges) ────────────────────────────

  async saveGraph(id: string, userId: string, dto: SaveWorkflowGraphDto): Promise<Workflow> {
    const workflow = await this.getWorkflow(id, userId);

    // Remove existing nodes + edges (cascades node runs only on existing runs)
    await this.edgeRepo.delete({ workflow: { id } });
    await this.nodeRepo.delete({ workflow: { id } });

    // Re-create nodes, keyed by a temporary client-side id for edge wiring
    const nodeMap = new Map<string, WorkflowNode>();
    for (const n of dto.nodes) {
      const hasConfig = n.config && Object.keys(n.config).length > 0;
      const node = this.nodeRepo.create({
        workflow: { id },
        label: n.label,
        type: n.type,
        subtype: n.subtype,
        positionX: n.positionX,
        positionY: n.positionY,
        config: n.config ?? {},
        setupStatus: hasConfig ? NodeSetupStatus.CONFIGURED : NodeSetupStatus.NEEDS_SETUP,
      });
      const saved = await this.nodeRepo.save(node);
      // Client sends its own temp id in n.id for edge references
      if (n.id) nodeMap.set(n.id, saved);
    }

    // Re-create edges using the resolved node ids
    for (const e of dto.edges) {
      const source = nodeMap.get(e.sourceNodeId);
      const target = nodeMap.get(e.targetNodeId);
      if (!source || !target) continue;
      const edge = this.edgeRepo.create({
        workflow: { id },
        source,
        target,
        label: e.label,
        condition: e.condition,
      });
      await this.edgeRepo.save(edge);
    }

    return this.getWorkflow(id, userId);
  }

  // ── Workflow activation ──────────────────────────────────────────────────────

  async setStatus(id: string, userId: string, status: WorkflowStatus): Promise<Workflow> {
    const workflow = await this.getWorkflow(id, userId);
    workflow.status = status;
    return this.workflowRepo.save(workflow);
  }

  // ── Run management ───────────────────────────────────────────────────────────

  async triggerRun(id: string, userId: string, dto: TriggerRunDto): Promise<WorkflowRun> {
    await this.getWorkflow(id, userId); // ownership check
    const run = this.runRepo.create({
      workflow: { id },
      user: { id: userId },
      status: RunStatus.PENDING,
      triggeredBy: dto.triggeredBy ?? RunTrigger.MANUAL,
      startedAt: new Date(),
    });
    return this.runRepo.save(run);
  }

  async listRuns(workflowId: string, userId: string): Promise<WorkflowRun[]> {
    await this.getWorkflow(workflowId, userId); // ownership check
    return this.runRepo.find({
      where: { workflow: { id: workflowId } },
      relations: ["nodeRuns", "nodeRuns.node"],
      order: { createdAt: "DESC" },
    });
  }

  async getRun(runId: string): Promise<WorkflowRun> {
    const run = await this.runRepo.findOne({
      where: { id: runId },
      relations: ["nodeRuns", "nodeRuns.node"],
    });
    if (!run) throw new NotFoundException("Run not found");
    return run;
  }
}
