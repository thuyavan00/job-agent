import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import StepBasics from "./steps/StepBasics";
import StepEducation from "./steps/StepEducation";
import StepExperience from "./steps/StepExperience";
import StepProjects from "./steps/StepProjects";
import StepSkills from "./steps/StepSkills";
import ReviewGenerate from "./steps/ReviewGenerate";
import { FormProvider } from "./context/FormContext";
import ResumeLayout from "@/routes/ResumeLayout";
import Sidebar from "./components/Sidebar";

import ResumeHome from "./routes/ResumeHome";

export default function App() {
  return (
    <BrowserRouter>
      <FormProvider>
        <Layout sidebar={<Sidebar userEmail="kannanthuyavan@gmail.com" />}>
          <Routes>
            <Route path="/resume-builder" element={<ResumeLayout />}>
              <Route index element={<ResumeHome />} />
              <Route path="build" element={<StepBasics />} />
              <Route path="education" element={<StepEducation />} />
              <Route path="experience" element={<StepExperience />} />
              <Route path="projects" element={<StepProjects />} />
              <Route path="skills" element={<StepSkills />} />
              <Route path="review" element={<ReviewGenerate />} />
            </Route>
            <Route path="/" element={<Navigate to="/resume-builder" replace />} />
          </Routes>
        </Layout>
      </FormProvider>
    </BrowserRouter>
  );
}
