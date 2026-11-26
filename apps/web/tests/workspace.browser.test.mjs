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
const exam = {
  id: 'exam-1',
  title: 'Term examination',
  status: 'APPROVED',
  startDate: '2026-11-23',
  endDate: '2026-11-27',
  scheduleConfig: {
    dailyStartTime: '08:00',
    dailyEndTime: '16:00',
    breaks: [{ name: 'Tea', startTime: '10:30', endTime: '11:00' }],
  },
};
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

async function workspace(role = 'TEACHER', width = 390, roleField = 'roleName') {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    serviceWorkers: 'block',
  });
  await context.addInitScript(({roleName,roleField}) => {
    if (!location.protocol.startsWith('http')) return;
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        id: 'test-user',
        firstName: 'Review',
        lastName: 'Teacher',
        [roleField]:roleName,
      }),
    );
    localStorage.setItem('auth_token', 'browser-fixture-only');
  }, {roleName:role,roleField});
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
        .getByRole('status', { name: 'Loading content' })
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

test('a Friday paper can move to the morning only after an explicit valid time choice', async () => {
  const { context, page } = await workspace('DOS');
  let paper = {
    session: {
      id: 'paper-1',
      examId: exam.id,
      classId: cls.id,
      sessionDate: '2026-11-27',
      sessionTime: '14:30 - 15:15',
      durationMinutes: 45,
    },
    subject: { id: 'subject-1', name: 'Mathematics', code: 'MATH' },
  };
  const writes = [];
  try {
    await page.route('**/api/exams/*/sessions?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [paper] }),
      }),
    );
    await page.route('**/api/exams/sessions/paper-1', (route) => {
      const body = route.request().postDataJSON();
      writes.push(body);
      paper = { ...paper, session: { ...paper.session, ...body } };
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: paper.session }),
      });
    });
    await page.goto(origin + '/exams');
    await page
      .getByRole('button', { name: 'Change date / time', exact: true })
      .click();
    await page.getByLabel('Paper start time', { exact: true }).fill('10:15');
    assert.equal(
      await page
        .getByRole('button', { name: 'Save date & time', exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(writes.length, 0);
    await page.getByLabel('Paper start time', { exact: true }).fill('08:00');
    assert.equal(writes.length, 0);
    await page
      .getByRole('button', { name: 'Save date & time', exact: true })
      .click();
    await page.getByText('08:00 - 08:45', { exact: true }).waitFor();
    assert.deepEqual(writes, [
      { sessionDate: '2026-11-27', sessionTime: '08:00 - 08:45' },
    ]);
  } finally {
    await context.close();
  }
});

test('concluded examinations have no reactivation or publishing controls', async () => {
  const { context, page } = await workspace('DOS');
  try {
    await page.route('**/api/exams', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ exam: { ...exam, status: 'LOCKED' }, term }],
        }),
      }),
    );
    await page.goto(origin + '/exams');
    await page.getByText('Examination concluded', { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: /Reactivate|Return to draft|^Publish$/i })
        .count(),
      0,
    );
    await page
      .getByRole('button', { name: 'New examination', exact: true })
      .waitFor();
  } finally {
    await context.close();
  }
});

