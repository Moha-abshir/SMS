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
export function Entries({
  kind,
  period,
  year,
  term,
  options,
  refreshOptions,
  canWrite,
}: any) {
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [show, setShow] = useState(false),
    [voidRow, setVoidRow] = useState<any>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [category, setCategory] = useState(false),
    [categoryName, setCategoryName] = useState(""),
    [categoryEdit, setCategoryEdit] = useState<string | null>(null),
    [voucher, setVoucher] = useState<any>(null);
  const endpoint = kind === "expense" ? "expenses" : "income";
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [period]);
  const r = useApiResource<any>(
    `/api/bursar/${endpoint}?${period}&limit=25&offset=${page * 25}&search=${encodeURIComponent(query)}`,
    (v) => Array.isArray((v as any)?.items),
  );
  async function download(row: any) {
    try {
      const res = await apiClient.get(
        `/api/bursar/expenses/${row.id}/attachment`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.number}-attachment`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download attachment. Please retry.");
    }
  }
  async function voidEntry(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiClient.post(`/api/bursar/${endpoint}/${voidRow.id}/void`, {
        reason,
      });
      setVoidRow(null);
      setReason("");
      r.refresh();
      toast.success(
        "Transaction voided. The original and reason remain in history.",
      );
    } catch (e: any) {
      toast.error(
        e.response?.data?.message ||
          "Could not confirm correction. Refresh history before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Field title="Search history">
            <input
              className={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Voucher, description or supplier"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <button className={button} onClick={() => setShow(true)}>
                Record {kind === "expense" ? "expense" : "other income"}
              </button>
            )}
            {kind === "expense" && canWrite && (
              <button className={button} onClick={() => setCategory(true)}>
                Manage categories
              </button>
            )}
            <button className={button} onClick={r.refresh}>
              Refresh
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Recorded transactions retain their history. Correct an error by
          voiding with a reason, then recording the correct entry. Historical
          expenses with no assigned term appear under All terms.
        </p>
      </section>
      <section className={panel}>
        <State resource={r} skeleton={<ContentSkeleton layout="cards"/>}>
          <button
            className={`${button} mb-3`}
            onClick={() => csv(r.data.items, `${endpoint}-page.csv`)}
          >
            Export this page
          </button>
          <div className="space-y-3">
            {r.data?.items.map((row: any) => (
              <article
                className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                key={row.id}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words font-semibold">{row.title}</h2>
                    <p className="mt-1 break-words text-sm text-slate-500">
                      {row.number} · {date(row.date)} · {row.party}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.category ? `${row.category} · ` : ""}
                      {row.paymentMethod || "Method not recorded"} ·{" "}
                      {row.reference || "No reference"} · Recorded by{" "}
                      {row.recordedBy}
                    </p>
                  </div>
                  <strong>{fmt(row.amount)}</strong>
                </div>
                {row.notes && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                    {row.notes}
                  </p>
                )}
                {row.voidedAt && (
                  <p className="mt-3 rounded bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    Voided: {row.voidReason}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className={button} onClick={() => setVoucher(row)}>
                    View {kind === "expense" ? "voucher" : "receipt"}
                  </button>
                  {row.hasAttachment && (
                    <button className={button} onClick={() => download(row)}>
                      Download attachment
                    </button>
                  )}
                  {canWrite && !row.voidedAt && (
                    <button
                      className={button}
                      onClick={() => {
                        setVoidRow(row);
                        setReason("");
                      }}
                    >
                      Correct / void
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!r.data?.items.length && (
            <p className="p-4 text-sm text-slate-500">
              No records in this period.
            </p>
          )}
          <Pager resource={r} page={page} setPage={setPage} />
        </State>
      </section>
      {show && (
        <EntryForm
          kind={kind}
          year={year}
          term={term}
          options={options}
          close={() => setShow(false)}
          saved={() => {
            setShow(false);
            r.refresh();
          }}
        />
      )}
      {voidRow && (
        <Modal
          isOpen
          onClose={() => !busy && setVoidRow(null)}
          title="Correct a recorded transaction"
        >
          <form className="space-y-4" onSubmit={voidEntry}>
            <p>
              {voidRow.number} · {fmt(voidRow.amount)}. This removes the amount
              from active totals and preserves the record.
            </p>
            <Field title="Reason (at least 10 characters)">
              <textarea
                required
                minLength={10}
                maxLength={1000}
                className={input}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <button className={button} disabled={busy}>
              Confirm void
            </button>
          </form>
        </Modal>
      )}
      {category && (
        <Modal
          isOpen
          onClose={() => setCategory(false)}
          title="Expense categories"
        >
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                if (categoryEdit)
                  await apiClient.put(
                    `/api/bursar/categories/${categoryEdit}`,
                    { name: categoryName },
                  );
                else
                  await apiClient.post("/api/bursar/categories", {
                    name: categoryName,
                  });
                setCategoryEdit(null);
                setCategory(false);
                setCategoryName("");
                refreshOptions();
              } catch (e: any) {
                toast.error(
                  e.response?.data?.message || "Could not save category.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="max-h-52 overflow-auto space-y-2">
              {options.categories.map((c: any) => (
                <div
                  key={c.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-slate-200 py-2 dark:border-slate-700"
                >
                  <span>{c.name}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={button}
                      onClick={() => {
                        setCategoryEdit(c.id);
                        setCategoryName(c.name);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await apiClient.put(
                            `/api/bursar/categories/${c.id}`,
                            { archived: true },
                          );
                          setCategory(false);
                          refreshOptions();
                        } catch (e: any) {
                          toast.error(
                            e.response?.data?.message ||
                              "Could not archive category.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">
              Archiving removes a category from new entries and preserves its
              expense history.
            </p>
            <Field
              title={categoryEdit ? "Rename category" : "New category name"}
            >
              <input
                required
                minLength={2}
                maxLength={100}
                className={input}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </Field>
            <button className={button} disabled={busy}>
              Save category
            </button>
          </form>
        </Modal>
      )}
      {voucher && (
        <Modal
          isOpen
          onClose={() => setVoucher(null)}
          title={
            kind === "expense" ? "Expense voucher" : "Other income receipt"
          }
        >
          <button
            className={button}
            onClick={() => printElement("entry-voucher", voucher.number)}
          >
            Print / Save PDF
          </button>
          <div id="entry-voucher" className="mt-4 space-y-3">
            <SchoolHeader
              school={options.school}
              title={
                kind === "expense" ? "Expense Voucher" : "Other Income Receipt"
              }
            />
            {Object.entries({
              Number: voucher.number,
              Date: date(voucher.date),
              Description: voucher.title,
              Amount: fmt(voucher.amount),
              [kind === "expense" ? "Supplier / recipient" : "Received from"]:
                voucher.party,
              Method: voucher.paymentMethod || "Not recorded",
              Reference: voucher.reference || "—",
              "Recorded by": voucher.recordedBy,
              Notes: voucher.notes || "—",
              Status: voucher.voidedAt
                ? `VOIDED: ${voucher.voidReason}`
                : "Recorded",
            }).map(([key, value]) => (
              <p key={key} className="break-words text-sm">
                <strong>{key}: </strong>
                {String(value)}
              </p>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
function EntryForm({ kind, year, term, options, close, saved }: any) {
  const storageKey = `bursar-pending-${kind}`;
  const [form, setForm] = useState<any>({
    requestKey: crypto.randomUUID(),
    title: "",
    amount: "",
    paymentMethod: "CASH",
    entryDate: today(),
    academicYear: year,
    termNumber: term || "1",
    party: "",
    reference: "",
    notes: "",
    categoryId: "",
  });
  const [file, setFile] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState("");
  const set = (key: string, value: string) =>
    setForm((old: any) => ({ ...old, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // Retain only fingerprints and request keys, never payer details or attachment contents.
      const hash = async (value: BufferSource) =>
        Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", value)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      const { requestKey: unused, ...fields } = form;
      const fingerprint = await hash(
        new TextEncoder().encode(
          JSON.stringify({
            ...fields,
            file: file ? await hash(await file.arrayBuffer()) : null,
          }),
        ),
      );
      let journal: any = {};
      try {
        journal = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
      } catch {}
      const requestKey = journal[fingerprint] || form.requestKey;
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ ...journal, [fingerprint]: requestKey }),
      );
      const payload = {
        ...form,
        requestKey,
        categoryId: kind === "expense" ? form.categoryId : undefined,
      };
      let data: any = payload;
      if (kind === "expense") {
        data = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined) data.append(k, String(v));
        });
        if (file) data.append("attachment", file);
      }
      const res = await apiClient.post(
        `/api/bursar/${kind === "expense" ? "expenses" : "income"}`,
        data,
      );
      if (!res.data?.data?.number)
        throw new Error("Could not verify the transaction response.");
      delete journal[fingerprint];
      sessionStorage.setItem(storageKey, JSON.stringify(journal));
      toast.success(`Recorded ${res.data.data.number}`);
      saved();
    } catch (e: any) {
      const message =
        e.response?.data?.message ||
        "The outcome is uncertain. Check history, or retry this same request with the same attachment.";
      setError(message);
      setUncertain(!e.response || e.response.status >= 500);
      if (e.response?.status === 400) {
        setForm((old: any) => ({ ...old, requestKey: crypto.randomUUID() }));
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      onClose={() => !busy && close()}
      title={`Record ${kind === "expense" ? "expense" : "other income"}`}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">
          Record a completed transaction. This does not send money.
        </p>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            {error}
          </div>
        )}
        <fieldset
          disabled={busy || uncertain}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field title="Description">
            <input
              className={input}
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field title="Amount (KES)">
            <input
              className={input}
              type="number"
              min="0.01"
              max="99999999.99"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </Field>
          <Field
            title={
              kind === "expense" ? "Supplier / recipient" : "Received from"
            }
          >
            <input
              className={input}
              required
              minLength={2}
              maxLength={100}
              value={form.party}
              onChange={(e) => set("party", e.target.value)}
            />
          </Field>
          <Field title="Date">
            <input
              className={input}
              type="date"
              required
              max={today()}
              value={form.entryDate}
              onChange={(e) => set("entryDate", e.target.value)}
            />
          </Field>
          <Field title="Academic term">
            <select
              className={input}
              value={`${form.academicYear}:${form.termNumber}`}
              onChange={(e) => {
                const [y, t] = e.target.value.split(":");
                set("academicYear", y);
                set("termNumber", t);
              }}
            >
              {options.terms.map((t: any) => (
                <option key={t.id} value={`${t.year}:${t.termNumber}`}>
                  {t.year} · Term {t.termNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Payment method">
            <select
              className={input}
              value={form.paymentMethod}
              onChange={(e) => set("paymentMethod", e.target.value)}
            >
              {methods.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field title="Reference">
            <input
              className={input}
              required={!["CASH", "OTHER"].includes(form.paymentMethod)}
              maxLength={100}
              value={form.reference}
              onChange={(e) => set("reference", e.target.value)}
            />
          </Field>
          {kind === "expense" && (
            <>
              <Field title="Category">
                <select
                  className={input}
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  required
                >
                  <option value="">Choose category</option>
                  {options.categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field title="Receipt / invoice (PDF, PNG, JPEG · up to 2 MB)">
                <input
                  className={input}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && f.size > 2 * 1024 * 1024) {
                      toast.error("Attachment must be at most 2 MB.");
                      e.target.value = "";
                      return;
                    }
                    setFile(f || null);
                  }}
                />
              </Field>
            </>
          )}
          <Field title="Notes">
            <textarea
              className={input}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className={button}
            disabled={busy || !options.terms.length}
          >
            {busy
              ? "Recording…"
              : uncertain
                ? "Retry same transaction"
                : "Record transaction"}
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={close}
          >
            Close
          </button>
        </div>
        {!options.terms.length && (
          <p role="alert">
            Ask the Head Teacher to configure an academic term first.
          </p>
        )}
      </form>
    </Modal>
  );
}
