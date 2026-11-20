import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCatPerformance } from '../src/modules/cats/catPerformance.js';
const cls = {
  id: 'g3',
  name: 'Grade 3',
  levelCategory: 'LOWER_PRIMARY',
  numericOrder: 6,
};
const learners = ['Amina', 'Bilal', 'Caroline'].map((name, i) => ({
  id: `s${i}`,
  classId: cls.id,
  firstName: name,
  middleName: null,
  lastName: 'Test',
  admissionNumber: null,
  assessmentNumber: `A${i}`,
}));
const cats = [
  {
    id: 'a',
    classId: cls.id,
    className: cls.name,
    subjectId: 'math',
    subjectName: 'Maths',
    subjectCode: 'MATH',
    catNumber: 1,
    maxMarks: 50,
  },
  {
    id: 'b',
    classId: cls.id,
    className: cls.name,
    subjectId: 'math',
    subjectName: 'Maths',
    subjectCode: 'MATH',
    catNumber: 2,
    maxMarks: 100,
  },
];
test('CAT means normalize maxima, include zero, exclude missing, and count support learners once', () => {
  const result = summarizeCatPerformance([cls], learners, cats, [
    { catId: 'a', studentId: 's0', marksObtained: 0 },
    { catId: 'a', studentId: 's1', marksObtained: '25' },
    { catId: 'a', studentId: 's2', marksObtained: null },
    { catId: 'b', studentId: 's0', marksObtained: '40' },
    { catId: 'b', studentId: 's1', marksObtained: '100' },
  ]);
  assert.equal(result.assessments[0].mean, 25);
  assert.equal(result.assessments[0].scored, 2);
  assert.equal(result.assessments[0].missing, 1);
  assert.equal(result.assessments[1].mean, 70);
  assert.equal(result.summary.mean, 47.5);
  assert.equal(result.subjects[0].mean, 47.5);
  assert.equal(result.summary.needsSupport, 1);
  assert.equal(result.summary.learnersAssessed, 2);
  assert.equal(result.summary.expected, 6);
  assert.equal(result.summary.scored, 4);
  assert.equal(result.supportLearners[0].concerns.length, 2);
  assert.equal(result.assessments[0].rubrics.BE, 1);
  assert.equal(result.assessments[0].rubrics.ME, 1);
});
test('foreign-class, deleted/missing and corrupt scores cannot contaminate cohort statistics', () => {
  const result = summarizeCatPerformance([cls], learners, cats, [
    { catId: 'a', studentId: 'other-student', marksObtained: 100 },
    { catId: 'a', studentId: 's0', marksObtained: -1 },
    { catId: 'a', studentId: 's1', marksObtained: 51 },
    { catId: 'b', studentId: 's0', marksObtained: 'NaN' },
    { catId: 'b', studentId: 's1', marksObtained: '' },
  ]);
  assert.equal(result.summary.mean, null);
  assert.equal(result.summary.scored, 0);
  assert.equal(result.summary.needsSupport, 0);
  assert.equal(result.summary.invalidScoreCount, 3);
  const empty = summarizeCatPerformance([cls], learners, [], []);
  assert.equal(empty.grades[0].mean, null);
  assert.equal(empty.summary.enrolled, 3);
  assert.equal(empty.summary.assessments, 0);
});
