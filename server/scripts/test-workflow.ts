/**
 * Workflow Pipeline Verification Script
 * ══════════════════════════════════════
 * Proves the backend can route data through:
 *   NEW_JOB_POSTED  →  JOB_FILTER  →  SUBMIT_APPLICATION
 *
 * Does NOT require a running database or Redis — all external
 * dependencies (JobsService, DB repos) are replaced with mocks.
 *
 * Run:
 *   npx ts-node -r tsconfig-paths/register \
 *               --project tsconfig.scripts.json \
 *               scripts/test-workflow.ts
 */

import "reflect-metadata";

// ── Handler imports ────────────────────────────────────────────────────────────
import { TriggerJobMatchHandler } from "../src/workflow/orchestrator/handlers/trigger-job-match.handler";
import { JobFilterHandler } from "../src/workflow/orchestrator/handlers/job-filter.handler";
import { BrowserApplyHandler } from "../src/workflow/orchestrator/handlers/browser-apply.handler";
import { BaseNodeHandler, NodeExecutionContext } from "../src/workflow/orchestrator/interfaces/node-handler.interface";
import { NodeSubtype } from "../src/workflow/entities/workflow-node.entity";
import type { JobDto } from "../src/jobs/jobs.dto";
import type { WorkflowJobPayload } from "../src/workflow/orchestrator/workflow-queue.types";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

/** Four jobs covering all filter outcomes */
const MOCK_JOBS: (JobDto & { salary?: string })[] = [
  {
    id: "job-1",
    title: "Senior Software Engineer",
    company: "Stripe",
    location: "Remote",
    type: "full_time",
    descriptionShort: "Build payments infrastructure with distributed systems.",
    url: "https://stripe.com/jobs/1",
    postedAt: "2026-02-20",
    source: "Remotive",
    tags: ["typescript", "go", "payments"],
    salary: "160000",
  },
  {
    id: "job-2",
    title: "Backend Engineer",
    company: "Notion",
    location: "Remote",
    type: "full_time",
    descriptionShort: "Work on Notion's real-time collaboration engine.",
    url: "https://notion.com/jobs/2",
    postedAt: "2026-02-20",
    source: "Greenhouse",
    tags: ["typescript", "node"],
    salary: "140000",
  },
  {
    id: "job-3",
    title: "Software Engineer",
    company: "Airbnb",
    location: "San Francisco, CA",  // ← FAILS: not Remote
    type: "full_time",
    descriptionShort: "Scale Airbnb's host platform.",
    url: "https://airbnb.com/jobs/3",
    postedAt: "2026-02-19",
    source: "Greenhouse",
    tags: ["python", "react"],
    salary: "155000",
  },
  {
    id: "job-4",
    title: "Marketing Manager",                 // ← FAILS: keyword "engineer" not in title
    company: "Linear",
    location: "Remote",
    type: "full_time",
    descriptionShort: "Lead Linear's growth marketing campaigns.",
    url: "https://linear.app/jobs/4",
    postedAt: "2026-02-18",
    source: "Lever",
    tags: ["marketing"],
    salary: "120000",
  },
];

/**
 * Mock workflow:
 *   node-1 (trigger)   NEW_JOB_POSTED       → fetch + keyword-filter
 *   node-2 (condition) JOB_FILTER           → remoteOnly=true, requiredKeywords=["engineer"]
 *   node-3 (action)    SUBMIT_APPLICATION   → create job application
 *
 * NOTE: Salary threshold (>$100k) is enforced by the separate SALARY_CHECK node,
 * not JOB_FILTER. The JOB_FILTER handles: remoteOnly, requiredKeywords, excludeCompanies.
 * All four mock jobs exceed $100k so a SALARY_CHECK node would pass them all.
 */
