import type react from "react";
import { Trash2 } from "lucide-react";

export default function ArrayFieldRow({
  children,
  onRemove,
}: {
  children: react.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="border rounded p-3 mb-3">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 grid gap-2">{children}</div>
        {onRemove && (
          <button
            className="px-3 py-2 rounded-lg border border-border text-sm text-text-2 hover:text-text hover:bg-card"
            onClick={onRemove}
            title="Remove"
          >
            <span className="inline-flex items-center gap-2 text-red-400">
              <Trash2 size={16} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
