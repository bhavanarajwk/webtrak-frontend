"use client";

import { isValidElement, type ReactNode } from "react";

export function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} type={type} />
    </label>
  );
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <select className="input-field px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FileField({
  label,
  onPick,
  accept,
}: {
  label: string;
  accept?: string;
  onPick?: (file: File | null) => void;
}) {
  return (
    <label className="text-xs text-wt-text-muted flex flex-col gap-1">
      {label}
      <input
        type="file"
        accept={accept}
        className="input-field px-3 py-2 text-sm"
        onChange={(e) => onPick?.(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export function DataTable({
  title,
  columns,
  rows,
  emptyLabel,
  compact = false,
}: {
  title?: string;
  columns: string[];
  rows: Array<Record<string, unknown | ReactNode>>;
  emptyLabel: string;
  compact?: boolean;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-wt-border bg-wt-surface-2/40 p-8 text-center">
        {title ? <p className="text-sm font-medium mb-1">{title}</p> : null}
        <p className="text-sm text-wt-text-muted">{emptyLabel}</p>
      </div>
    );
  }
  const cellClass = compact ? "px-2 py-1.5 whitespace-nowrap" : "px-3 py-2 whitespace-nowrap";
  const headCellClass = compact
    ? "text-left px-2 py-2 font-medium whitespace-nowrap sticky top-0 z-[1] bg-wt-surface-2 shadow-[0_1px_0_var(--wt-border)]"
    : "text-left px-3 py-2 font-medium whitespace-nowrap sticky top-0 z-[1] bg-wt-surface-2 shadow-[0_1px_0_var(--wt-border)]";
  return (
    <div className="space-y-2">
      {title ? <p className="text-sm font-medium">{title}</p> : null}
      <div className="wt-scroll-both max-h-[min(70vh,560px)] rounded-xl border border-wt-border overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="text-wt-text-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} className={headCellClass}>
                  {col.replaceAll("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:hover]:bg-wt-surface-2/60">
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-wt-border">
                {columns.map((col) => (
                  <td key={col} className={cellClass}>
                    {row[col] === null || row[col] === undefined
                      ? "—"
                      : isValidElement(row[col])
                        ? (row[col] as ReactNode)
                        : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.trim().toUpperCase();
  const tone =
    s === "COMPLETED"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : s === "CANCELLED"
        ? "bg-rose-500/15 text-rose-700 border-rose-500/30"
        : s === "IN_PROGRESS" || s === "SCHEDULED"
          ? "bg-sky-500/15 text-sky-800 border-sky-500/30"
          : "bg-wt-surface-2 text-wt-text-muted border-wt-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>{status}</span>
  );
}

export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" aria-label="Close panel" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-wt-border bg-wt-surface-1 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b border-wt-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" className="rounded-lg p-2 text-wt-text-muted hover:bg-wt-surface-2" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-wt-border px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
