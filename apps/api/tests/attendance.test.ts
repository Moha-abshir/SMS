import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { drizzle } from '@school/shared';
import { db } from '../src/config/db.js';
import { AttendanceService } from '../src/modules/attendance/attendance.service.js';

// Explicit isolated database only; never defaults to the application's database.
test('attendance batches preserve IDs, reject invalid rosters, and lock submissions', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const client = postgres(process.env.TEST_DATABASE_URL!, { max: 1 });
  const original = db.transaction;
  const local = drizzle(client);
  const classId = '00000000-0000-4000-8000-000000000001';
  const learner = '00000000-0000-4000-8000-000000000002';
  const teacher = '00000000-0000-4000-8000-000000000003';
  try {
    await client`CREATE TYPE attendance_status AS ENUM ('PRESENT','ABSENT','EXCUSED','LATE')`;
    await client`CREATE TABLE students (id uuid PRIMARY KEY, class_id uuid, deleted_at timestamptz)`;
    await client`CREATE TABLE attendance_registers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid, date date, taken_by_id uuid, is_submitted boolean, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz, UNIQUE(class_id,date))`;
    await client`CREATE TABLE attendance_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), register_id uuid, student_id uuid, status attendance_status, remarks text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), deleted_at timestamptz)`;
    await client`INSERT INTO students VALUES (${learner},${classId},NULL)`;
    db.transaction = local.transaction.bind(local) as any;
    await AttendanceService.saveClassRegister(classId, '2026-11-18', [{ studentId: learner, status: 'PRESENT' }], teacher);
    await assert.rejects(() => AttendanceService.saveClassRegister(classId, '2026-11-18', [], teacher), /locked/);
    const [before] = await client`SELECT id FROM attendance_records`;
    await client`UPDATE attendance_registers SET is_submitted=false`;
    await AttendanceService.saveClassRegister(classId, '2026-11-18', [{ studentId: learner, status: 'LATE' }], teacher);
    const [after] = await client`SELECT id,status FROM attendance_records`;
    assert.equal(after.id, before.id);
    assert.equal(after.status, 'LATE');
    await assert.rejects(() => AttendanceService.saveClassRegister(classId, '2026-11-19', [{ studentId: teacher, status: 'PRESENT' }], teacher), /outside/);
    const [{ count }] = await client`SELECT count(*)::int AS count FROM attendance_registers`;
    assert.equal(count, 1); // invalid roster rolls back the register too
  } finally {
    db.transaction = original;
    await client`DROP TABLE IF EXISTS attendance_records, attendance_registers, students`;
    await client`DROP TYPE IF EXISTS attendance_status`;
    await client.end();
  }
});