function catReport() {
  const classId = 'grade-3',
    common = {
      classId,
      className: 'Grade 3',
      subjectId: 'math',
      subjectName: 'Mathematics',
      subjectCode: 'MATH',
      enrolled: 3,
    };
  const a = {
    ...common,
    id: 'cat-1',
    catNumber: 1,
    maxMarks: 50,
    mean: 25,
    scored: 2,
    missing: 1,
    needsSupport: 1,
    lowest: 0,
    highest: 50,
  };
  const b = {
    ...common,
    id: 'cat-2',
    catNumber: 2,
    maxMarks: 100,
    mean: 70,
    scored: 2,
    missing: 1,
    needsSupport: 1,
    lowest: 40,
    highest: 100,
  };
  const c = {
    ...common,
    id: 'cat-3',
    subjectId: 'science',
    subjectName: 'Science',
    catNumber: 1,
    maxMarks: 100,
    mean: 80,
    scored: 1,
    missing: 2,
    needsSupport: 0,
    lowest: 80,
    highest: 80,
  };
  return {
    terms: [{ id: 'term-1', year: 2026, termNumber: 3, isCurrent: true }],
    selectedTerm: { id: 'term-1' },
    filters: {
      classes: [{ id: classId, name: 'Grade 3' }],
      subjects: [
        { id: 'math', name: 'Mathematics', code: 'MATH' },
        { id: 'science', name: 'Science', code: 'SCI' },
      ],
      catNumbers: [1, 2],
    },
    summary: {
      enrolled: 3,
      assessments: 3,
      scored: 5,
      expected: 9,
      mean: 54,
      learnersAssessed: 2,
      needsSupport: 1,
      invalidScoreCount: 0,
    },
    grades: [
      {
        id: classId,
        name: 'Grade 3',
        mean: 54,
        assessments: 3,
        enrolled: 3,
        scored: 5,
        expected: 9,
        needsSupport: 1,
      },
    ],
    subjects: [
      {
        ...common,
        subjectId: 'science',
        subjectName: 'Science',
        mean: 80,
        scored: 1,
        missing: 2,
        needsSupport: 0,
        assessments: 1,
      },
      {
        ...common,
        mean: 47.5,
        scored: 4,
        missing: 2,
        needsSupport: 1,
        assessments: 2,
      },
    ],
    assessments: [a, b, c],
    supportLearners: [
      {
        studentId: 'learner-1',
        fullName: 'Aisha Review',
        classId,
        className: 'Grade 3',
        admissionNumber: 'A1',
        mean: 20,
        concerns: [
          {
            catId: 'cat-1',
            subjectName: 'Mathematics',
            catNumber: 1,
            percentage: 0,
          },
          {
            catId: 'cat-2',
            subjectName: 'Mathematics',
            catNumber: 2,
            percentage: 40,
          },
        ],
      },
    ],
  };
}
for (const width of [390, 768, 1366])
  test(`CAT analysis and learner results fit ${width}px and keep zero separate from missing`, async () => {
    const { context, page } = await workspace('DOS', width);
    const report = catReport();
    try {
      await page.route('**/api/cats/performance?*', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: report }),
        }),
      );
      await page.route('**/api/cats/cat-1/marksheet*', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              cat: { id: 'cat-1', maxMarks: 50 },
              learners: [
                {
                  studentId: 'learner-1',
                  fullName: 'Aisha Review',
                  marksObtained: 0,
                  percentage: 0,
                  rubric: 'BE',
                },
                {
                  studentId: 'learner-2',
                  fullName: 'Bilal Review',
                  marksObtained: 25,
                  percentage: 50,
                  rubric: 'ME',
                },
                {
                  studentId: 'learner-3',
                  fullName: 'Caroline Review',
                  marksObtained: null,
                  percentage: null,
                  rubric: null,
                },
              ],
            },
          }),
        }),
      );
      await page.goto(origin + '/cat-performance');
      await page
        .getByRole('heading', { name: 'CAT Performance', exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: 'View learners', exact: true })
        .first()
        .click();
      await page.getByText('0 / 50', { exact: true }).waitFor();
      await page
        .getByLabel('Filter CAT learner results', { exact: true })
        .selectOption('MISSING');
      await page.getByText('Caroline Review', { exact: true }).waitFor();
      assert.equal(
        await page.getByText('Aisha Review', { exact: true }).count(),
        0,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page
        .getByRole('button', { name: 'Close dialog', exact: true })
        .click();
      await page
        .getByRole('tab', { name: 'Needs support (1)', exact: true })
        .click();
      await page
        .getByRole('heading', { name: 'Aisha Review', exact: true })
        .waitFor();
      await page
        .getByRole('tab', { name: 'Subject comparison (2)', exact: true })
        .click();
      await page.getByText('47.5%', { exact: true }).waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    } finally {
      await context.close();
    }
  });

test('CAT performance failures have a retry instead of fabricated empty results', async () => {
  const { context, page } = await workspace('DOS');
  const pattern = '**/api/cats/performance?*';
  try {
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Temporary CAT outage',
        }),
      }),
    );
    await page.goto(origin + '/cat-performance');
    await page
      .getByRole('button', { name: 'Try again', exact: true })
      .waitFor();
    await page.unroute(pattern);
    await page.route(pattern, (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: catReport() }),
      }),
    );
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page
      .getByRole('button', { name: 'View learners', exact: true })
      .first()
      .waitFor();
  } finally {
    await context.close();
  }
});

test('older timetables require confirmed hours and breaks before a paper is edited', async () => {
  const { context, page } = await workspace('DOS');
  let stored = { ...exam, scheduleConfig: null };
  const writes = [];
  try {
    await page.route('**/api/exams', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ exam: stored, term }] }),
      }),
    );
    await page.route('**/api/exams/exam-1', (route) => {
      const body = route.request().postDataJSON();
      writes.push(body);
      stored = { ...stored, ...body };
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: stored }),
      });
    });
    await page.route('**/api/exams/*/sessions?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              session: {
                id: 'paper-old',
                examId: exam.id,
                classId: cls.id,
                sessionDate: '2026-11-27',
                sessionTime: '14:30 - 15:15',
                durationMinutes: 45,
              },
              subject: { name: 'Mathematics' },
            },
          ],
        }),
      }),
    );
    await page.goto(origin + '/exams');
    await page
      .getByRole('button', { name: 'Change date / time', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Examination hours & breaks', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: 'Save examination hours', exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(writes.length, 0);
    await page.getByRole('checkbox').check();
    await page
      .getByRole('button', { name: 'Save examination hours', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Change date / time', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Change date / time', exact: true })
      .click();
    await page.getByLabel('Paper start time', { exact: true }).waitFor();
    assert.equal(writes.length, 1);
  } finally {
    await context.close();
  }
});

