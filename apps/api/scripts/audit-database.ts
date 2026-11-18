import { getTableName, getTableColumns } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@school/shared';
import { env } from '../src/config/env.js';

// Read-only inspection: identifiers and aggregate metadata only, no learner/guardian records.
const databaseUrl = process.env.AUDIT_DATABASE_URL || env.DATABASE_URL;
const local = ['localhost', '127.0.0.1', '::1'].includes(new URL(databaseUrl).hostname);
const client = postgres(databaseUrl, { ssl: local ? false : 'require', prepare: false, max: 1, connect_timeout: 20 });
try {
  await client.begin('read only', async tx => {
    await tx`SET LOCAL statement_timeout = '15s'`;
    const columns = await tx`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'`;
    const expected = Object.values(schema).filter(value => value && (value as any)[Symbol.for('drizzle:IsDrizzleTable')]);
    const drift = expected.flatMap(table => {
      const name = getTableName(table as any);
      const actual = columns.filter(c => c.table_name === name).map(c => c.column_name);
      const declared = Object.values(getTableColumns(table as any)).map((c: any) => c.name);
      const missing = declared.filter(c => !actual.includes(c));
      const extra = actual.filter(c => !declared.includes(c));
      return missing.length || extra.length ? [{ table: name, missing, extra }] : [];
    });
    console.log(JSON.stringify({ expectedTables: expected.length, actualTables: new Set(columns.map(c => c.table_name)).size, drift }));
    const indexes = await tx`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('attendance_records','cat_scores','exam_scores','mark_submissions','fee_payments','student_bills') ORDER BY 1,2`;
    console.log(JSON.stringify({ indexes }));
    const duplicates = await tx`SELECT 'attendance' AS entity,count(*)::int AS groups FROM (SELECT register_id,student_id FROM attendance_records GROUP BY 1,2 HAVING count(*)>1) x UNION ALL SELECT 'active_bills',count(*)::int FROM (SELECT student_id,term_id FROM student_bills WHERE deleted_at IS NULL GROUP BY 1,2 HAVING count(*)>1) x`;
    console.log(JSON.stringify({ duplicates }));
    const [exam] = await tx`SELECT exam_id FROM exam_scores LIMIT 1`;
    if (exam) {
      const [result] = await tx`EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT student_id,subject_id,marks_obtained FROM exam_scores WHERE exam_id=${exam.exam_id} AND deleted_at IS NULL`;
      const plan = result['QUERY PLAN'][0];
      console.log(JSON.stringify({ examScoreRead: { node: plan.Plan['Node Type'], rows: plan.Plan['Actual Rows'], executionMs: plan['Execution Time'], sharedHits: plan.Plan['Shared Hit Blocks'], sharedReads: plan.Plan['Shared Read Blocks'] } }));
    }
  });
} finally { await client.end(); }
