import React from "react";
import { Link } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import {
  input,
  button,
  panel,
  fmt,
  date,
  today,
  methods,
  Field,
  State,
  Pager,
  csv,
  SchoolHeader,
} from "./FinanceWorkspaceParts";
export function Dashboard({ period }: any) {
  const r = useApiResource<any>(
    `/api/bursar/dashboard?${period}`,
    (v) =>
      typeof (v as any)?.collections === "string" &&
      Array.isArray((v as any)?.recentExpenses),
  );
  const d = r.data;
  return (
    <State resource={r}>
      {d && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Today’s fee collections", fmt(d.today)],
              ["This week", fmt(d.week)],
              ["This month", fmt(d.month)],
              ["Selected period collections", fmt(d.collections)],
              ["Outstanding fees", fmt(d.outstanding.outstanding)],
              ["Learners with balances", d.outstanding.learners],
              ["Learner credits", fmt(d.outstanding.credits)],
              ["Income less expenses", fmt(d.netPosition)],
            ].map(([label, value]) => (
              <div key={label} className={panel}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <p className="mt-2 break-words text-xl font-semibold">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {d.paymentsToday} fee payments today. Calendar totals use Nairobi
            time and the selected academic period.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ["/finance", "Record fee payment"],
              ["/learner-balances", "Find learner balance"],
              ["/expenses", "Record expense"],
              ["/financial-reports", "View reports"],
            ].map(([path, label]) => (
              <Link key={path} className={button} to={path}>
                {label}
              </Link>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              ["Recent fee payments", d.recentPayments],
              ["Recent expenses", d.recentExpenses],
            ].map(([label, rows]: any) => (
              <section key={label} className={panel}>
                <h2 className="mb-3 font-semibold">{label}</h2>
                {rows.length ? (
                  rows.map((row: any) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap justify-between gap-2 border-t border-slate-100 py-3 text-sm dark:border-slate-800"
                    >
                      <div>
                        <p>{row.title}</p>
                        <p className="text-xs text-slate-500">
                          {row.number} · {date(row.date)}
                        </p>
                      </div>
                      <span>
                        {fmt(row.amount)}
                        {row.voidedAt ? " · Voided" : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
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