function personalSubjectReport() {
  return {
    selectedExam: { ...exam, status: 'LOCKED' },
    examsList: [{ ...exam, status: 'LOCKED' }],
    selectedClass: { ...cls, levelCategory: 'UPPER_PRIMARY', isJunior: false },
    selectedSubject: { id: 'phe', name: 'Physical & Health Education (PHE)' },
    teacherAllocations: [
      {
        allocationId: 'class-1:phe',
        classId: cls.id,
        subjectId: 'phe',
        className: 'Grade 6',
        subjectName: 'Physical & Health Education (PHE)',
        subjectCode: 'PHE',
        averageScore: 75,
        rubricOrPointsLabel: 'ME',
        deltaScore: null,
        totalSat: 1,
        proficiencyRate: 100,
      },
    ],
    subjectMetrics: {
      totalSat: 1,
      totalEnrolled: 1,
      averageScore: 75,
      deltaScore: null,
      proficiencyRate: 100,
      remedialCount: 0,
      submissionStatus: 'LOCKED',
      rubricDistribution: { EE: 1 },
      rubricPercentages: { EE: 100 },
    },
    studentsMarksheet: [
      {
        studentId: 'learner-1',
        studentName: 'Aisha Review',
        assessmentNumber: 'KNEC-12345',
        marksObtained: 75,
        rank: 1,
        deltaRank: null,
        deltaMarks: null,
        rubric: 'EE',
        rubricLabel: 'Exceeding expectations',
        remarks: 'Good progress',
        isPending: false,
        isAbsent: false,
      },
    ],
  };
}

for (const width of [390, 768, 1366]) {
  test(`personal subject results show assessment numbers and fit ${width}px`, async () => {
    const { context, page } = await workspace('DEPUTY_HEAD', width);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.route('**/api/dos/subject-performance?*', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: personalSubjectReport(),
          }),
        }),
      );
      await page.goto(origin + '/subject-performance');
      await page
        .getByText('Assessment: KNEC-12345', { exact: true })
        .filter({ visible: true })
        .waitFor();
      if (process.env.UI_REVIEW_DIR)
        await page.screenshot({
          path: `${process.env.UI_REVIEW_DIR}/subject-results-${width}.png`,
          fullPage: true,
        });
      await page
        .getByPlaceholder('Search learner or assessment number...')
        .fill('KNEC-12345');
      await page
        .getByText('Aisha Review', { exact: true })
        .filter({ visible: true })
        .waitFor();
      assert.equal(await page.getByText('Adm:', { exact: false }).count(), 0);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (width < 768)
        assert(await page.locator('article').first().isVisible());
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}

for (const role of ['HEAD_TEACHER', 'DEPUTY_HEAD']) {
  test(`${role} has no CAT performance navigation or direct-page access`, async () => {
    const { context, page } = await workspace(role, 1366);
    try {
      await page.goto(origin + '/cat-performance');
      await page
        .getByRole('heading', { name: 'Permission Denied', exact: true })
        .waitFor();
      assert.equal(await page.locator('a[href="/cat-performance"]').count(), 0);
    } finally {
      await context.close();
    }
  });
}

test('subject teachers can open their scoped CAT report', async () => {
  const { context, page } = await workspace('TEACHER');
  try {
    await page.route('**/api/cats/performance?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { ...catReport(), scope: 'SUBJECT_TEACHER' },
        }),
      }),
    );
    await page.goto(origin + '/cat-performance');
    await page
      .getByText('Follow CAT results for the subjects and classes you teach.', {
        exact: true,
      })
      .waitFor();
    await page
      .getByRole('button', { name: 'View learners', exact: true })
      .first()
      .waitFor();
  } finally {
    await context.close();
  }
});

test('the marksheet closed warning follows the selected examination', async () => {
  const { context, page } = await workspace('DEPUTY_HEAD', 1366);
  try {
    await page.route('**/api/exams?publishedOnly=true', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { exam, term },
            {
              exam: {
                ...exam,
                id: 'closed-exam',
                title: 'Previous examination',
                status: 'LOCKED',
              },
              term,
            },
          ],
        }),
      }),
    );
    await page.goto(origin + '/marks-entry');
    await page.locator('select').first().waitFor();
    assert.equal(
      await page
        .getByText('Examination Score Entry Closed', { exact: true })
        .count(),
      0,
    );
    await page.locator('select').first().selectOption('closed-exam');
    await page
      .getByText(
        'This examination has concluded. Its marksheets are read-only.',
        { exact: false },
      )
      .waitFor();
    await page.locator('select').first().selectOption(exam.id);
    await page
      .getByText('Examination Score Entry Closed', { exact: true })
      .waitFor({ state: 'hidden' });
  } finally {
    await context.close();
  }
});