const MOCK_WORKFLOW = {
  nodes: [
    {
      id: "node-1",
      label: "New Job Posted",
      type: "trigger",
      subtype: NodeSubtype.NEW_JOB_POSTED,
      config: { keywords: "engineer", remoteOnly: false }, // broad fetch; filter narrows below
      positionX: 0,
      positionY: 0,
    },
    {
      id: "node-2",
      label: "Job Filter",
      type: "condition",
      subtype: NodeSubtype.JOB_FILTER,
      config: {
        remoteOnly: true,            // require Remote location
        requiredKeywords: ["engineer"], // title must contain "engineer"
        excludeCompanies: [],
      },
      positionX: 300,
      positionY: 0,
    },
    {
      id: "node-3",
      label: "Submit Application",
      type: "action",
      subtype: NodeSubtype.SUBMIT_APPLICATION,
      config: {},
      positionX: 600,
      positionY: 0,
    },
  ],
  edges: [
    { id: "edge-1", sourceId: "node-1", targetId: "node-2" },
    { id: "edge-2", sourceId: "node-2", targetId: "node-3" },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal mock of JobsService — returns the static list above */
const mockJobsService = {
  fetchJobs: async (): Promise<JobDto[]> => MOCK_JOBS,
};

/** Captures every application that would be saved to the DB */
const capturedApplications: any[] = [];
const mockApplicationRepo = {
  create: (data: any) => ({ ...data, id: `mock-app-${capturedApplications.length + 1}` }),
  save: async (app: any) => {
    capturedApplications.push(app);
    return app;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER REGISTRY  (subtype → handler instance)
// ═══════════════════════════════════════════════════════════════════════════════

const triggerHandler = new TriggerJobMatchHandler(mockJobsService as any);
const filterHandler  = new JobFilterHandler();
const applyHandler   = new BrowserApplyHandler(mockApplicationRepo as any);

const handlerMap = new Map<NodeSubtype, BaseNodeHandler>([
  [NodeSubtype.NEW_JOB_POSTED,    triggerHandler],
  [NodeSubtype.REMOTIVE_JOBS,     triggerHandler],
  [NodeSubtype.ARBEITNOW_JOBS,    triggerHandler],
  [NodeSubtype.GREENHOUSE_JOBS,   triggerHandler],
  [NodeSubtype.LEVER_JOBS,        triggerHandler],
  [NodeSubtype.DAILY_TRIGGER,     triggerHandler],
  [NodeSubtype.WEEKLY_TRIGGER,    triggerHandler],
  [NodeSubtype.JOB_FILTER,        filterHandler],
  [NodeSubtype.SUBMIT_APPLICATION, applyHandler],
]);

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION ENGINE  (mimics WorkflowExecutionProcessor.advanceGraph without BullMQ)
// ═══════════════════════════════════════════════════════════════════════════════

interface NodeDef {
  id: string;
  label: string;
  type: string;
  subtype: NodeSubtype;
  config: Record<string, unknown>;
}

interface EdgeDef {
  id: string;
  sourceId: string;
  targetId: string;
}

interface TraceEntry {
  nodeId: string;
  label: string;
  subtype: NodeSubtype;
  isInline: boolean;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
}

async function runPipeline(
  nodes: NodeDef[],
  edges: EdgeDef[],
  userId = "mock-user-id",
  userEmail = "test@example.com",
  workflowRunId = "mock-run-id",
): Promise<TraceEntry[]> {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const edge of edges) {
    adjacency.get(edge.sourceId)!.push(edge.targetId);
  }

  // Find trigger nodes (no incoming edges)
  const nodesWithIncoming = new Set(edges.map((e) => e.targetId));
  const triggerNodes = nodes.filter((n) => !nodesWithIncoming.has(n.id));

  const trace: TraceEntry[] = [];

  // Recursive executor — mirrors processor's advanceGraph()
  async function executeNode(
    nodeId: string,
    input: Record<string, unknown>,
  ): Promise<void> {
    const node = nodeMap.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const handler = handlerMap.get(node.subtype);
    if (!handler) {
      print(`  ⚠  No handler for ${node.subtype} — skipping`);
      return;
    }

    const payload: WorkflowJobPayload = {
      workflowRunId,
      nodeRunId: `noderun-${nodeId}`,
      nodeId,
      subtype: node.subtype,
      config: node.config,
      input,
      userId,
      userEmail,
    };

    const ctx: NodeExecutionContext = { payload };

    const t0 = Date.now();
    const result = await handler.execute(ctx);
    const durationMs = Date.now() - t0;

    trace.push({
      nodeId,
      label: node.label,
      subtype: node.subtype,
      isInline: handler.isInline,
      inputSummary: summarise(input),
      outputSummary: summarise(result.output),
      durationMs,
    });

    // If this node filtered out all candidates, there is nothing left to process
    if (
      Array.isArray((result.output as any).jobs) &&
      (result.output as any).jobs.length === 0
    ) {
      trace.push({
        nodeId: `${nodeId}-stop`,
        label: "── pipeline stopped ──",
        subtype: node.subtype,
        isInline: false,
        inputSummary: "",
        outputSummary: "Empty jobs array — no candidates remain; downstream nodes skipped.",
        durationMs: 0,
      });
      return;
    }

    // Advance to next nodes
    const nextIds = adjacency.get(nodeId) ?? [];
    for (const nextId of nextIds) {
      await executeNode(nextId, result.output);
    }
  }

  for (const triggerNode of triggerNodes) {
    await executeNode(triggerNode.id, {});
  }

  return trace;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function summarise(obj: Record<string, unknown>): string {
  if (obj.jobs && Array.isArray(obj.jobs)) {
    const jobs = obj.jobs as any[];
    if (jobs.length === 0) return "jobs: [] (empty — pipeline stops here)";
    const titles = jobs.map((j) => `"${j.title}" @ ${j.company} [${j.location}]`);
    return `jobs (${jobs.length}):\n${ titles.map((t) => `       • ${t}`).join("\n")}`;
  }
  if (obj.applicationId) {
    return `applicationId: ${obj.applicationId}, success: ${obj.success}`;
  }
  return JSON.stringify(obj);
}

function print(msg: string): void { process.stdout.write(msg + "\n"); }

function printDivider(char = "─", width = 64): void {
  print(char.repeat(width));
}

function printTrace(label: string, trace: TraceEntry[]): void {
  print(`\n${"═".repeat(64)}`);
  print(`  ${label}`);
  print(`${"═".repeat(64)}`);

  const realNodes = trace.filter((e) => !e.nodeId.endsWith("-stop"));
  for (let i = 0; i < trace.length; i++) {
    const e = trace[i];
    if (e.nodeId.endsWith("-stop")) {
      print(`\n  ⛔  ${e.outputSummary}`);
      continue;
    }
    const idx = realNodes.indexOf(e);
    const badge = e.isInline ? "⚡ inline" : "⏳ async";
    print(`\n[${idx + 1}/${realNodes.length}] ${e.label.toUpperCase()}  (${e.subtype})  ${badge}  [${e.durationMs}ms]`);
    printDivider("·");
    print(`  Input  → ${e.inputSummary}`);
    print(`  Output → ${e.outputSummary}`);
  }

  print("");
}

function printAssertions(
  scenarioLabel: string,
  trace: TraceEntry[],
  capturedApps: any[],
  expectApplications: boolean,
): void {
  const submitNode = trace.find((e) => e.subtype === NodeSubtype.SUBMIT_APPLICATION);
  const applyReached = !!submitNode;

  print(`${"─".repeat(64)}`);
  print(`  Assertions: ${scenarioLabel}`);
  print(`${"─".repeat(64)}`);

  if (expectApplications) {
    check("SUBMIT_APPLICATION node was reached",        applyReached);
    check("applicationRepo.save() was called",          capturedApps.length > 0);
    check("Application has correct userEmail",
      capturedApps.every((a) => a.userEmail === "test@example.com"));
    check("Application status is APPLIED",
      capturedApps.every((a) => a.status === "applied"));
  } else {
    check("SUBMIT_APPLICATION node was NOT reached",    !applyReached);
    check("applicationRepo.save() was NOT called",      capturedApps.length === 0);
  }

  print("");
}

function check(label: string, passed: boolean): void {
  const icon = passed ? "✅" : "❌";
  print(`  ${icon}  ${passed ? "PASS" : "FAIL"}  ${label}`);
  if (!passed) process.exitCode = 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  print("");
  print("╔══════════════════════════════════════════════════════════════╗");
  print("║       Workflow Pipeline Verification                         ║");
  print("║  NEW_JOB_POSTED → JOB_FILTER → SUBMIT_APPLICATION           ║");
  print("╚══════════════════════════════════════════════════════════════╝");

  print("\nWorkflow nodes:");
  for (const n of MOCK_WORKFLOW.nodes) {
    const arrow = MOCK_WORKFLOW.edges.find((e) => e.sourceId === n.id) ? " →" : "";
    print(`  [${n.type.padEnd(9)}] ${n.label.padEnd(22)} (${n.subtype})${arrow}`);
  }

  print("\nFilter config: remoteOnly=true, requiredKeywords=[\"engineer\"]");
  print("NOTE: salary threshold is handled by the SALARY_CHECK node,");
  print("      not JOB_FILTER. All mock jobs exceed $100k for reference.\n");

  print("Mock job pool:");
  for (const j of MOCK_JOBS) {
    const remoteOk    = j.location.toLowerCase().includes("remote");
    const keywordOk   = j.title.toLowerCase().includes("engineer");
    const passes      = remoteOk && keywordOk;
    const verdict     = passes ? "✅ PASS" : "❌ FAIL";
    const reasons: string[] = [];
    if (!remoteOk)  reasons.push("not Remote");
    if (!keywordOk) reasons.push(`title missing "engineer"`);
    const why = reasons.length ? `  ← ${reasons.join(", ")}` : "";
    print(`  ${verdict}  "${j.title}" @ ${j.company} [${j.location}]${why}`);
  }

  // ── Scenario A: standard run ─────────────────────────────────────────────
  capturedApplications.length = 0;

  const traceA = await runPipeline(
    MOCK_WORKFLOW.nodes as NodeDef[],
    MOCK_WORKFLOW.edges,
  );

  printTrace("SCENARIO A — Normal run (2 jobs pass filter)", traceA);
  printAssertions("Scenario A", traceA, [...capturedApplications], true);

  // ── Scenario B: no jobs match the filter ────────────────────────────────
  // Override JobsService to return only jobs that will be filtered OUT
  const noMatchJobs: JobDto[] = [
    { ...MOCK_JOBS[2] }, // San Francisco — fails remoteOnly
    { ...MOCK_JOBS[3] }, // Marketing Manager — fails keyword
  ];
  (mockJobsService as any).fetchJobs = async () => noMatchJobs;
  capturedApplications.length = 0;

  const traceB = await runPipeline(
    MOCK_WORKFLOW.nodes as NodeDef[],
    MOCK_WORKFLOW.edges,
  );

  printTrace("SCENARIO B — All jobs filtered out (empty pipeline)", traceB);
  printAssertions("Scenario B", traceB, [...capturedApplications], false);

  // ── Summary ──────────────────────────────────────────────────────────────
  print("═".repeat(64));
  if (process.exitCode) {
    print("  RESULT: ❌  One or more assertions failed.");
  } else {
    print("  RESULT: ✅  All assertions passed.");
  }
  print("═".repeat(64));
  print("");
}

main().catch((err) => {
  console.error("\n[FATAL]", err);
  process.exit(1);
});
