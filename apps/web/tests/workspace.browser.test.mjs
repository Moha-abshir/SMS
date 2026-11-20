import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// These tests use synthetic API responses. They never need a database, login,
// email provider, or a real session token. Run after the web production build.
const root = fileURLToPath(new URL('..', import.meta.url));
const origin = 'http://127.0.0.1:4174';
let server;
let browser;
const exam = { id: 'exam-1', title: 'Term examination', status: 'APPROVED' };
const cls = {
  id: 'class-1',
  name: 'Grade 7',
  levelCategory: 'JUNIOR',
  numericOrder: 10,
};
const term = { year: 2026, termNumber: 3 };
const paper = {
  subjectId: 'subject-1',
  subjectName: 'Mathematics',
  subjectCode: 'MATH',
  status: 'DRAFT',
};
const sheet = {
  examination: exam,
  class: cls,
  subject: { id: paper.subjectId, name: paper.subjectName },
  status: 'DRAFT',
  canEdit: true,
  isJunior: true,
  scores: [
    {
      studentId: 'learner-1',
      fullName: 'Aisha Review',
      gender: 'FEMALE',
      marksObtained: 70,
      maxMarks: 100,
      juniorPoints: 6,
      cbcRubricLevel: null,
      teacherRemarks: '',
    },
  ],
  summary: {
    totalStudents: 1,
    scoredStudents: 1,
    averageMark: 70,
    highestMark: 70,
    lowestMark: 70,
  },
};

before(async () => {
  server = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL('./bin/vite.js', import.meta.resolve('vite/package.json')),
      ),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4174',
      '--strictPort',
    ],
    { cwd: root, stdio: 'pipe' },
  );
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {}
    if (server.exitCode !== null)
      throw new Error(
        'The test preview could not start. Build the web app first.',
      );
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (attempt === 99)
      throw new Error('The test preview did not become ready.');
  }
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
    headless: true,
  });
});
after(async () => {
  await browser?.close();
  server?.kill('SIGTERM');
});

async function workspace(role = 'TEACHER', width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    serviceWorkers: 'block',
  });
  await context.addInitScript((roleName) => {
    if (!location.protocol.startsWith('http')) return;
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'test-user',
        firstName: 'Review',
        lastName: 'Teacher',
        roleName,
      }),
    );
    localStorage.setItem('auth_token', 'browser-fixture-only');
  }, role);
  await context.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = [];
    if (path === '/api/settings/public' || path === '/api/settings')
      data = { schoolName: 'Review school', currentAcademicYear: 2026 };
    if (path === '/api/teacher/workstation')
      data = {
        classTeacher: { ...cls, classId: cls.id, className: cls.name },
        subjectAllocations: [],
      };
    if (path === '/api/exams') data = [{ exam, term }];
    if (path === '/api/admissions/classes' || path === '/api/timetable/classes')
      data = [cls];
    const timetableConfig = {
      academicYear: 2026,
      term: 3,
      schoolDays: ['MONDAY'],
      startTime: '08:00',
      endTime: '12:00',
      lessonDurationMinutes: 40,
      breaks: [],
    };
    if (path === '/api/timetable/config') data = timetableConfig;
    if (path === '/api/timetable/teachers')
      data = [{ id: 'test-user', firstName: 'Review', lastName: 'Teacher' }];
    if (path === '/api/timetable/status')
      data = {
        isReady: true,
        totalRequired: 1,
        totalAllocated: 1,
        missing: [],
        unqualified: [],
      };
    if (path === '/api/timetable/teachers/test-user')
      data = {
        teacher: { id: 'test-user' },
        academicYear: 2026,
        term: 3,
        config: timetableConfig,
        periodsGrid: {},
        slots: [],
      };
    if (path === '/api/mark-submissions/classes-overview')
      data = [{ class: cls, papers: [paper] }];
    if (path === '/api/mark-submissions/entry-sheet') data = sheet;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });
  const page = await context.newPage();
  return { context, page };
}