test('conclusion waits for publication and class forwarding', async () => {
  const { context, page } = await workspace('DOS', 768);
  let allowed = false;
  try {
    await page.route('**/api/exams/exam-1/termination-readiness', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            canConclude: allowed,
            reason: allowed
              ? 'All class marksheets have been forwarded to the Deputy Head.'
              : 'Waiting for 1 class marksheet(s) to be forwarded to the Deputy Head.',
          },
        }),
      }),
    );
    await page.goto(origin + '/exams');
    await page
      .getByText(
        'Waiting for 1 class marksheet(s) to be forwarded to the Deputy Head.',
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole('button', { name: 'Conclude examination', exact: true })
        .isDisabled(),
    );
    allowed = true;
    await page
      .getByRole('button', { name: 'Refresh exam timetable', exact: true })
      .click();
    await page
      .getByText(
        'All class marksheets have been forwarded to the Deputy Head.',
        { exact: true },
      )
      .waitFor();
    assert(
      await page
        .getByRole('button', { name: 'Conclude examination', exact: true })
        .isEnabled(),
    );
  } finally {
    await context.close();
  }
});

test('assessment-number admission field appears only above Grade 3', async () => {
  const { context, page } = await workspace('HEAD_TEACHER', 390);
  try {
    await page.route('**/api/admissions/classes', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'grade3',
              name: 'Grade 3',
              numericOrder: 6,
              levelCategory: 'LOWER_PRIMARY',
            },
            {
              id: 'grade4',
              name: 'Grade 4',
              numericOrder: 7,
              levelCategory: 'UPPER_PRIMARY',
            },
          ],
        }),
      }),
    );
    await page.goto(origin + '/admissions');
    await page
      .getByRole('button', { name: 'New Learner Admission', exact: true })
      .click();
    assert.equal(await page.getByPlaceholder('e.g. 26701004012').count(), 0);
    await page
      .getByRole('button', { name: '-- Select Placement --', exact: false })
      .click();
    await page.getByRole('button', { name: 'Grade 4', exact: false }).click();
    const assessment = page.getByPlaceholder('e.g. 26701004012');
    await assessment.waitFor();
    assert.equal(await assessment.getAttribute('required'), '');
    await page.getByRole('button', { name: 'Grade 4', exact: false }).click();
    await page.getByRole('button', { name: 'Grade 3', exact: false }).click();
    await assessment.waitFor({ state: 'hidden' });
  } finally {
    await context.close();
  }
});

test('self-contained class teachers can explicitly forward their completed class', async () => {
  const { context, page } = await workspace('TEACHER', 390);
  const lower = {
    id: 'pp1',
    name: 'PP1',
    numericOrder: 2,
    levelCategory: 'PPE',
  };
  let forwarded = false;
  try {
    await page.route('**/api/teacher/workstation', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            classTeacher: {
              ...lower,
              classId: lower.id,
              className: lower.name,
            },
            subjectAllocations: [],
          },
        }),
      }),
    );
    await page.route('**/api/mark-submissions/classes-overview?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              class: lower,
              papers: [
                {
                  ...paper,
                  status: forwarded ? 'LOCKED' : 'SUBMITTED',
                  forwardedToDeputyAt: forwarded
                    ? '2026-11-22T08:00:00Z'
                    : null,
                },
              ],
            },
          ],
        }),
      }),
    );
    await page.route(
      '**/api/mark-submissions/classes/pp1/submit-to-deputy',
      (route) => {
        assert.equal(route.request().method(), 'PUT');
        assert.deepEqual(route.request().postDataJSON(), { examId: exam.id });
        forwarded = true;
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      },
    );
    await page.goto(origin + '/class-exam-progress');
    const forward = page.getByRole('button', {
      name: 'Forward to Deputy Head',
      exact: true,
    });
    await page.getByText('Ready to forward', { exact: true }).waitFor();
    assert(await forward.isEnabled());
    await forward.click();
    await page
      .getByRole('button', { name: 'Confirm & forward', exact: true })
      .click();
    await page.getByText('Class marksheet locked', { exact: true }).waitFor();
    assert(forwarded);
    assert(await forward.isDisabled());
  } finally {
    await context.close();
  }
});

