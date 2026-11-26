import {
  ContentSkeleton,
  type SkeletonLayout,
} from "../../components/ContentSkeleton";
import React, { useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { BarChart3, CalendarCheck } from "lucide-react";
import {
  Dashboard,
  FinanceQuickActions,
  FinanceDashboardSkeleton,
} from "./FinanceDashboardPanel";
import { Balances } from "./LearnerBalancesPanel";
import { Entries } from "./FinanceEntriesPanel";
import { Reports } from "./FinancialReportsPanel";
import { Audit } from "./FinanceAuditPanel";
import {
  input,
  button,
  panel,
  Field,
  State,
  type Options,
  type Page,
} from "./FinanceWorkspaceParts";
const loadingLayouts: Record<Page, SkeletonLayout> = {
  dashboard: "dashboard",
  balances: "table",
  outstanding: "table",
  expenses: "cards",
  income: "cards",
  reports: "report",
  audit: "audit",
};
export function BursarWorkspace({ page }: { page: Page }) {
  const options = useApiResource<Options>(
    "/api/bursar/options",
    (v) =>
      Array.isArray((v as Options)?.terms) &&
      Array.isArray((v as Options)?.categories) &&
      Array.isArray((v as Options)?.classes),
  );
  const [year, setYear] = useState(new Date().getFullYear()),
    [term, setTerm] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    if (options.data && !ready) {
      const current = options.data.terms.find((t) => t.isCurrent);
      setYear(
        options.data.school?.currentAcademicYear ||
          current?.year ||
          new Date().getFullYear(),
      );
      setTerm(current ? String(current.termNumber) : "");
      setReady(true);
    }
  }, [options.data, ready]);
  const period = `academicYear=${year}${term ? `&termNumber=${term}` : ""}`;
  const names: Record<Page, string> = {
    dashboard: "Finance Dashboard",
    balances: "Learner Balances",
    outstanding: "Outstanding Fees",
    expenses: "Expenses",
    income: "Other Income",
    reports: "Financial Reports",
    audit: "Finance Audit",
  };
  const authUser = JSON.parse(localStorage.getItem("auth_user") || "{}");
  const bursar = (authUser.roleName || authUser.role) === "BURSAR";
  return (
    <div className={page === "dashboard" ? "space-y-3.5" : "space-y-5"}>
      {page === "dashboard" ? (
        <>
          <header className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-xs font-bold text-white">
                BU
              </span>
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-slate-100">
                Finance Dashboard
              </h1>
              <span className="rounded-md border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:border-sky-800/80 dark:bg-sky-950/70 dark:text-sky-300">
                Bursar
              </span>
              {ready && (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {term ? `Term ${term}` : "All terms"} · {year}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 sm:self-auto dark:border-slate-800 dark:bg-[#0c1830] dark:text-slate-300">
              <CalendarCheck className="h-3.5 w-3.5 text-sky-500" />
              <span>
                Today:{" "}
                {new Intl.DateTimeFormat("en-KE", {
                  timeZone: "Africa/Nairobi",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date())}
              </span>
            </div>
          </header>
          <FinanceQuickActions />
        </>
      ) : (
        <WorkspaceHeader
          icon={BarChart3}
          title={names[page]}
          description="School finance · collections, balances and spending"
        >
          <button className={button} onClick={options.refresh}>
            Refresh settings
          </button>
        </WorkspaceHeader>
      )}
      <State
        resource={options}
        skeleton={
          page === "dashboard" ? (
            <FinanceDashboardSkeleton filters />
          ) : (
            <ContentSkeleton layout={loadingLayouts[page]} filters />
          )
        }
      >
        <div
          className={
            page === "dashboard"
              ? "grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-slate-800 dark:bg-[#0c1830]"
              : `${panel} grid gap-3 sm:grid-cols-2 lg:max-w-2xl`
          }
        >
          <Field title="Academic year">
            <select
              aria-label="Academic year"
              className={input}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[
                ...new Set([
                  year,
                  ...(options.data?.terms.map((t) => t.year) || []),
                ]),
              ]
                .sort((a, b) => b - a)
                .map((y) => (
                  <option key={y}>{y}</option>
                ))}
            </select>
          </Field>
          {page !== "audit" && (
            <Field title="Term">
              <select
                aria-label="Term"
                className={input}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              >
                <option value="">All terms</option>
                {[1, 2, 3].map((t) => (
                  <option key={t} value={t}>
                    Term {t}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {page === "dashboard" && (
            <button className={button} onClick={options.refresh}>
              Refresh settings
            </button>
          )}
        </div>
        {ready && options.data && (
          <React.Fragment key={page}>
            {page === "dashboard" && <Dashboard period={period} />}
            {(page === "balances" || page === "outstanding") && (
              <Balances
                period={period}
                outstanding={page === "outstanding"}
                options={options.data}
              />
            )}
            {(page === "expenses" || page === "income") && (
              <Entries
                kind={page === "expenses" ? "expense" : "income"}
                period={period}
                year={year}
                term={term}
                options={options.data}
                refreshOptions={options.refresh}
                canWrite={bursar}
              />
            )}
            {page === "reports" && (
              <Reports period={period} school={options.data.school} />
            )}
            {page === "audit" && <Audit period={`academicYear=${year}`} />}
          </React.Fragment>
        )}
      </State>
    </div>
  );
}
