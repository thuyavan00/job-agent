import { useEffect, useState } from "react";
import axios from "axios";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Wrench,
  Clock,
  Edit3,
  Check,
  X,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Basics {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  website?: string;
  summary?: string;
}

interface ProfileData {
  basics: Basics;
  education: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate: string;
    endDate: string;
    gpa?: number;
  }>;
  experience: Array<{
    jobTitle: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    bullets: string[];
  }>;
  projects: Array<{
    title: string;
    description: string;
    technologies: string[];
    liveDemoUrl?: string;
    repoUrl?: string;
  }>;
  skills: { items: string[] };
  detectedRole: string | null;
  yearsOfExperience: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  count,
  children,
  wizardPath,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  wizardPath?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-accent">{icon}</span>
          <span className="font-semibold text-text text-sm">{title}</span>
          {count !== undefined && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-border/50 text-text-2">{count}</span>
          )}
        </div>
        {wizardPath && (
          <button
            onClick={() => navigate(wizardPath)}
            className="flex items-center gap-1 text-xs text-text-2 hover:text-accent transition-colors"
          >
            Edit in wizard <ChevronRight size={12} />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InlineField({
  label,
  value,
  editing,
  onChange,
  multiline = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-2">{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="bg-input-bg border border-input-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent resize-none"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-input-bg border border-input-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        )
      ) : (
        <div className="text-sm text-text min-h-[34px] flex items-center">
          {value || <span className="text-text-2 italic">—</span>}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Basics edit state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Basics>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<ProfileData>("/api/resume/profile");
        setProfile(data);
        setDraft(data.basics ?? {});
      } catch {
        setError("Could not load profile. Generate a resume first.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function startEdit() {
    setDraft({ ...(profile?.basics ?? {}) });
    setSaveError(null);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(profile?.basics ?? {});
    setEditing(false);
    setSaveError(null);
  }

  async function saveBasics() {
    setSaving(true);
    setSaveError(null);
    try {
      const { data } = await axios.patch<ProfileData>("/api/resume/profile/basics", draft);
      setProfile(data);
      setDraft(data.basics ?? {});
      setEditing(false);
    } catch {
      setSaveError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function setDraftField(key: keyof Basics, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-36 rounded-xl bg-card border border-border" />
        <div className="h-64 rounded-xl bg-card border border-border" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 rounded-xl bg-card border border-border" />
          <div className="h-48 rounded-xl bg-card border border-border" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <User size={32} className="mx-auto mb-3 opacity-30 text-text-2" />
        <div className="text-text font-medium">No profile yet</div>
        <div className="text-sm text-text-2 mt-1">{error ?? "Complete the Resume Builder to create your profile."}</div>
        <button
          onClick={() => window.location.assign("/resume-builder")}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text hover:bg-card transition-colors"
        >
          Go to Resume Builder <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  const { basics, experience, education, projects, skills, detectedRole, yearsOfExperience } = profile;
  const initials = getInitials(basics.fullName);

  return (
    <div className="space-y-5">
      {/* ── Hero card ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-accent">{initials}</span>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-text leading-tight">
              {basics.fullName || "—"}
            </h2>

            {/* Role + experience chips */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {detectedRole && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-accent/15 text-accent border border-accent/30">
                  <Briefcase size={11} />
                  {detectedRole}
                </span>
              )}
              {yearsOfExperience != null && yearsOfExperience > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-border/50 text-text-2 border border-border">
                  <Clock size={11} />
                  {yearsOfExperience} yr{yearsOfExperience !== 1 ? "s" : ""} exp
                </span>
              )}
              {!detectedRole && !yearsOfExperience && (
                <span className="text-xs text-text-2 italic">
                  Generate a resume to detect role & experience
                </span>
              )}
            </div>

            {/* Contact line */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
              {basics.location && (
                <span className="flex items-center gap-1 text-xs text-text-2">
                  <MapPin size={11} /> {basics.location}
                </span>
              )}
              {basics.email && (
                <span className="flex items-center gap-1 text-xs text-text-2">
                  <Mail size={11} /> {basics.email}
                </span>
              )}
              {basics.phone && (
                <span className="flex items-center gap-1 text-xs text-text-2">
                  <Phone size={11} /> {basics.phone}
                </span>
              )}
              {basics.linkedIn && (
                <a
                  href={basics.linkedIn.startsWith("http") ? basics.linkedIn : `https://${basics.linkedIn}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-text-2 hover:text-accent transition-colors"
                >
                  <Linkedin size={11} /> {basics.linkedIn}
                </a>
              )}
              {basics.github && (
                <a
                  href={basics.github.startsWith("http") ? basics.github : `https://${basics.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-text-2 hover:text-accent transition-colors"
                >
                  <Github size={11} /> {basics.github}
                </a>
              )}
              {basics.website && (
                <a
                  href={basics.website.startsWith("http") ? basics.website : `https://${basics.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-text-2 hover:text-accent transition-colors"
                >
                  <Globe size={11} /> {basics.website}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Basics edit card ───────────────────────────────────── */}
      <SectionCard title="Basic Information" icon={<User size={15} />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InlineField label="Full Name" value={draft.fullName ?? ""} editing={editing} onChange={(v) => setDraftField("fullName", v)} placeholder="Jane Doe" />
            <InlineField label="Email" value={draft.email ?? ""} editing={editing} onChange={(v) => setDraftField("email", v)} placeholder="jane@example.com" />
            <InlineField label="Phone" value={draft.phone ?? ""} editing={editing} onChange={(v) => setDraftField("phone", v)} placeholder="+1 555 000 0000" />
            <InlineField label="Location" value={draft.location ?? ""} editing={editing} onChange={(v) => setDraftField("location", v)} placeholder="City, Country" />
            <InlineField label="LinkedIn URL" value={draft.linkedIn ?? ""} editing={editing} onChange={(v) => setDraftField("linkedIn", v)} placeholder="linkedin.com/in/username" />
            <InlineField label="GitHub URL" value={draft.github ?? ""} editing={editing} onChange={(v) => setDraftField("github", v)} placeholder="github.com/username" />
            <InlineField label="Website" value={draft.website ?? ""} editing={editing} onChange={(v) => setDraftField("website", v)} placeholder="https://yoursite.com" />
          </div>
          <InlineField label="Professional Summary" value={draft.summary ?? ""} editing={editing} onChange={(v) => setDraftField("summary", v)} multiline placeholder="2–3 sentences summarising your expertise…" />

          {saveError && (
            <div className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-2">
              {saveError}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {editing ? (
              <>
                <button
                  onClick={saveBasics}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-border text-text-2 hover:text-text hover:bg-card transition-colors disabled:opacity-50"
                >
                  <X size={14} />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-border text-text-2 hover:text-text hover:bg-card transition-colors"
              >
                <Edit3 size={14} />
                Edit
              </button>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ── Experience + Education row ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Experience */}
        <SectionCard
          title="Work Experience"
          icon={<Briefcase size={15} />}
          count={experience.length}
          wizardPath="/resume-builder/experience"
        >
          {experience.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-4">No experience added yet.</p>
          ) : (
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="border-l-2 border-accent/30 pl-3">
                  <div className="font-medium text-text text-sm">{exp.jobTitle}</div>
                  <div className="text-xs text-text-2">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</div>
                  <div className="text-xs text-text-2 mt-0.5">
                    {exp.startDate} – {exp.endDate || "Present"}
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {exp.bullets.slice(0, 3).map((b, j) => (
                        <li key={j} className="text-xs text-text-2 flex gap-1.5">
                          <span className="text-accent mt-0.5 flex-shrink-0">•</span>
                          <span className="line-clamp-1">{b}</span>
                        </li>
                      ))}
                      {exp.bullets.length > 3 && (
                        <li className="text-xs text-text-2 opacity-60">+{exp.bullets.length - 3} more…</li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Education */}
        <SectionCard
          title="Education"
          icon={<GraduationCap size={15} />}
          count={education.length}
          wizardPath="/resume-builder/education"
        >
          {education.length === 0 ? (
            <p className="text-sm text-text-2 text-center py-4">No education added yet.</p>
          ) : (
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i} className="border-l-2 border-accent/30 pl-3">
                  <div className="font-medium text-text text-sm">{edu.institution}</div>
                  <div className="text-xs text-text-2">{edu.degree}</div>
                  <div className="text-xs text-text-2 mt-0.5">
                    {edu.startDate} – {edu.endDate}
                    {edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                    {edu.location ? ` · ${edu.location}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Projects ───────────────────────────────────────────── */}
      <SectionCard
        title="Projects"
        icon={<FolderGit2 size={15} />}
        count={projects.length}
        wizardPath="/resume-builder/projects"
      >
        {projects.length === 0 ? (
          <p className="text-sm text-text-2 text-center py-4">No projects added yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((proj, i) => (
              <div key={i} className="rounded-lg border border-border p-3 flex flex-col gap-2">
                <div className="font-medium text-text text-sm">{proj.title}</div>
                {proj.description && (
                  <p className="text-xs text-text-2 line-clamp-2 leading-relaxed">{proj.description}</p>
                )}
                {proj.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {proj.technologies.slice(0, 4).map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-border/40 text-text-2">{t}</span>
                    ))}
                    {proj.technologies.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-border/40 text-text-2">+{proj.technologies.length - 4}</span>
                    )}
                  </div>
                )}
                {(proj.liveDemoUrl || proj.repoUrl) && (
                  <div className="flex gap-2 pt-1">
                    {proj.liveDemoUrl && (
                      <a href={proj.liveDemoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-accent hover:underline">
                        <ExternalLink size={10} /> Demo
                      </a>
                    )}
                    {proj.repoUrl && (
                      <a href={proj.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-accent hover:underline">
                        <Github size={10} /> Repo
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Skills ─────────────────────────────────────────────── */}
      <SectionCard
        title="Skills & Technologies"
        icon={<Wrench size={15} />}
        count={skills.items.length}
        wizardPath="/resume-builder/skills"
      >
        {skills.items.length === 0 ? (
          <p className="text-sm text-text-2 text-center py-4">No skills added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.items.map((skill) => (
              <span
                key={skill}
                className="text-xs px-3 py-1 rounded-full border border-border bg-border/20 text-text"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
