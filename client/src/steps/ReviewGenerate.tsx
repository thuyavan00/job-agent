import { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, DownloadCloud } from "lucide-react";
import { useFormCtx } from "../context/FormContext";
import { Card, Button } from "../components/Card";
import { toUpsertPayload } from "../schema/profile";
import { resumeSteps } from "@/constants/steps";

export default function ReviewGenerate() {
  const { data } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = resumeSteps.findIndex((s) => s.path === pathname);
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState<{ pdfUrl?: string; docxUrl?: string } | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true);
    try {
      const headers = { "x-user-email": data.basics.email };

      await axios.post("/api/resume/profile", toUpsertPayload(data), { headers });

      const r = await axios.post(
        "/api/resume/render",
        { docType: "resume", templateId: "simple-ats" },
        { headers },
      );
      setResume(r.data);

      const c = await axios.post(
        "/api/resume/render",
        {
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
        },
        { headers },
      );
      setCover(c.data.pdfUrl ?? null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Review" subtitle="Confirm your details, then generate your files">
        <div className="space-y-4">
          <pre className="bg-[#0e141a] border border-bg-border rounded-lg p-4 overflow-auto max-h-[45vh] text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>

          <div className="flex justify-between">
            {idx > 0 && (
              <Button
                variant="outline"
                leftIcon={<ArrowLeft size={16} />}
                onClick={() => navigate(resumeSteps[idx - 1].path)}
              >
                Previous
              </Button>
            )}
            <Button
              rightIcon={<DownloadCloud size={16} />}
              onClick={handleGenerate}
              className="min-w-[180px]"
            >
              {busy ? "Generating..." : "Generate Files"}
            </Button>
          </div>

          {(resume?.pdfUrl || resume?.docxUrl || cover) && (
            <div className="pt-4 border-t border-bg-border">
              <div className="flex flex-wrap gap-4">
                {resume?.pdfUrl && (
                  <a className="underline" href={resume.pdfUrl} target="_blank" rel="noreferrer">
                    View Resume PDF
                  </a>
                )}
                {resume?.docxUrl && (
                  <a className="underline" href={resume.docxUrl} target="_blank" rel="noreferrer">
                    Download Resume DOCX
                  </a>
                )}
                {cover && (
                  <a className="underline" href={cover} target="_blank" rel="noreferrer">
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
