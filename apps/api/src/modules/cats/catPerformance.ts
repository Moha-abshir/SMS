export interface PerformanceClass {
  id: string;
  name: string;
  numericOrder: number;
  levelCategory: string;
}
export interface PerformanceLearner {
  id: string;
  classId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  admissionNumber: string | null;
  assessmentNumber: string;
}
export interface PerformanceCat {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  catNumber: number;
  maxMarks: number;
}
export interface PerformanceScore {
  catId: string;
  studentId: string;
  marksObtained: string | number | null;
}

/** One pass over recorded scores. Missing marks are never converted into zero. */
export function summarizeCatPerformance(
  classes: PerformanceClass[],
  learners: PerformanceLearner[],
  cats: PerformanceCat[],
  scores: PerformanceScore[],
) {
  const classNames = new Map(classes.map((cls) => [cls.id, cls.name]));
  const roster = new Map(learners.map((learner) => [learner.id, learner]));
  const enrolled = new Map<string, number>();
  for (const learner of learners)
    enrolled.set(learner.classId, (enrolled.get(learner.classId) || 0) + 1);
  const assessments = new Map(
    cats.map((cat) => [
      cat.id,
      {
        ...cat,
        enrolled: enrolled.get(cat.classId) || 0,
        scored: 0,
        sum: 0,
        needsSupport: 0,
        highest: null as number | null,
        lowest: null as number | null,
        rubrics: { EE: 0, ME: 0, AE: 0, BE: 0 },
      },
    ]),
  );
  const subjects = new Map<
    string,
    {
      classId: string;
      className: string;
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      sum: number;
      scored: number;
      expected: number;
      atRisk: Set<string>;
      assessments: number;
    }
  >();
  for (const cat of cats) {
    const key = `${cat.classId}:${cat.subjectId}`;
    if (!subjects.has(key))
      subjects.set(key, {
        classId: cat.classId,
        className: cat.className,
        subjectId: cat.subjectId,
        subjectName: cat.subjectName,
        subjectCode: cat.subjectCode,
        sum: 0,
        scored: 0,
        expected: 0,
        atRisk: new Set(),
        assessments: 0,
      });
    const row = subjects.get(key)!;
    row.expected += enrolled.get(cat.classId) || 0;
    row.assessments++;
  }
  const learnerStats = new Map<
    string,
    {
      learner: PerformanceLearner;
      sum: number;
      count: number;
      concerns: Array<{
        catId: string;
        subjectName: string;
        catNumber: number;
        percentage: number;
      }>;
    }
  >();
  const seen = new Set<string>();
  let invalidScoreCount = 0;
  for (const score of scores) {
    const cat = assessments.get(score.catId),
      learner = roster.get(score.studentId);
    if (!cat || !learner || learner.classId !== cat.classId) continue;
    if (
      score.marksObtained === null ||
      score.marksObtained === undefined ||
      String(score.marksObtained).trim() === ''
    )
      continue;
    const marks = Number(score.marksObtained),
      key = `${score.catId}:${score.studentId}`;
    if (
      seen.has(key) ||
      !Number.isFinite(marks) ||
      !Number.isFinite(cat.maxMarks) ||
      cat.maxMarks <= 0 ||
      marks < 0 ||
      marks > cat.maxMarks
    ) {
      invalidScoreCount++;
      continue;
    }
    seen.add(key);
    const percentage = (marks / cat.maxMarks) * 100;
    cat.scored++;
    cat.sum += percentage;
    cat.highest = Math.max(cat.highest ?? percentage, percentage);
    cat.lowest = Math.min(cat.lowest ?? percentage, percentage);
    cat.rubrics[
      percentage >= 75
        ? 'EE'
        : percentage >= 50
          ? 'ME'
          : percentage >= 40
            ? 'AE'
            : 'BE'
    ]++;
    const subject = subjects.get(`${cat.classId}:${cat.subjectId}`)!;
    subject.sum += percentage;
    subject.scored++;
    if (!learnerStats.has(learner.id))
      learnerStats.set(learner.id, { learner, sum: 0, count: 0, concerns: [] });
    const learnerRow = learnerStats.get(learner.id)!;
    learnerRow.sum += percentage;
    learnerRow.count++;
    if (percentage < 50) {
      cat.needsSupport++;
      subject.atRisk.add(learner.id);
      learnerRow.concerns.push({
        catId: cat.id,
        subjectName: cat.subjectName,
        catNumber: cat.catNumber,
        percentage: round(percentage),
      });
    }
  }
  const assessmentRows = [...assessments.values()].map(({ sum, ...row }) => ({
    ...row,
    mean: row.scored ? round(sum / row.scored) : null,
    highest: row.highest === null ? null : round(row.highest),
    lowest: row.lowest === null ? null : round(row.lowest),
    missing: Math.max(0, row.enrolled - row.scored),
  }));
  const subjectRows = [...subjects.values()]
    .map(({ sum, atRisk, ...row }) => ({
      ...row,
      mean: row.scored ? round(sum / row.scored) : null,
      needsSupport: atRisk.size,
      missing: Math.max(0, row.expected - row.scored),
    }))
    .sort(
      (a, b) =>
        (b.mean ?? -1) - (a.mean ?? -1) ||
        a.subjectName.localeCompare(b.subjectName),
    );
  const supportLearners = [...learnerStats.values()]
    .filter((row) => row.concerns.length)
    .map(({ learner, sum, count, concerns }) => ({
      studentId: learner.id,
      fullName: [learner.firstName, learner.middleName, learner.lastName]
        .filter(Boolean)
        .join(' '),
      classId: learner.classId,
      className: classNames.get(learner.classId) || '',
      admissionNumber: learner.admissionNumber,
      assessmentNumber: learner.assessmentNumber,
      mean: round(sum / count),
      concerns,
    }))
    .sort((a, b) => a.mean - b.mean || a.fullName.localeCompare(b.fullName));
  const gradeRows = classes.map((cls) => {
    const records = assessmentRows.filter((row) => row.classId === cls.id);
    const recorded = records.reduce((sum, row) => sum + row.scored, 0);
    const total = [...assessments.values()]
      .filter((row) => row.classId === cls.id)
      .reduce((sum, row) => sum + row.sum, 0);
    return {
      ...cls,
      enrolled: enrolled.get(cls.id) || 0,
      assessments: records.length,
      scored: recorded,
      expected: records.reduce((sum, row) => sum + row.enrolled, 0),
      mean: recorded ? round(total / recorded) : null,
      needsSupport: supportLearners.filter((row) => row.classId === cls.id)
        .length,
    };
  });
  const recorded = [...assessments.values()].reduce(
      (sum, row) => sum + row.scored,
      0,
    ),
    sum = [...assessments.values()].reduce((sum, row) => sum + row.sum, 0);
  return {
    summary: {
      enrolled: learners.length,
      assessments: cats.length,
      scored: recorded,
      expected: assessmentRows.reduce((sum, row) => sum + row.enrolled, 0),
      mean: recorded ? round(sum / recorded) : null,
      learnersAssessed: learnerStats.size,
      needsSupport: supportLearners.length,
      invalidScoreCount,
    },
    grades: gradeRows,
    subjects: subjectRows,
    assessments: assessmentRows,
    supportLearners,
  };
}
const round = (n: number) => Math.round(n * 100) / 100;
