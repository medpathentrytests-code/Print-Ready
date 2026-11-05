"use client";
import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import clsx from "clsx";

export function Dropzone({
  onFileSelected,
  file,
  onClear,
  maxSizeMb = 75,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  file: File | null;
  onClear: () => void;
  maxSizeMb?: number;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback(
    (f: File) => {
      if (!f.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported.");
        return;
      }
      if (f.size > maxSizeMb * 1024 * 1024) {
        setError(`File exceeds the ${maxSizeMb}MB limit for your plan.`);
        return;
      }
      setError(null);
      onFileSelected(f);
    },
    [maxSizeMb, onFileSelected]
  );

  if (file) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-violet-soft)] text-[var(--color-brand-violet)]">
          <FileText size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{file.name}</div>
          <div className="text-xs text-[var(--color-muted)]">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        </div>
        {!disabled && (
          <button onClick={onClear} className="shrink-0 rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-surface-alt)] cursor-pointer">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) validate(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragOver ? "border-[var(--color-brand-violet)] bg-[var(--color-brand-violet-soft)]" : "border-[var(--color-line)] hover:border-[var(--color-brand-violet)]/60 bg-[var(--color-surface-alt)]"
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[var(--color-line)]">
          <UploadCloud className="text-[var(--color-brand-violet)]" size={26} />
        </div>
        <div>
          <p className="font-semibold text-[var(--color-ink)]">Drop your PDF here, or click to browse</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">PDF files up to {maxSizeMb}MB · Processed securely and deleted after review</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) validate(f);
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm font-medium text-[var(--color-critical)]">{error}</p>}
    </div>
  );
}
