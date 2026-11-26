import React, { useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { WorkspaceHeader } from "../../components/WorkspaceHeader";
import { BarChart3 } from "lucide-react";
import { Dashboard } from "./FinanceDashboardPanel";
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
export function BursarWorkspace({ page }: { page: Page }) {
  const options = useApiResource<Options>(
    "/api/bursar/options",
    (v) =>
      Array.isArray((v as Options)?.terms) &&
      Array.isArray((v as Options)?.categories) && Array.isArray((v as Options)?.classes),
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
    <div className="space-y-5">
      <WorkspaceHeader
        icon={BarChart3}
        title={names[page]}
        description="School finance · collections, balances and spending"
      >
        <button className={button} onClick={options.refresh}>
          Refresh settings
        </button>
      </WorkspaceHeader>
      <State resource={options}>
        <div className={`${panel} grid gap-3 sm:grid-cols-2 lg:max-w-2xl`}>
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
          {page !== 'audit' && <Field title="Term">
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
          </Field>}
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