for (const width of [390, 1366])
  test(`cold navigation displays its loading state before code arrives (${width}px)`, async () => {
    const { context, page } = await workspace('HEAD_TEACHER', width);
    let release;
    const hold = new Promise((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(origin + '/letters');
      await page
        .getByRole('heading', { name: 'Official Letters', exact: true })
        .waitFor();
      await page.route('**/assets/SettingsView-*.js', async (route) => {
        await hold;
        await route.continue().catch(() => {});
      });
      if (width < 1024)
        await page
          .getByRole('button', { name: 'Toggle navigation menu' })
          .click();
      await page
        .getByRole('link', { name: 'School Settings', exact: true })
        .click();
      await page
        .getByText('Opening page…', { exact: true })
        .waitFor({ timeout: 1500 });
      assert.equal(new URL(page.url()).pathname, '/settings');
      if (width < 1024)
        await page
          .getByRole('button', { name: 'Toggle navigation menu' })
          .click();
      await page
        .getByRole('link', { name: 'Staff Management', exact: true })
        .waitFor({ state: 'visible' });
    } finally {
      release();
      await context.close();
    }
  });

test('marksheet first open renders learner rows, and a failed request can be retried', async () => {
  const { context, page } = await workspace();
  try {
    await page.goto(origin + '/class-exam-progress');
    await page
      .getByRole('button', { name: 'Review marks', exact: true })
      .click();
    await page.getByText('Aisha Review', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    const pattern = '**/api/mark-submissions/entry-sheet?*';
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Temporary fixture outage',
        }),
      }),
    );
    await page
      .getByRole('button', { name: 'Review marks', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Try again', exact: true })
      .waitFor();
    assert.equal(
      await page.getByText('Aisha Review', { exact: true }).count(),
      0,
    );
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByText('Aisha Review', { exact: true }).waitFor();
  } finally {
    await context.close();
  }
});

test('a malformed timetable payload displays an error instead of an empty schedule', async () => {
  const { context, page } = await workspace('DOS');
  try {
    await page.route('**/api/exams/*/sessions?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { unexpected: 'payload' },
        }),
      }),
    );
    await page.goto(origin + '/exams');
    await page
      .getByRole('button', { name: 'Try again', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('heading', {
          name: 'No papers scheduled for this class',
          exact: true,
        })
        .count(),
      0,
    );
  } finally {
    await context.close();
  }
});

test('teaching timetable resolves the active term and requests the schedule once', async () => {
  const { context, page } = await workspace();
  const requests = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/timetable/teachers/test-user')
      requests.push(url);
  });
  try {
    const loaded = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
        '/api/timetable/teachers/test-user',
    );
    await page.goto(origin + '/timetable');
    await loaded;
    await page.waitForLoadState('networkidle');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].searchParams.get('term'), '3');
    assert.equal(requests[0].searchParams.get('academicYear'), '2026');
  } finally {
    await context.close();
  }
});

test('a failed examiner metadata request shows an error and supports retry', async () => {
  const { context, page } = await workspace('DOS');
  const pattern = '**/api/staff*';
  try {
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Staff directory unavailable',
        }),
      }),
    );
    await page.goto(origin + '/marking-allocations');
    await page
      .getByRole('button', { name: 'Try again', exact: true })
      .waitFor();
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page
      .getByRole('button', { name: 'Try again', exact: true })
      .waitFor({ state: 'hidden' });
  } finally {
    await context.close();
  }
});

test('the CAT search and create controls fit a tablet viewport', async () => {
  const { context, page } = await workspace('TEACHER', 768);
  try {
    await page.route('**/api/cats/teacher-allocations*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            activeTerm: term,
            allocations: [
              {
                classId: 'grade-3',
                className: 'Grade 3',
                subjectId: paper.subjectId,
                subjectName: 'Mathematics Activities',
                subjectCode: 'MATH',
                totalStudents: 1,
                runningCatAverage: null,
                cats: [],
              },
            ],
          },
        }),
      }),
    );
    await page.goto(origin + '/marks-entry');
    await page
      .getByRole('button', {
        name: 'Continuous Assessments (CATs)',
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: 'New CAT', exact: true }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  } finally {
    await context.close();
  }
});
