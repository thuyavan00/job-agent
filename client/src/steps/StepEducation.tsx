"use client";
import { useFieldArray, useForm } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EducationSchema } from "../schema/profile";
import { z } from "zod";
import { Card, Button } from "../components/Card";
import { useFormCtx } from "../context/FormContext";
import { useNavigate, useLocation } from "react-router-dom";
import ArrayFieldRow from "../components/ArrayFieldRow";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { inputCls } from "../components/InputStyles";
import { resumeSteps } from "@/constants/steps";

const StepSchema = z.object({
  education: z.array(EducationSchema),
});
type StepData = z.input<typeof StepSchema>;

export default function StepEducation() {
  const { data, update } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const idx = resumeSteps.findIndex((s) => s.path === pathname);

  const { register, handleSubmit, control } = useForm<StepData>({
    resolver: zodResolver(StepSchema),
    defaultValues: { education: data.education ?? [] },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "education" });

  const onSubmit: SubmitHandler<StepData> = (values) => {
    update({
      education: values.education.map((e) => ({
        ...e,
        gpa: e.gpa === "" ? undefined : typeof e.gpa === "string" ? Number(e.gpa) : e.gpa,
      })),
    });
    if (idx < resumeSteps.length - 1) {
      navigate(resumeSteps[idx + 1].path);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Education" subtitle="Your educational background and qualifications">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((f, idx) => (
            <ArrayFieldRow key={f.id} onRemove={() => remove(idx)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className={inputCls}
                  placeholder="Degree"
                  {...register(`education.${idx}.degree` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="Institution"
                  {...register(`education.${idx}.institution` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="Location (optional)"
                  {...register(`education.${idx}.location` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="GPA (optional, 0-10)"
                  {...register(`education.${idx}.gpa` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="Start Date (e.g., August, 2010)"
                  {...register(`education.${idx}.startDate` as const)}
                />
                <input
                  className={inputCls}
                  placeholder="End Date (e.g., May, 2014)"
                  {...register(`education.${idx}.endDate` as const)}
                />
              </div>
            </ArrayFieldRow>
          ))}

          <Button
            variant="outline"
            leftIcon={<Plus size={16} />}
            onClick={() =>
              append({
                degree: "",
                institution: "",
                startDate: "",
                endDate: "",
                location: "",
                gpa: undefined,
              })
            }
          >
            Add Education
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
