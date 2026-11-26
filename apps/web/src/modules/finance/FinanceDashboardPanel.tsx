import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Wallet,
  Receipt,
  Users,
  BarChart3,
  AlertCircle,
  Coins,
  Calculator,
  CalendarDays,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { useApiResource } from "../../hooks/useApiResource";
import { fmt, date, State } from "./FinanceWorkspaceParts";

const surface =
  "rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-[#0c1830]";

/** Navigation remains available while the financial records are being fetched. */
export function FinanceQuickActions() {
  const primary = [
    {
      path: "/finance",
      title: "Record fee payment",
      description: "Collect fees & issue receipts",
      icon: Wallet,
    },
    {
      path: "/expenses",
      title: "Record expense",
      description: "School spending & vouchers",
      icon: Receipt,
    },
    {
      path: "/learner-balances",
      title: "Find learner balance",
      description: "Balances & learner statements",
      icon: Users,
    },
    {
      path: "/financial-reports",
      title: "View reports",
      description: "Collections, income & expenses",
      icon: BarChart3,
    },
  ];
  const secondary = [
    {
      path: "/outstanding-fees",
      title: "Outstanding fees",
      description: "Find learners with unpaid fees",
    },
    {
      path: "/other-income",
      title: "Other income",
      description: "Record income outside school fees",
    },
    {
      path: "/fee-structures",
      title: "Fee structures",
      description: "Prepare rates for Head Teacher review",
    },
    {
      path: "/finance-audit",
      title: "Finance audit",
      description: "Review transactions & corrections",
    },
  ];
  return (
    <section aria-labelledby="finance-shortcuts" className="space-y-3">
      <div className={surface}>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
          <h2
            id="finance-shortcuts"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
          >
            <Wallet className="h-4 w-4 text-sky-500" />
            Finance shortcuts
          </h2>
          <span className="text-[10px] font-semibold text-slate-400">
            Quick operations
          </span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {primary.map(({ path, title, description, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="group flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-sky-700 dark:hover:bg-[#122444]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {title}
                  </h3>
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-400 group-hover:text-sky-500" />
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {secondary.map(({ path, title, description }) => (
          <Link
            key={path}
            to={path}
            className="group min-w-0 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:border-slate-800 dark:bg-[#0c1830] dark:hover:border-sky-700"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                {title}
              </span>
              <ArrowRight className="h-3 w-3 shrink-0 text-slate-400 group-hover:text-sky-500" />
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Reserves the compact statistics ribbons and activity columns used below. */
export function FinanceDashboardSkeleton({
  filters = false,
}: {
  filters?: boolean;
}) {
  const block = "rounded bg-slate-200 dark:bg-slate-800";
  return (
    <div
      role="status"
      aria-label="Loading content"
      aria-busy="true"
      data-skeleton-layout="dashboard"
      className="space-y-3.5 motion-safe:animate-pulse"
    >
      <span className="sr-only">Loading content</span>
      <div aria-hidden="true" className="space-y-3.5">
        {filters && (
          <div className={`${surface} grid gap-3 sm:grid-cols-2`}>
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2">
                <div className={`${block} h-3 w-24`} />
                <div className={`${block} h-9 w-full`} />
              </div>
            ))}
          </div>
        )}
        <div className={`${surface} grid grid-cols-2 gap-4 lg:grid-cols-4`}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="min-w-0 space-y-2">
              <div className={`${block} h-3 w-28 max-w-full`} />
              <div className={`${block} h-5 w-24 max-w-full`} />
            </div>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className={`${surface} space-y-4`}>
              <div className={`${block} h-4 w-36`} />
              {[0, 1, 2].map((j) => (
                <div
                  className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800"
                  key={j}
                >
                  <div className={`${block} h-3 w-40 max-w-full`} />
                  <div className={`${block} h-2 w-24`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Dashboard({ period }: { period: string }) {
  const r = useApiResource<any>(
    `/api/bursar/dashboard?${period}`,
    (v) =>
      typeof (v as any)?.collections === "string" &&
      Array.isArray((v as any)?.recentExpenses),
  );
  const d = r.data;
  const metrics = d
    ? [
        {
          label: "Today’s fee collections",
          value: fmt(d.today),
          icon: Wallet,
          tone: "text-sky-500",
        },
        {
          label: "This week",
          value: fmt(d.week),
          icon: CalendarDays,
          tone: "text-sky-500",
        },
        {
          label: "This month",
          value: fmt(d.month),
          icon: TrendingUp,
          tone: "text-indigo-500",
        },
        {
          label: "Selected period collections",
          value: fmt(d.collections),
          icon: CreditCard,
          tone: "text-emerald-500",
        },
        {
          label: "Outstanding fees",
          value: fmt(d.outstanding.outstanding),
          icon: AlertCircle,
          tone: "text-amber-500",
        },
        {
          label: "Learners with balances",
          value: d.outstanding.learners,
          icon: Users,
          tone: "text-sky-500",
        },
        {
          label: "Learner credits",
          value: fmt(d.outstanding.credits),
          icon: Coins,
          tone: "text-indigo-500",
        },
        {
          label: "Income less expenses",
          value: fmt(d.netPosition),
          icon: Calculator,
          tone: "text-emerald-500",
        },
      ]
    : [];
  return (
    <State resource={r} skeleton={<FinanceDashboardSkeleton />}>
      {d && (
        <>
          <section aria-labelledby="finance-stats" className="space-y-2.5">
            <h2
              id="finance-stats"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
            >
              <BarChart3 className="h-4 w-4 text-sky-500" />
              Financial position
            </h2>
            <dl
              className={`${surface} grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4`}
            >
              {metrics.map(({ label, value, icon: Icon, tone }, i) => (
                <div
                  key={label}
                  className={`flex min-w-0 items-start gap-2.5 px-1 ${i >= 4 ? "border-t border-slate-100 pt-3 dark:border-slate-800" : ""}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                      {label}
                    </dt>
                    <dd className="mt-1 break-words font-mono text-sm font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              {d.paymentsToday} fee payments today. Calendar totals use Nairobi
              time and the selected academic period.
            </p>
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            {[
              {
                title: "Recent fee payments",
                rows: d.recentPayments,
                path: "/finance",
                icon: Wallet,
              },
              {
                title: "Recent expenses",
                rows: d.recentExpenses,
                path: "/expenses",
                icon: Receipt,
              },
            ].map(({ title, rows, path, icon: Icon }) => (
              <section key={title} className={surface}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Icon className="h-4 w-4 text-sky-500" />
                    {title}
                  </h2>
                  <Link
                    to={path}
                    className="shrink-0 text-[10px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
                  >
                    View history
                  </Link>
                </div>
                {rows.length ? (
                  rows.map((row: any) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap justify-between gap-2 border-t border-slate-100 py-3 text-xs dark:border-slate-800"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium text-slate-800 dark:text-slate-200">
                          {row.title}
                        </p>
                        <p className="mt-1 break-words text-[10px] text-slate-500">
                          {row.number} · {date(row.date)}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-semibold">
                        {fmt(row.amount)}
                        {row.voidedAt ? " · Voided" : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No records in this period.
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </State>
  );
}
