import postgres from 'postgres';
// Explicit destination only. This script performs SELECTs and never repairs business records.
const url = process.env.AUDIT_DATABASE_URL;
if (!url) throw new Error('Set AUDIT_DATABASE_URL to the database to inspect.');
const client = postgres(url, {
  prepare: false,
  ssl: process.env.AUDIT_LOCAL === 'true' ? false : 'require',
  max: 1,
  connect_timeout: 15,
  connection: { default_transaction_read_only: 'on', statement_timeout: 15000 },
});
try {
  const duplicates =
    await client`SELECT 'bills' AS kind,count(*)::int AS records FROM student_bills WHERE deleted_at IS NULL GROUP BY student_id,term_id HAVING count(*)>1 UNION ALL SELECT 'level fees',count(*)::int FROM fee_structures WHERE deleted_at IS NULL AND class_id IS NULL GROUP BY term_id,level_category HAVING count(*)>1 UNION ALL SELECT 'class fees',count(*)::int FROM fee_structures WHERE deleted_at IS NULL AND class_id IS NOT NULL GROUP BY term_id,class_id HAVING count(*)>1`;
  const [unlinked] =
    await client`SELECT count(*)::int AS count FROM fee_payments p LEFT JOIN student_bills b ON b.id=p.bill_id WHERE p.deleted_at IS NULL AND p.is_reversed=false AND (b.id IS NULL OR b.deleted_at IS NOT NULL OR b.student_id<>p.student_id)`;
  const [mismatches] =
    await client`WITH received AS(SELECT bill_id,sum(amount_paid) AS paid FROM fee_payments WHERE is_reversed=false AND deleted_at IS NULL GROUP BY bill_id) SELECT count(*)::int AS count FROM student_bills b LEFT JOIN received p ON p.bill_id=b.id WHERE b.deleted_at IS NULL AND (b.paid_amount<>coalesce(p.paid,0) OR b.balance<>b.net_amount-b.paid_amount OR b.net_amount<>b.billed_amount-b.waiver_amount)`;
  console.log(
    JSON.stringify(
      {
        duplicateGroups: duplicates.length,
        duplicateKinds: duplicates.map((row) => row.kind),
        unlinkedPayments: unlinked.count,
        inconsistentBills: mismatches.count,
      },
      null,
      2,
    ),
  );
  if (duplicates.length || unlinked.count || mismatches.count)
    process.exitCode = 1;
} finally {
  await client.end();
}
