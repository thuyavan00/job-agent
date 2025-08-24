import { User, GraduationCap, BriefcaseBusiness, Boxes, ListChecks } from "lucide-react";

export const resumeSteps = [
  { label: "Personal Information", icon: <User size={16} />, path: "/resume-builder/build" },
  { label: "Education", icon: <GraduationCap size={16} />, path: "/resume-builder/education" },
  {
    label: "Work Experience",
    icon: <BriefcaseBusiness size={16} />,
    path: "/resume-builder/experience",
  },
  { label: "Projects", icon: <Boxes size={16} />, path: "/resume-builder/projects" },
  { label: "Skills", icon: <ListChecks size={16} />, path: "/resume-builder/skills" },
  { label: "Review", icon: <ListChecks size={16} />, path: "/resume-builder/review" },
] as const;
