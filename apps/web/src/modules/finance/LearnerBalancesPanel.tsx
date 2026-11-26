import { ContentSkeleton, layoutForPath } from '../../components/ContentSkeleton';
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { apiClient } from "../../lib/apiClient";
import { useApiResource } from "../../hooks/useApiResource";
import { Modal } from "../../components/Modal";
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
export function Balances({ period, outstanding, options }: any) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [classId, setClassId] = useState(""),
    [level, setLevel] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [page, setPage] = useState(0),
    [student, setStudent] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(0), [period, classId, level, min, max]);
  const params = new URLSearchParams({
    search: query,
    limit: "25",
    offset: String(page * 25),
    ...(outstanding ? { outstanding: "true" } : {}),
    ...(classId ? { classId } : {}),
    ...(level ? { level } : {}),
    ...(min ? { minBalance: min } : {}),
    ...(max ? { maxBalance: max } : {}),
  });
  const r = useApiResource<any>(
    `/api/bursar/balances?${period}&${params}`,
    (v) => Array.isArray((v as any)?.items),
  );
  return (
    <>
      <section className={panel}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field title="Learner or guardian">
            <input
              className={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, KNEC or phone"
            />
          </Field>
          <Field title="Class">
            <select
              className={input}
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">All classes</option>
              {options.classes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Level">
            <select
              className={input}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">All levels</option>
              {[
                ...new Set<string>(
                  options.classes.map((c: any) => c.levelCategory),
                ),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field title="Minimum outstanding">
            <input
              className={input}
              type="number"
              min="0"
              step="0.01"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </Field>
          <Field title="Maximum outstanding">
            <input
              className={input}
              type="number"
              min="0"
              step="0.01"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </Field>
        </div>
      </section>
      <section className={panel}>
        <State resource={r} skeleton={<ContentSkeleton layout="table"/>}>
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              className={button}
              onClick={async () => {
                try {
                  const result = await apiClient.get(
                    `/api/bursar/balances/export?${period}&${params}`,
                  );
                  csv(
                    result.data.data.items,
                    "learner-balances-all-filtered.csv",
                  );
                } catch (e: any) {
                  toast.error(
                    e.response?.data?.message ||
                      "Could not export the report. Please retry.",
                  );
                }
              }}
            >
              Export all matching learners
            </button>
            <button
              className={button}
              onClick={() => csv(r.data.items, "learner-balances-page.csv")}
            >
              Export this page
            </button>
            <button
              className={button}
              onClick={() => printElement("balance-print", "Learner Balances")}
            >
              Print this page
            </button>
            <button className={button} onClick={r.refresh}>
              Refresh
            </button>
          </div>
          <div id="balance-print">
            <SchoolHeader
              school={options.school}
              title={outstanding ? "Outstanding Fees" : "Learner Balances"}
            />
            <p className="mb-3 text-sm">
              {period.split("&").join(" · ").split("=").join(" ")} · Current
              balances · Filters apply · Page {page + 1}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Learner / KNEC",
                      "Class",
                      "Guardian",
                      "Expected",
                      "Paid",
                      "Outstanding",
                      "Credit",
                      "",
                    ].map((v) => (
                      <th key={v} className="p-3">
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.data?.items.map((row: any) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="p-3">
                        <p>{row.learnerName}</p>
                        <p className="text-xs text-slate-500">
                          {row.assessmentNumber || "Not assigned"}
                          {!row.billCount ? " · Unbilled" : ""}
                          {row.status !== "ACTIVE" ? ` · ${row.status}` : ""}
                        </p>
                      </td>
                      <td className="p-3">{row.className}</td>
                      <td className="p-3">
                        {row.guardianName}
                        <br />
                        {row.guardianPhone}
                      </td>
                      {["expected", "paid", "outstanding", "credit"].map(
                        (k) => (
                          <td key={k} className="whitespace-nowrap p-3">
                            {fmt(row[k])}
                          </td>
                        ),
                      )}
                      <td>
                        <button
                          className={button}
                          onClick={() => setStudent(row.id)}
                        >
                          Statement
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!r.data?.items.length && (
              <p className="p-4 text-sm text-slate-500">
                No matching learners.
              </p>
            )}
          </div>
          <Pager resource={r} page={page} setPage={setPage} />
        </State>
      </section>
      {student && (
        <Statement
          student={student}
          period={period}
          school={options.school}
          close={() => setStudent(null)}
        />
      )}
    </>
  );
}
function Statement({ student, period, school, close }: any) {
  const r = useApiResource<any>(
    `/api/finance/students/${student}/statement?${period}`,
    (v) => Array.isArray((v as any)?.ledger),
  );
  return (
    <Modal
      isOpen
      onClose={close}
      title="Learner fee statement"
      maxWidth="max-w-4xl"
    >
      <State resource={r} skeleton={<ContentSkeleton layout="statement"/>}>
        {r.data && (
          <>
            <button
              className={button}
              onClick={() =>
                printElement("learner-statement", "Learner Fee Statement")
              }
            >
              Print / Save PDF
            </button>
            <div id="learner-statement" className="mt-4">
              <SchoolHeader school={school} title="Learner Fee Statement" />
              {r.data.summary.ledgerReconciles===false&&<p role="alert" className="rounded bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">The recorded bill balance and transaction history differ. Ask the Head Teacher to review reconciliation before relying on this statement.</p>}
              <h3 className="font-semibold">
                {r.data.student.fullName} · {r.data.student.className}
              </h3>
              <p className="text-sm">
                KNEC: {r.data.student.assessmentNumber || "Not assigned"} ·{" "}
                {period.split("&").join(" · ").split("=").join(" ")}
              </p>
              <p className="my-3">
                Balance: {fmt(r.data.summary.totalBalance)}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead>
                    <tr>
                      {[
                        "Date",
                        "Description",
                        "Debit",
                        "Credit",
                        "Balance",
                      ].map((s) => (
                        <th className="p-2" key={s}>
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.ledger.map((row: any) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-200 dark:border-slate-800"
                      >
                        <td className="p-2">{date(row.date)}</td>
                        <td className="p-2">{row.description}</td>
                        <td className="p-2">
                          {row.debit ? fmt(row.debit) : "—"}
                        </td>
                        <td className="p-2">
                          {row.credit ? fmt(row.credit) : "—"}
                        </td>
                        <td className="p-2">{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!r.data.ledger.length && (
                <p className="p-3">No transactions for this period.</p>
              )}
            </div>
          </>
        )}
      </State>
    </Modal>
  );
}