async function financeWorkspace(role = 'BURSAR', width = 390) {
  const setup = await workspace(role, width);
  const { page } = setup;
  const requests = [];
  const summary = {
    academicYear: 2026,
    termNumber: 1,
    totalCollected: 100,
    totalBilled: 200,
    totalPaidFromBills: 100,
    totalOutstanding: 100,
    totalCredits: 0,
    totalWaivers: 0,
    totalTransactions: 1,
    methodBreakdown: { CASH: { count: 1, total: 100 } },
    pendingReversalsCount: 1,
    recentPayments: [],
  };
  const learner = {
    student: {
      id: 'learner-finance',
      firstName: 'Aisha',
      lastName: 'Finance',
      assessmentNumber: 'KNEC-FIN',
    },
    class: { name: 'Grade 6' },
    guardian: { fullName: 'Parent Finance' },
  };
  await page.route('**/api/finance/**', (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    let data = {};
    if (url.pathname.endsWith('/summary')) data = summary;
    if (url.pathname.endsWith('/learners')) data = [learner];
    if (url.pathname.endsWith('/billing-preview'))
      data = {
        eligible: 2,
        alreadyBilled: 2,
        newBills: 0,
        totalNewAmount: '0.00',
        missingFeeClasses: [],
        canGenerate: true,
      };
    if (url.pathname.endsWith('/reconciliation'))
      data = { mismatchCount: 0, unlinkedPayments: 0, items: [], limit: 50 };
    if (url.pathname.endsWith('/payments')) {
      const offset = Number(url.searchParams.get('offset') || 0),
        search = url.searchParams.get('search');
      data = {
        items: [
          {
            id: `payment-${offset}`,
            receiptNumber: search ? 'REC-MATCH' : `REC-PAGE-${offset}`,
            amountPaid: '100.00',
            paymentMethod: 'CASH',
            studentFirstName: 'Aisha',
            studentLastName: 'Finance',
            className: 'Grade 6',
            paymentDate: '2026-11-22T08:00:00Z',
            paidBy: 'Parent',
            recordedByFirstName: 'Bursar',
            recordedByLastName: 'Review',
          },
        ],
        total: search ? 1 : 51,
        limit: 25,
        offset,
      };
    }
    if (url.pathname.endsWith('/reversals/pending'))
      data = {
        items: [
          {
            reversalId: 'reversal-fixture',
            receiptNumber: 'REC-REVIEW',
            amountPaid: '100.00',
            studentFirstName: 'Aisha',
            studentLastName: 'Finance',
            className: 'Grade 6',
            reason: 'Wrong learner',
            requestedById: 'requester',
            requestedByFirstName: 'Bursar',
            requestedByLastName: 'Review',
            requestedAt: '2026-11-22T08:00:00Z',
          },
        ],
        hasMore: false,
        offset: 0,
      };
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });
  await page.route('**/api/admissions/students', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [learner] }),
    }),
  );
  return { ...setup, requests, learner };
}

for (const width of [390, 768, 1366])
  test(`finance filters, paginated ledger and bursar review restrictions fit ${width}px`, async () => {
    const { context, page, requests } = await financeWorkspace('BURSAR', width);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(origin + '/finance');
      await page
        .getByRole('heading', { name: 'Term billing', exact: true })
        .waitFor();
      if (process.env.UI_REVIEW_DIR) {
        await page.getByText('0 bill mismatch(es)', { exact: false }).waitFor();
        await page.screenshot({
          path: `${process.env.UI_REVIEW_DIR}/finance-${width}.png`,
          fullPage: true,
        });
      }
      await page
        .getByRole('button', { name: 'Payments Ledger', exact: true })
        .click();
      await page.getByText('REC-PAGE-0', { exact: true }).waitFor();
      await page
        .getByRole('button', { name: 'Next payments', exact: true })
        .click();
      await page.getByText('REC-PAGE-25', { exact: true }).waitFor();
      await page
        .getByPlaceholder('Search receipt #, student, ref code...')
        .fill('match');
      await page.getByText('REC-MATCH', { exact: true }).waitFor();
      assert(requests.some((url) => url.searchParams.get('offset') === '25'));
      assert(
        requests.some(
          (url) =>
            url.searchParams.get('search') === 'match' &&
            url.searchParams.get('offset') === '0',
        ),
      );
      await page.getByLabel('Finance term', { exact: true }).selectOption('2');
      await page.getByText('REC-MATCH', { exact: true }).waitFor();
      assert(
        requests.some(
          (url) =>
            url.pathname.endsWith('/payments') &&
            url.searchParams.get('termNumber') === '2',
        ),
      );
      await page.getByRole('button', { name: /Reversals Queue/ }).click();
      await page
        .getByText('Awaiting independent head teacher review', { exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole('button', { name: 'Approve Reversal', exact: true })
          .count(),
        0,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });

for (const failure of ['NETWORK', 'SERVER'])
  test(`a failed cash request (${failure}) retries with the same key and opens one receipt`, async () => {
    const { context, page } = await financeWorkspace();
    const writes = [];
    try {
      await page.route('**/api/finance/payments', (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        writes.push(route.request().postDataJSON());
        if (writes.length === 1)
          return failure === 'NETWORK'
            ? route.abort('failed')
            : route.fulfill({
                status: 503,
                contentType: 'application/json',
                body: JSON.stringify({
                  success: false,
                  message:
                    'Payment could not be confirmed. Retry the same request.',
                }),
              });
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'accepted-payment',
              studentId: 'learner-finance',
              academicYear: 2026,
              termNumber: 1,
              receiptNumber: 'REC-SAFE-1',
              amountPaid: '100.00',
              paymentMethod: 'CASH',
              studentName: 'Aisha Finance',
              assessmentNumber: 'KNEC-FIN',
              className: 'Grade 6',
              billTitle: 'Term 1 2026',
              paidBy: 'Parent Finance',
              paymentDate: '2026-11-22T08:00:00Z',
            },
          }),
        });
      });
      await page.goto(origin + '/finance');
      await page
        .getByRole('button', { name: 'Record Fee Payment', exact: true })
        .click();
      await page
        .getByPlaceholder('Type student name or KNEC assessment number...')
        .fill('Aisha');
      await page.getByText('Aisha Finance', { exact: true }).click();
      await page.getByPlaceholder('e.g. 5000').fill('100.00');
      await page.getByPlaceholder('e.g. Mary Kemboi').fill('Parent Finance');
      await page
        .getByRole('button', {
          name: 'Confirm & Issue Official Receipt',
          exact: true,
        })
        .click();
      await page
        .getByText('A payment attempt is unresolved.', { exact: false })
        .waitFor();
      await page
        .getByRole('button', {
          name: 'Confirm & Issue Official Receipt',
          exact: true,
        })
        .click();
      await page.getByText('REC-SAFE-1', { exact: true }).first().waitFor();
      assert.equal(writes.length, 2);
      assert.equal(writes[0].requestKey, writes[1].requestKey);
      assert(writes[0].requestKey);
      assert.equal(writes[1].academicYear, 2026);
      assert.equal(writes[1].termNumber, 1);
    } finally {
      await context.close();
    }
  });

