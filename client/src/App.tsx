import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import StepBasics from "./steps/StepBasics";
import StepEducation from "./steps/StepEducation";
import StepExperience from "./steps/StepExperience";
import StepProjects from "./steps/StepProjects";
import StepSkills from "./steps/StepSkills";
import ReviewGenerate from "./steps/ReviewGenerate";
import { FormProvider } from "./context/FormContext";
import { AuthProvider } from "./context/AuthContext";
import ResumeLayout from "@/routes/ResumeLayout";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";

import ResumeHome from "./routes/ResumeHome";
import JobMatch from "./routes/JobMatch";
import Dashboard from "./routes/Dashboard";
import Login from "./routes/Login";
import Register from "./routes/Register";

function AppShell() {
  return (
    <FormProvider>
      <Layout sidebar={<Sidebar />}>
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
          <Route path="/ai-job-match" element={<JobMatch />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </FormProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
