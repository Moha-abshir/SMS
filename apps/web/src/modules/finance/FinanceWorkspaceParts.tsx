import { ContentSkeleton } from "../../components/ContentSkeleton";
import React from "react";
import { toast } from "react-toastify";
import { RequestError } from "../../components/RequestError";
export const input =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
export const button =
  "inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";
export const panel =
  "rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900";
export const fmt = (v: unknown) =>
  `KES ${Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const date = (v: string) =>
  new Date(v).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const methods = [
  ["CASH", "Cash"],
  ["MANUAL_MPESA", "M-Pesa"],
  ["BANK_DEPOSIT", "Bank"],
  ["CHEQUE", "Cheque"],
  ["OTHER", "Other"],
];
export type Page =
  | "dashboard"
  | "balances"
  | "outstanding"
  | "expenses"
  | "income"
  | "reports"
  | "audit";
export type Options = {
  classes: any[];
  categories: any[];
  terms: any[];
  school: any;
};
export function Field({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1 text-sm">
      <span>{title}</span>
      {children}
    </label>
  );
}
export function State({
  resource,
  children,
  skeleton,
}: {
  skeleton?: React.ReactNode;
  resource: any;
  children: React.ReactNode;
}) {
  return resource.error ? (
    <RequestError message={resource.error} onRetry={resource.refresh} />
  ) : resource.loading ? (
    skeleton || <ContentSkeleton />
  ) : resource.data ? (
    <>{children}</>
  ) : null;
}
export function Pager({ resource, page, setPage }: any) {
  const data = resource.data;
  return data ? (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>
        {data.total} records · Page {page + 1}
      </span>
      <div className="flex gap-2">
        <button
          className={button}
          disabled={!page || resource.loading}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <button
          className={button}
          disabled={(page + 1) * 25 >= data.total || resource.loading}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  ) : null;
}
export function csv(rows: any[], filename: string) {
  if (!rows.length) {
    toast.info("No records to export.");
    return;
  }
  const keys = Object.keys(rows[0]);
  const cell = (v: any) =>
    `"${String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .split('"')
      .join('""')}"`;
  const content = [
    keys.map(cell).join(","),
    ...rows.map((row) =>
      keys
        .map((key) =>
          cell(
            typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
export function SchoolHeader({ school, title }: any) {
  return (
    <header style={{ textAlign: "center", marginBottom: 20 }}>
      {school?.logoUrl && (
        <img
          src={school.logoUrl}
          alt="School logo"
          style={{
            width: 56,
            height: 56,
            objectFit: "contain",
            margin: "0 auto",
          }}
        />
      )}
      <h2 style={{ fontSize: 22, fontWeight: 700 }}>
        {school?.schoolName || "School"}
      </h2>
      <p>{school?.address}</p>
      <p>
        {school?.contactPhone} {school?.contactEmail}
      </p>
      <h3 style={{ fontSize: 18, marginTop: 12, fontWeight: 600 }}>{title}</h3>
    </header>
  );
}
