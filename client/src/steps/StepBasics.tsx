import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BasicsSchema } from "../schema/profile";
import { z } from "zod";
import { useFormCtx } from "../context/FormContext";
import { Card, Button } from "../components/Card";
import { ArrowRight } from "lucide-react";
import { inputCls } from "../components/InputStyles";
import { useNavigate, useLocation } from "react-router-dom";
import { resumeSteps } from "@/constants/steps";

const StepSchema = z.object({ basics: BasicsSchema });
type StepData = z.input<typeof StepSchema>;

export default function StepBasics() {
  const { data, update } = useFormCtx();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const idx = resumeSteps.findIndex((s) => s.path === pathname);

  const { register, handleSubmit } = useForm<StepData>({
    resolver: zodResolver(StepSchema),
    defaultValues: { basics: data.basics },
  });

  const onSubmit = (values: StepData) => {
    update({ basics: values.basics });
    if (idx < resumeSteps.length - 1) {
      navigate(resumeSteps[idx + 1].path);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Personal Information"
        subtitle="Your basic contact information and professional summary"
      >
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Full Name" {...register("basics.fullName")} />
            <input className={inputCls} placeholder="Email" {...register("basics.email")} />
            <input className={inputCls} placeholder="Phone" {...register("basics.phone")} />
            <input className={inputCls} placeholder="Location" {...register("basics.location")} />
            <input
              className={inputCls}
              placeholder="LinkedIn URL"
              {...register("basics.linkedIn")}
            />
            <input className={inputCls} placeholder="GitHub URL" {...register("basics.github")} />
            <input
              className={inputCls}
              placeholder="Portfolio Website"
              {...register("basics.website")}
            />
          </div>

          <textarea
            className={`${inputCls} h-28`}
            placeholder="Professional Summary"
            {...register("basics.summary")}
          />

          <div className="flex justify-end">
            <Button type="submit" rightIcon={<ArrowRight size={16} />}>
              Next
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
