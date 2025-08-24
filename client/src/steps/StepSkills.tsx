// src/steps/StepSkills.tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, Button } from "../components/Card";
import { ChipsInput } from "../components/ChipsInput";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SkillsSchema } from "../schema/profile";
import { useFormCtx } from "../context/FormContext";
import { useNavigate, useLocation } from "react-router-dom";
import { resumeSteps } from "@/constants/steps";

const StepSchema = z.object({ skills: SkillsSchema });
type StepData = z.input<typeof StepSchema>;

export default function StepSkills() {
  const { data, update } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = resumeSteps.findIndex((s) => s.path === pathname);

  const { handleSubmit, setValue, watch } = useForm<StepData>({
    resolver: zodResolver(StepSchema),
    defaultValues: { skills: data.skills },
    mode: "onBlur",
  });

  const items = watch("skills.items");
  const setItems = (v: string[]) => setValue("skills.items", v, { shouldDirty: true });

  const onSubmit = (values: StepData) => {
    update({ skills: { items: values.skills.items ?? [] } });
    if (idx < resumeSteps.length - 1) {
      console.log("navigating to", resumeSteps[idx + 1].path);
      navigate(resumeSteps[idx + 1].path);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Skills & Technologies" subtitle="Add your technical and professional skills">
        <ChipsInput value={items ?? []} onChange={setItems} />
        <div className="mt-6 flex justify-between">
          {idx > 0 && (
            <Button
              variant="outline"
              leftIcon={<ArrowLeft size={16} />}
              onClick={() => navigate(resumeSteps[idx - 1].path)}
            >
              Previous
            </Button>
          )}

          <Button rightIcon={<ArrowRight size={16} />} onClick={handleSubmit(onSubmit)}>
            Review
          </Button>
        </div>
      </Card>
    </div>
  );
}