test('fee approval reviews exact saved amounts and bursars cannot approve', async () => {
  for (const role of ['BURSAR', 'HEAD_TEACHER']) {
    const { context, page } = await workspace(role, 390);
    const approvals = [];
    try {
      const rate = {
        id: 'rate-one',
        termId: 'term-one',
        levelCategory: 'PPE',
        totalAmount: '6000.00',
        className: null,
      };
      const cell = {
        id: 'rate-one',
        termId: 'term-one',
        amount: 6000,
        approved: false,
      };
      await page.route('**/api/fee-structures?*', (route) =>
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              terms: [{ id: 'term-one', year: 2026, termNumber: 1 }],
              savedRates: [rate],
              matrix: [
                {
                  levelCategory: 'PPE',
                  title: 'Pre-Primary',
                  term1: cell,
                  term2: {
                    id: null,
                    termId: null,
                    amount: null,
                    approved: false,
                  },
                  term3: {
                    id: null,
                    termId: null,
                    amount: null,
                    approved: false,
                  },
                },
              ],
            },
          }),
        }),
      );
      await page.route(
        '**/api/fee-structures/terms/term-one/approve',
        (route) => {
          approvals.push(route.request().postDataJSON());
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        },
      );
      await page.goto(origin + '/fee-structures');
      await page
        .getByLabel('Pre-Primary Term 1 fee', { exact: true })
        .waitFor();
      const approve = page.getByRole('button', {
        name: 'Review & approve Term 1',
        exact: true,
      });
      if (role === 'BURSAR') assert.equal(await approve.count(), 0);
      else {
        await approve.click();
        assert.equal(approvals.length, 0);
        await page.getByText('PPE: KES 6,000', { exact: true }).waitFor();
        await page
          .getByRole('button', { name: 'Confirm fee approval', exact: true })
          .click();
        await page
          .getByRole('heading', {
            name: 'Approve term fee rates?',
            exact: true,
          })
          .waitFor({ state: 'hidden' });
        assert.deepEqual(approvals, [
          { expected: [{ id: 'rate-one', totalAmount: '6000.00' }] },
        ]);
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    } finally {
      await context.close();
    }
  }
});

test('billing generation requires an explicit confirmation', async () => {
  const { context, page } = await financeWorkspace();
  const writes = [];
  try {
    await page.route('**/api/finance/billing-preview?*', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            eligible: 2,
            alreadyBilled: 0,
            newBills: 2,
            totalNewAmount: '14000.00',
            missingFeeClasses: [],
            canGenerate: true,
          },
        }),
      }),
    );
    await page.route('**/api/finance/billing', (route) => {
      writes.push(route.request().postDataJSON());
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { created: 2, alreadyBilled: 0 },
        }),
      });
    });
    await page.goto(origin + '/finance');
    await page
      .getByRole('button', { name: 'Review term bills', exact: true })
      .click();
    assert.equal(writes.length, 0);
    await page
      .getByRole('button', { name: 'Confirm bill generation', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Generate term bills?', exact: true })
      .waitFor({ state: 'hidden' });
    assert.deepEqual(writes, [{ academicYear: 2026, termNumber: 1 }]);
  } finally {
    await context.close();
  }
});

