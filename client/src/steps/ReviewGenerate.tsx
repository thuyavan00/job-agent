import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, DownloadCloud, Sparkles, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useFormCtx } from "../context/FormContext";
import { Card, Button } from "../components/Card";
import { toUpsertPayload } from "../schema/profile";
import { resumeSteps } from "@/constants/steps";

type Step = "idle" | "saving" | "enhancing" | "rendering" | "done";

const STEP_LABELS: Record<Step, string> = {
  idle: "Generate Files",
  saving: "Saving profile…",
  enhancing: "AI enhancing for ATS…",
  rendering: "Generating PDF & DOCX…",
  done: "Done — regenerate",
};

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state: "pending" | "active" | "done";
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${state === "done" ? "text-accent" : state === "active" ? "text-text" : "text-text-2"}`}>
      {state === "done" ? (
        <CheckCircle2 size={15} className="text-accent flex-shrink-0" />
      ) : state === "active" ? (
        <Loader2 size={15} className="animate-spin flex-shrink-0" />
      ) : (
        <div className="w-[15px] h-[15px] rounded-full border border-border flex-shrink-0" />
      )}
      {label}
    </div>
  );
}

export default function ReviewGenerate() {
  const { data } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = resumeSteps.findIndex((s) => s.path === pathname);
  const [step, setStep] = useState<Step>("idle");
  const [resume, setResume] = useState<{ pdfUrl?: string; docxUrl?: string } | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = step !== "idle" && step !== "done";

  async function handleGenerate() {
    setError(null);
    setResume(null);
    setCover(null);

    try {
      setStep("saving");
      await axios.post("/api/resume/profile", toUpsertPayload(data));

      // The render call internally runs the AI enhancement agent then generates files.
      // We show "enhancing" first to set correct expectations.
      setStep("enhancing");
      const r = await axios.post("/api/resume/render", {
        docType: "resume",
        templateId: "simple-ats",
      });
      setResume(r.data);

      setStep("rendering");
      const c = await axios.post("/api/resume/render", {
        docType: "cover_letter",
        templateId: "simple-ats",
        variables: {
          date: new Date().toDateString(),
          company_name: "Acme Corp",
          company_address: "",
          hiring_manager_name: "Hiring Manager",
          job_title: "Software Engineer",
          top_skills: (data.skills.items || []).slice(0, 6).join(", "),
          impact_sentence: "improved X by Y% and reduced Z cost",
          prior_company: data.experience[0]?.company ?? "Previous Company",
          prior_achievement: "built a scalable service",
          team_name: "Platform",
        },
      });
      setCover(c.data.pdfUrl ?? null);

      setStep("done");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("idle");
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Review" subtitle="Confirm your details, then generate your files">
        <div className="space-y-4">
          <pre className="bg-card border border-border rounded-lg p-4 overflow-auto max-h-[45vh] text-xs text-text">
            {JSON.stringify(data, null, 2)}
          </pre>

          <div className="flex justify-between items-center">
            {idx > 0 && (
              <Button
                variant="outline"
                leftIcon={<ArrowLeft size={16} />}
                onClick={() => navigate(resumeSteps[idx - 1].path)}
                disabled={busy}
              >
                Previous
              </Button>
            )}
            <Button
              rightIcon={busy ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
              onClick={handleGenerate}
              disabled={busy}
              className="min-w-[220px]"
            >
              {STEP_LABELS[step]}
            </Button>
          </div>

          {/* Progress tracker shown while generating */}
          {(busy || step === "done") && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <ProgressStep
                label="Save profile to database"
                state={step === "saving" ? "active" : "done"}
              />
              <ProgressStep
                label="AI agent enhancing for ATS compliance & one-page fit"
                state={
                  step === "saving"
                    ? "pending"
                    : step === "enhancing"
                    ? "active"
                    : "done"
                }
              />
              <ProgressStep
                label="Generate PDF & DOCX files"
                state={
                  step === "saving" || step === "enhancing"
                    ? "pending"
                    : step === "rendering"
                    ? "active"
                    : "done"
                }
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Download links */}
          {(resume?.pdfUrl || resume?.docxUrl || cover) && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-text-2 mb-3 flex items-center gap-1.5">
                <Sparkles size={13} className="text-accent" />
                Resume enhanced by AI for ATS compliance
              </p>
              <div className="flex flex-wrap gap-3">
                {resume?.pdfUrl && (
                  <a
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-card transition-colors"
                    href={resume.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={14} />
                    View Resume PDF
                  </a>
                )}
                {resume?.docxUrl && (
                  <a
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-card transition-colors"
                    href={resume.docxUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    <DownloadCloud size={14} />
                    Download Resume DOCX
                  </a>
                )}
                {cover && (
                  <a
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-card transition-colors"
                    href={cover}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={14} />
                    View Cover Letter PDF
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
