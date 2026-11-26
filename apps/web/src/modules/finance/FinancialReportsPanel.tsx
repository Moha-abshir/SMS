import { ContentSkeleton, layoutForPath } from '../../components/ContentSkeleton';
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApiResource } from "../../hooks/useApiResource";
import { printElement } from "../../lib/printElement";
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
export function Reports({ period, school }: any) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [group, setGroup] = useState("daily");
  const r = useApiResource<any>(
    `/api/bursar/reports?${period}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`,
    (v) => Array.isArray((v as any)?.daily),
  );
  const d = r.data;
  const monthly = Object.entries(
    (d?.daily || []).reduce((acc: any, row: any) => {
      const key = row.date.slice(0, 7);
      const value = acc[key] || { amount: 0, count: 0 };
      value.amount += Math.round(Number(row.amount) * 100);
      value.count += row.count;
      acc[key] = value;
      return acc;
    }, {}),
  ).map(([date, v]: any) => ({
    date,
    amount: (v.amount / 100).toFixed(2),
    count: v.count,
  }));
  function preset(kind: string) {
    const now = today(),
      start = new Date(`${now}T00:00:00Z`);
    if (kind === "day") setFrom(now);
    if (kind === "week") {
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
      setFrom(start.toISOString().slice(0, 10));
    }
    if (kind === "month") setFrom(`${now.slice(0, 7)}-01`);
    setTo(now);
  }
  return (
    <>
      <section className={panel}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field title="From date">
            <input
              type="date"
              className={input}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field title="To date">
            <input
              type="date"
              className={input}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field title="Collection grouping">
            <select
              className={input}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["day", "Today"],
            ["week", "This week"],
            ["month", "This month"],
          ].map(([k, label]) => (
            <button key={k} className={button} onClick={() => preset(k)}>
              {label}
            </button>
          ))}
          <button
            className={button}
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            Full selected academic period
          </button>
          <button className={button} onClick={r.refresh}>
            Refresh
          </button>
        </div>
      </section>
      <State resource={r} skeleton={<ContentSkeleton layout="report"/>}>
        {d && (
          <section className={panel}>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                className={button}
                onClick={() =>
                  printElement("financial-report", "Financial Report")
                }
              >
                Print / Save PDF
              </button>
              <button
                className={button}
                onClick={() =>
                  csv(
                    group === "daily" ? d.daily : monthly,
                    "fee-collections.csv",
                  )
                }
              >
                Export collections
              </button>
              <button
                className={button}
                onClick={() => csv(d.expenseCategories, "expense-report.csv")}
              >
                Export expense totals
              </button>
              <Link className={button} to="/outstanding-fees">
                Outstanding fees report
              </Link>
              <Link className={button} to="/finance">
                Payment transaction history
              </Link>
            </div>
            <div id="financial-report">
              <SchoolHeader school={school} title="Income and Expense Report" />
              <p className="mb-4 text-sm">
                {period.split("&").join(" · ").split("=").join(" ")} ·{" "}
                {from || "Period start"} to {to || "Period end"}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Fee collections", d.collections],
                  ["Other income", d.otherIncome],
                  ["Total income", d.totalIncome],
                  ["Total expenses", d.totalExpenses],
                  ["Net position", d.netPosition],
                  ["Cash fee collections", d.cashCollections],
                ].map(([label, value]) => (
                  <div
                    className="rounded border border-slate-200 p-3 dark:border-slate-700"
                    key={label}
                  >
                    <p className="text-sm text-slate-500">{label}</p>
                    <strong className="mt-1 block">{fmt(value)}</strong>
                  </div>
                ))}
              </div>
              {[
                [
                  "Fee collections",
                  group === "daily" ? d.daily : monthly,
                  "date",
                ],
                ["Fee collections by method", d.methods, "method"],
                ["Expenses by category", d.expenseCategories, "category"],
              ].map(([title, rows, key]: any) => (
                <div className="mt-6" key={title}>
                  <h3 className="mb-2 font-semibold">{title}</h3>
                  {rows.length ? (
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr>
                          <th className="p-2">
                            {key === "date"
                              ? group === "daily"
                                ? "Date"
                                : "Month"
                              : key}
                          </th>
                          <th className="p-2">Transactions</th>
                          <th className="p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row: any) => (
                          <tr
                            key={row[key]}
                            className="border-t border-slate-200 dark:border-slate-800"
                          >
                            <td className="p-2">{row[key]}</td>
                            <td className="p-2">{row.count}</td>
                            <td className="p-2 text-right">
                              {fmt(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No records for these filters.
                    </p>
                  )}
                </div>
              ))}
              <p className="mt-5 text-xs text-slate-500">{d.basis}</p>
            </div>
          </section>
        )}
      </State>
    </>
  );
}
