import { z } from "zod";

/** Step 1 — Basics (unchanged) */
export const BasicsSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.email("Invalid email"),
  phone: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  linkedIn: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  summary: z.string().optional().or(z.literal("")),
});

/** Step 2 — Education (gpa fix here) */
export const EducationSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  location: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  gpa: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) ? n : undefined;
    })
    .refine((n) => n === undefined || (n >= 0 && n <= 10), {
      message: "GPA must be between 0 and 10",
    }),
});

/** Step 3 — Experience (unchanged) */
export const ExperienceSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional().or(z.literal("")),
  startDate: z.string().min(1),
  endDate: z.string().optional().or(z.literal("")),
  bulletsText: z.string().optional().default(""),
});

/** Step 4 — Projects (unchanged) */
export const ProjectSchema = z.object({
  title: z.string().min(1),
  liveDemoUrl: z.string().url().optional().or(z.literal("")),
  repoUrl: z.string().url().optional().or(z.literal("")),
  description: z.string().min(1),
  technologies: z.array(z.string()).default([]),
});

/** Step 5 — Skills (unchanged) */
export const SkillsSchema = z.object({
  items: z.array(z.string()).default([]),
});

/** Full form (arrays REQUIRED but have defaults) */
export const ProfileFormSchema = z.object({
  basics: BasicsSchema,
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: SkillsSchema,
});

export type ProfileForm = z.infer<typeof ProfileFormSchema>;

export function toUpsertPayload(form: ProfileForm) {
  return {
    basics: {
      ...form.basics,
      phone: form.basics.phone || undefined,
      location: form.basics.location || undefined,
      linkedIn: form.basics.linkedIn || undefined,
      github: form.basics.github || undefined,
      website: form.basics.website || undefined,
      summary: form.basics.summary || undefined,
    },
    education: form.education,
    experience: form.experience.map((e) => ({
      jobTitle: e.jobTitle,
      company: e.company,
      location: e.location || undefined,
      startDate: e.startDate,
      endDate: e.endDate || undefined,
      bullets: (e.bulletsText || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    })),
    projects: form.projects,
    skills: { items: form.skills.items.filter(Boolean) },
  };
}
