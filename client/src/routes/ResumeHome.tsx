import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Trash2, FileDown, Eye, Plus } from "lucide-react";
import { Card, Button } from "@/components/Card";
import type { FilesResponse, ResumeFile } from "@/types/resume-files";

function Section({
  title,
  files,
  defaultName,
  onDelete,
}: {
  title: string;
  files: ResumeFile[];
  defaultName?: string;
  onDelete: (name: string) => void;
}) {
  return (
    <Card title={title} subtitle={files.length ? "Latest marked as default" : "No files yet"}>
      {files.length === 0 ? (
        <div className="text-text-2">Nothing here yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {files.map((f) => (
            <div key={f.fileName} className="flex items-center gap-3 py-3">
              <div className="flex-1">
                <div className="font-medium text-white flex items-center gap-2">
                  {f.fileName}
                  {f.fileName === defaultName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-2">
                  {(f.size / 1024).toFixed(1)} KB · {new Date(f.mtimeMs).toLocaleString()}
                </div>
              </div>

              <a
                className="px-3 py-2 rounded-lg border border-border text-sm text-text-2 hover:text-text hover:bg-card"
                href={`${f.url}?v=${f.mtimeMs}`}
                target="_blank"
                rel="noreferrer"
                title="View"
              >
                <span className="inline-flex items-center gap-2">
                  <Eye size={16} /> View
                </span>
              </a>

              <a
                className="px-3 py-2 rounded-lg border border-border text-sm text-text-2 hover:text-text hover:bg-card"
                href={`${f.url}?download=1`}
                download
                title="Download"
              >
                <span className="inline-flex items-center gap-2">
                  <FileDown size={16} /> Download
                </span>
              </a>

              <button
                className="px-3 py-2 rounded-lg border border-border text-sm text-text-2 hover:text-text hover:bg-card"
                onClick={() => onDelete(f.fileName)}
                title="Delete"
              >
                <span className="inline-flex items-center gap-2 text-red-400">
                  <Trash2 size={16} /> Delete
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ResumeHome() {
  const navigate = useNavigate();
  const [email] = useState<string>(
    () => localStorage.getItem("userEmail") || "kannanthuyavan@gmail.com",
  );
  const [files, setFiles] = useState<FilesResponse>({ resumes: [], coverLetters: [] });
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await axios.get<FilesResponse>("/api/resume/files", {
        headers: { "x-user-email": email },
      });
      // defensive: ensure arrays
      setFiles({ resumes: data?.resumes ?? [], coverLetters: data?.coverLetters ?? [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const defaultResume = useMemo(() => files.resumes[0]?.fileName, [files.resumes]);
  const defaultCover = useMemo(() => files.coverLetters[0]?.fileName, [files.coverLetters]);

  async function handleDelete(fileName: string) {
    if (!confirm(`Delete ${fileName}?`)) return;
    const prev = files;
    // optimistic update: remove from either group
    setFiles({
      resumes: prev.resumes.filter((f) => f.fileName !== fileName),
      coverLetters: prev.coverLetters.filter((f) => f.fileName !== fileName),
    });
    try {
      await axios.delete(`/api/resume/files/${encodeURIComponent(fileName)}`, {
        headers: { "x-user-email": email },
      });
    } catch (e) {
      alert("Delete failed, reloading.");
      await load();
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <Card title="Your Files">
          <div className="text-text-2">Loading…</div>
        </Card>
      ) : (
        <>
          <Section
            title="Resumes"
            files={files.resumes}
            defaultName={defaultResume}
            onDelete={handleDelete}
          />
          <Section
            title="Cover Letters"
            files={files.coverLetters}
            defaultName={defaultCover}
            onDelete={handleDelete}
          />
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={() => navigate("/resume-builder/build")} leftIcon={<Plus size={16} />}>
          Create New Resume
        </Button>
      </div>
    </div>
  );
}
