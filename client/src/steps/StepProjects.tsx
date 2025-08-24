// src/steps/StepProjects.tsx
"use client";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectSchema } from "../schema/profile";
import { z } from "zod";
import { useFormCtx } from "../context/FormContext";
import { useNavigate, useLocation } from "react-router-dom";
import ArrayFieldRow from "../components/ArrayFieldRow";
import { Card, Button } from "../components/Card";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { ChipsInput } from "../components/ChipsInput";
import { inputCls } from "../components/InputStyles";
import { resumeSteps } from "@/constants/steps";

const StepSchema = z.object({
  projects: z.array(ProjectSchema),
});
type StepData = z.input<typeof StepSchema>;

export default function StepProjects() {
  const { data, update } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = resumeSteps.findIndex((s) => s.path === pathname);

  const { register, handleSubmit, control, setValue, watch } = useForm<StepData>({
    resolver: zodResolver(StepSchema),
    defaultValues: { projects: data.projects ?? [] },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "projects",
  });

  const onSubmit = (values: StepData) => {
    update({
      projects: values.projects.map((p) => ({
        ...p,
        technologies: p.technologies ?? [],
      })),
    });
    if (idx < resumeSteps.length - 1) {
      navigate(resumeSteps[idx + 1].path);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Projects" subtitle="Showcase your personal and professional projects">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((f, idx) => {
            const tech = watch(`projects.${idx}.technologies`);
            const setTech = (v: string[]) =>
              setValue(`projects.${idx}.technologies`, v, { shouldDirty: true });

            return (
              <ArrayFieldRow key={f.id} onRemove={() => remove(idx)}>
                <input
                  className={inputCls}
                  placeholder="Project Title"
                  {...register(`projects.${idx}.title` as const)}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    className={inputCls}
                    placeholder="Live Demo URL (optional)"
                    {...register(`projects.${idx}.liveDemoUrl` as const)}
                  />
                  <input
                    className={inputCls}
                    placeholder="GitHub Repository (optional)"
                    {...register(`projects.${idx}.repoUrl` as const)}
                  />
                </div>
                <textarea
                  className={`${inputCls} h-24`}
                  placeholder="Project Description"
                  {...register(`projects.${idx}.description` as const)}
                />
                <ChipsInput
                  value={tech ?? []}
                  onChange={setTech}
                  placeholder="Technologies (e.g., React, Kafka, Spark)"
                />
              </ArrayFieldRow>
            );
          })}

          <Button
            variant="outline"
            leftIcon={<Plus size={16} />}
            onClick={() =>
              append({ title: "", liveDemoUrl: "", repoUrl: "", description: "", technologies: [] })
            }
          >
            Add Project
          </Button>

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
            <Button type="submit" rightIcon={<ArrowRight size={16} />}>
              Next
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
