// src/steps/StepExperience.tsx
"use client";
import { useFieldArray, useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExperienceSchema } from "../schema/profile";
import { z } from "zod";
import { useFormCtx } from "../context/FormContext";
import { useNavigate, useLocation } from "react-router-dom";
import ArrayFieldRow from "../components/ArrayFieldRow";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { inputCls } from "../components/InputStyles";
import { Card, Button } from "../components/Card";
import { resumeSteps } from "@/constants/steps";

type Exp = z.input<typeof ExperienceSchema>;
type StepData = { experience: Exp[] };

export default function StepExperience() {
  const { data, update } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = resumeSteps.findIndex((s) => s.path === pathname);

  const { register, handleSubmit, control } = useForm<StepData>({
    resolver: zodResolver(z.object({ experience: z.array(ExperienceSchema) })),
    defaultValues: { experience: data.experience ?? [] },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "experience",
  });

  const onSubmit: SubmitHandler<StepData> = (values) => {
    update({
      experience: values.experience.map((e) => ({
        ...e,
        bulletsText: e.bulletsText ?? "",
      })),
    });
    if (idx < resumeSteps.length - 1) {
      navigate(resumeSteps[idx + 1].path);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Work Experience" subtitle="Your professional work history and accomplishments">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((f, idx) => (
            <ArrayFieldRow key={f.id} onRemove={() => remove(idx)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className={inputCls}
                  placeholder="Job Title"
                  {...register(`experience.${idx}.jobTitle` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="Company"
                  {...register(`experience.${idx}.company` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="Location (optional)"
                  {...register(`experience.${idx}.location` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="Start Date"
                  {...register(`experience.${idx}.startDate` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="End Date (empty = Present)"
                  {...register(`experience.${idx}.endDate` as const)}
                />
              </div>
              <textarea
                className={`${inputCls} h-28`}
                placeholder={"Bullets (one per line)\n• Implemented...\n• Built...\n• Led..."}
                {...register(`experience.${idx}.bulletsText` as const)}
              />
            </ArrayFieldRow>
          ))}

          <Button
            variant="outline"
            leftIcon={<Plus size={16} />}
            onClick={() =>
              append({
                jobTitle: "",
                company: "",
                location: "",
                startDate: "",
                endDate: "",
                bulletsText: "",
              })
            }
          >
            Add Experience
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
