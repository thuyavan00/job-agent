import { useState } from "react";
import { X } from "lucide-react";

export function ChipsInput({
  value,
  onChange,
  placeholder = "Add a skill (e.g., React, JavaScript, Project Management)",
  addLabel = "Add",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setInput("");
  };

  const remove = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-[#0e141a] border border-bg-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/10"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg border border-bg-border bg-bg.hover text-sm text-text-secondary hover:bg-white/5"
        >
          {addLabel}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {value.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0e141a] border border-bg-border text-xs text-text-secondary"
          >
            {chip}
            <button onClick={() => remove(i)} className="hover:text-white">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