test('finance failures show retry states without inventing zero balances or missing rates', async () => {
  const { context, page } = await financeWorkspace();
  try {
    const pattern = '**/api/finance/summary?*';
    await page.route(pattern, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Finance summary temporarily unavailable',
        }),
      }),
    );
    await page.goto(origin + '/finance');
    await page
      .getByText('Finance summary temporarily unavailable', { exact: true })
      .waitFor();
    assert.equal(await page.getByText('Collected', { exact: true }).count(), 0);
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByText('Collected', { exact: true }).waitFor();
    await page.route('**/api/fee-structures?*', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Fee schedules temporarily unavailable',
        }),
      }),
    );
    await page.goto(origin + '/fee-structures');
    await page
      .getByText('Fee schedules temporarily unavailable', { exact: true })
      .waitFor();
    assert.equal(
      await page.getByText('Term not configured.', { exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByPlaceholder('Enter an explicit amount').count(),
      0,
    );
  } finally {
    await context.close();
  }
});

async function bursarWorkspace(role = 'BURSAR', width = 390) {
  const setup = await workspace(role, width, 'role');
  const opts = {
    classes: [
      { id: 'class-1', name: 'Grade 6', levelCategory: 'UPPER_PRIMARY' },
    ],
    categories: [{ id: 'category-1', name: 'Stationery' }],
    terms: [{ id: 'term-1', year: 2026, termNumber: 1, isCurrent: true }],
    school: { schoolName: 'Test Academy', currentAcademicYear: 2026 },
  };
  const report = {
    collections: '200.00',
    otherIncome: '50.00',
    totalIncome: '250.00',
    totalExpenses: '75.00',
    netPosition: '175.00',
    cashCollections: '200.00',
    daily: [{ date: '2026-01-15', amount: '200.00', count: 1 }],
    methods: [{ method: 'CASH', amount: '200.00', count: 1 }],
    expenseCategories: [{ category: 'Stationery', amount: '75.00', count: 1 }],
    outstanding: { outstanding: '100.00', credits: '20.00', learners: 1 },
    basis: 'Recorded income less expenses.',
  };
  await setup.page.route('**/api/bursar/**', (route) => {
    const url = new URL(route.request().url());
    let data = { items: [], total: 0 };
    if (url.pathname.endsWith('/options')) data = opts;
    if (url.pathname.endsWith('/reports')) data = report;
    if (url.pathname.endsWith('/dashboard'))
      data = {
        ...report,
        today: '200.00',
        week: '200.00',
        month: '200.00',
        paymentsToday: 1,
        recentPayments: [],
        recentExpenses: [],
      };
    if (url.pathname.endsWith('/balances'))
      data = {
        items: [
          {
            id: 'learner-1',
            learnerName: 'Aisha Finance',
            assessmentNumber: 'KNEC-123',
            className: 'Grade 6',
            guardianName: 'Parent Finance',
            expected: '300.00',
            paid: '200.00',
            outstanding: '100.00',
            credit: '0.00',
            status: 'ACTIVE',
            billCount: 1,
          },
        ],
        total: 1,
      };
    return route.fulfill({ json: { success: true, data } });
  });
  return setup;
}
for (const width of [390, 768, 1366]) {
  test(`bursar dashboard, balances, expenses and reports fit ${width}px`, async () => {
    const { context, page } = await bursarWorkspace('BURSAR', width);
    try {
      for (const [path, title, content] of [
        ['/overview', 'Finance Dashboard', 'Selected period collections'],
        ['/learner-balances', 'Learner Balances', 'KNEC-123'],
        ['/outstanding-fees', 'Outstanding Fees', 'KNEC-123'],
        ['/expenses', 'Expenses', 'No records in this period.'],
        ['/other-income', 'Other Income', 'No records in this period.'],
        [
          '/financial-reports',
          'Financial Reports',
          'Income and Expense Report',
        ],
        ['/finance-audit', 'Finance Audit', 'No audit events.'],
      ]) {
        await page.goto(origin + path);
        await page
          .getByRole('heading', { name: title, exact: true, level: 1 })
          .waitFor();
        await page.getByText(content, { exact: true }).first().waitFor();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `overflow on ${path}`,
        );
      }
      await page.goto(origin + '/expenses');
      await page
        .getByRole('button', { name: 'Record expense', exact: true })
        .click();
      await page.getByRole('dialog').waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page
        .getByRole('button', { name: 'Close', exact: true })
        .last()
        .click();
    } finally {
      await context.close();
    }
  });
}
test('Head Teacher sees expense history without bursar write controls', async () => {
  const { context, page } = await bursarWorkspace('HEAD_TEACHER');
  try {
    await page.goto(origin + '/expenses');
    await page
      .getByText('No records in this period.', { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('button', { name: 'Record expense', exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'Manage categories', exact: true })
        .count(),
      0,
    );
  } finally {
    await context.close();
  }
});
test('expense outcome failure retains request key and excludes private details from retry journal', async () => {
  const { context, page } = await bursarWorkspace();
  const keys = [];
  try {
    await page.route('**/api/bursar/expenses', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const body = route.request().postDataBuffer().toString();
      keys.push(body.match(/name="requestKey"\r\n\r\n([^\r]+)/)?.[1]);
      await route.fulfill({
        status: keys.length === 1 ? 503 : 201,
        json:
          keys.length === 1
            ? {
                success: false,
                message: 'Outcome uncertain. Retry the same request.',
              }
            : {
                success: true,
                data: { id: 'expense-1', number: 'VCH-TEST-1' },
              },
      });
    });
    await page.goto(origin + '/expenses');
    await page
      .getByRole('button', { name: 'Record expense', exact: true })
      .click();
    await page
      .getByLabel('Description', { exact: true })
      .fill('Office supplies');
    await page.getByLabel('Amount (KES)', { exact: true }).fill('123.45');
    await page
      .getByLabel('Supplier / recipient', { exact: true })
      .fill('Private supplier');
    await page
      .getByRole('combobox', { name: 'Category', exact: true })
      .selectOption('category-1');
    await page
      .getByRole('button', { name: 'Record transaction', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Retry same transaction', exact: true })
      .waitFor();
    const journal = await page.evaluate(() =>
      sessionStorage.getItem('bursar-pending-expense'),
    );
    assert.ok(journal);
    assert.equal(journal.includes('Private supplier'), false);
    await page
      .getByRole('button', { name: 'Retry same transaction', exact: true })
      .click();
    await page.getByText('Recorded VCH-TEST-1', { exact: true }).waitFor();
    assert.equal(keys.length, 2);
    assert.ok(keys[0]);
    assert.equal(keys[0], keys[1]);
  } finally {
    await context.close();
  }
});

for (const width of [390, 768, 1366]) {
  test(`finance loading keeps one layout skeleton through metadata and dashboard requests (${width}px)`, async () => {
    const { context, page } = await bursarWorkspace('BURSAR', width);
    let releaseOptions, releaseDashboard;
    const optionsGate = new Promise(resolve => { releaseOptions = resolve; });
    const dashboardGate = new Promise(resolve => { releaseDashboard = resolve; });
    try {
      await page.route('**/api/bursar/options', async route => { await optionsGate; await route.fallback(); });
      await page.route('**/api/bursar/dashboard?*', async route => { await dashboardGate; await route.fallback(); });
      await page.goto(origin + '/overview');
      await page.getByRole('heading', { name: 'Finance Dashboard', exact: true }).waitFor();
      await page.locator('[data-skeleton-layout="dashboard"]').waitFor();
      assert.equal(await page.getByRole('status', { name: 'Loading content' }).count(), 1);
      assert.equal(await page.getByText('Loading finance records…', { exact: true }).count(), 0);
      assert.equal(await page.locator('.animate-spin').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (process.env.UI_REVIEW_DIR) await page.screenshot({path: `${process.env.UI_REVIEW_DIR}/loading-${width}.png`,fullPage:true});
      releaseOptions();
      await page.getByRole('combobox', { name: 'Academic year', exact: true }).waitFor();
      assert.equal(await page.getByRole('status', { name: 'Loading content' }).count(), 1);
      assert.equal(await page.getByRole('heading', { name: 'Finance Dashboard', exact: true }).count(), 1);
      releaseDashboard();
      await page.getByText('Selected period collections', { exact: true }).waitFor();
      assert.equal(await page.getByRole('status', { name: 'Loading content' }).count(), 0);
    } finally {
      releaseOptions(); releaseDashboard(); await context.close();
    }
  });
}

test('finance metadata placeholders match each destination layout', async () => {
  for (const [path, title, layout] of [
    ['/learner-balances', 'Learner Balances', 'table'],
    ['/outstanding-fees', 'Outstanding Fees', 'table'],
    ['/expenses', 'Expenses', 'cards'],
    ['/other-income', 'Other Income', 'cards'],
    ['/financial-reports', 'Financial Reports', 'report'],
    ['/finance-audit', 'Finance Audit', 'audit'],
  ]) {
    const {context, page} = await bursarWorkspace();
    let release;
    const gate = new Promise(resolve => {release = resolve;});
    try {
      await page.route('**/api/bursar/options', async route => {await gate; await route.fallback().catch(() => {});});
      await page.goto(origin + path);
      await page.getByRole('heading', {name:title, exact:true, level:1}).waitFor();
      await page.locator(`[data-skeleton-layout="${layout}"]`).waitFor();
      assert.equal(await page.getByRole('status', {name:'Loading content'}).count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      release();
      await page.getByRole('combobox', {name:'Academic year', exact:true}).waitFor();
    } finally {release(); await context.close();}
  }
});
