import { Outlet, useLocation } from "react-router-dom";
import PageTitle from "@/components/PageTitle";
import StepperHeader from "@/components/StepperHeader";
import { resumeSteps } from "@/constants/steps";

export default function ResumeLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/resume-builder";
  const idx = Math.max(
    0,
    resumeSteps.findIndex((s) => s.path === pathname),
  ); // defaults to 0 if base route

  return (
    <div className="space-y-6">
      <PageTitle title="Resume Builder" subtitle="Create your ATS-friendly resume step by step" />
      {!isHome && <StepperHeader steps={[...resumeSteps]} current={idx === -1 ? 0 : idx} />}
      <Outlet /> {/* <- step screens render here */}
    </div>
  );
}
