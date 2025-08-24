import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { ProfileForm } from "../schema/profile";

type FormCtx = {
  data: ProfileForm;
  update: (d: Partial<ProfileForm>) => void;
};

const Context = createContext<FormCtx | null>(null);

export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<ProfileForm>({
    basics: { fullName: "", email: "" },
    education: [],
    experience: [],
    projects: [],
    skills: { items: [] },
  } as ProfileForm);

  const update = (d: Partial<ProfileForm>) => setData((prev) => ({ ...prev, ...d }));

  return <Context.Provider value={{ data, update }}>{children}</Context.Provider>;
};

export const useFormCtx = () => {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("FormContext missing");
  return ctx;
};
