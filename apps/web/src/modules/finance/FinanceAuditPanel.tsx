import { ContentSkeleton, layoutForPath } from '../../components/ContentSkeleton';
import React, { useEffect, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { Modal } from "../../components/Modal";
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
export function Audit({ period }: any) {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<any>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [period]);
  const r = useApiResource<any>(
    `/api/bursar/audit?${period}&offset=${page * 25}&search=${encodeURIComponent(query)}`,
    (v) => Array.isArray((v as any)?.items),
  );
  return (
    <section className={panel}>
      <p className="mb-3 text-sm text-slate-500">
        Audit events by calendar year, including billing, fee changes,
        collections, reversal decisions, expenses and other income.
      </p>
      <input
        aria-label="Search finance audit"
        className={`${input} mb-4 max-w-md`}
        placeholder="Action, staff name or record ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <State resource={r} skeleton={<ContentSkeleton layout="audit"/>}>
        <div className="space-y-3">
          {r.data?.items.map((row: any) => (
            <button
              key={row.id}
              className="block w-full rounded-lg border border-slate-200 p-3 text-left dark:border-slate-800"
              onClick={() => setSelected(row)}
            >
              <p className="break-words text-sm font-semibold">
                {row.action.split("_").join(" ")}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {row.actor || "System"} · {date(row.date)} · {row.entity}
              </p>
            </button>
          ))}
        </div>
        {!r.data?.items.length && (
          <p className="p-4 text-sm text-slate-500">No audit events.</p>
        )}
        <Pager resource={r} page={page} setPage={setPage} />
      </State>
      {selected && (
        <Modal
          isOpen
          onClose={() => setSelected(null)}
          title="Finance audit event"
        >
          <p className="mb-3 break-all text-sm">
            {selected.action} · {selected.actor} · {selected.entityId}
          </p>
          {["oldValues", "newValues"].map((k) => (
            <div key={k}>
              <h3 className="mt-3 text-sm font-semibold">
                {k === "oldValues" ? "Before" : "After"}
              </h3>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-100 p-3 text-xs dark:bg-slate-950">
                {JSON.stringify(selected[k], null, 2)}
              </pre>
            </div>
          ))}
        </Modal>
      )}
    </section>
  );
}
