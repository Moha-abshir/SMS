import { db } from '../../config/db.js';
import {
  academicTerms,
  classes,
  students,
  subjects,
  catAssessments,
  catScores,
  and,
  eq,
  isNull,
  inArray,
  desc,
  asc,
  isNationalExamClass,
} from '@school/shared';
import type { AuthenticatedUser } from '../../middleware/auth.js';
import { summarizeCatPerformance } from './catPerformance.js';
export interface CatPerformanceFilters {
  termId?: string;
  classId?: string;
  subjectId?: string;
  catNumber?: number;
}
export class CatPerformanceService {
  static async getPerformance(
    actor: Pick<AuthenticatedUser, 'roleName'>,
    filters: CatPerformanceFilters,
  ) {
    if (
      !['HEAD_TEACHER', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'DOS'].includes(
        actor.roleName,
      )
    )
      throw Object.assign(
        new Error(
          'Schoolwide CAT performance is available to academic leadership only.',
        ),
        { status: 403 },
      );
    const [terms, schoolClasses] = await Promise.all([
      db
        .select()
        .from(academicTerms)
        .where(isNull(academicTerms.deletedAt))
        .orderBy(desc(academicTerms.year), desc(academicTerms.termNumber)),
      db
        .select({
          id: classes.id,
          name: classes.name,
          numericOrder: classes.numericOrder,
          levelCategory: classes.levelCategory,
        })
        .from(classes)
        .where(isNull(classes.deletedAt))
        .orderBy(asc(classes.numericOrder), asc(classes.name)),
    ]);
    const eligible = schoolClasses.filter(isNationalExamClass);
    const term = filters.termId
      ? terms.find((row) => row.id === filters.termId)
      : terms.find((row) => row.isCurrent) || terms[0] || null;
    if (filters.termId && !term)
      throw Object.assign(new Error('Academic term not found.'), {
        status: 400,
      });
    if (filters.classId && !eligible.some((row) => row.id === filters.classId))
      throw Object.assign(new Error('Choose a CAT cohort: Grade 3, 6 or 9.'), {
        status: 400,
      });
    const selectedClasses = filters.classId
      ? eligible.filter((row) => row.id === filters.classId)
      : eligible;
    const classIds = selectedClasses.map((row) => row.id);
    if (!term || !classIds.length)
      return {
        terms,
        selectedTerm: term,
        filters: { classes: eligible, subjects: [], catNumbers: [] },
        ...summarizeCatPerformance(selectedClasses, [], [], []),
      };
    const [catalog, roster] = await Promise.all([
      db
        .select({
          id: catAssessments.id,
          classId: catAssessments.classId,
          className: classes.name,
          subjectId: catAssessments.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          catNumber: catAssessments.catNumber,
          maxMarks: catAssessments.maxMarks,
        })
        .from(catAssessments)
        .innerJoin(classes, eq(catAssessments.classId, classes.id))
        .innerJoin(subjects, eq(catAssessments.subjectId, subjects.id))
        .where(
          and(
            eq(catAssessments.termId, term.id),
            inArray(
              catAssessments.classId,
              eligible.map((row) => row.id),
            ),
            isNull(catAssessments.deletedAt),
          ),
        )
        .orderBy(
          asc(classes.numericOrder),
          asc(subjects.name),
          asc(catAssessments.catNumber),
        ),
      db
        .select({
          id: students.id,
          classId: students.classId,
          firstName: students.firstName,
          middleName: students.middleName,
          lastName: students.lastName,
          admissionNumber: students.admissionNumber,
          assessmentNumber: students.assessmentNumber,
        })
        .from(students)
        .where(
          and(
            inArray(students.classId, classIds),
            eq(students.status, 'ACTIVE'),
            isNull(students.deletedAt),
          ),
        ),
    ]);
    const selected = catalog.filter(
      (row) =>
        classIds.includes(row.classId) &&
        (!filters.subjectId || row.subjectId === filters.subjectId) &&
        (!filters.catNumber || row.catNumber === filters.catNumber),
    );
    // A level-specific subject must not count learners from grades where it is
    // not assessed as missing. Keep unstarted grades visible for broad views.
    const applicableClasses = filters.subjectId
      ? new Set(
          catalog
            .filter((row) => row.subjectId === filters.subjectId)
            .map((row) => row.classId),
        )
      : new Set(classIds);
    const analysisClasses = selectedClasses.filter((row) =>
      applicableClasses.has(row.id),
    );
    const analysisRoster = roster.filter((row) =>
      applicableClasses.has(row.classId),
    );
    const ids = selected.map((row) => row.id);
    const scores = ids.length
      ? await db
          .select({
            catId: catScores.catId,
            studentId: catScores.studentId,
            marksObtained: catScores.marksObtained,
          })
          .from(catScores)
          .where(
            and(inArray(catScores.catId, ids), isNull(catScores.deletedAt)),
          )
      : [];
    const subjectOptions = [
      ...new Map(
        catalog
          .filter((row) => classIds.includes(row.classId))
          .map((row) => [
            row.subjectId,
            { id: row.subjectId, name: row.subjectName, code: row.subjectCode },
          ]),
      ).values(),
    ];
    return {
      terms,
      selectedTerm: term,
      filters: {
        classes: eligible,
        subjects: subjectOptions,
        catNumbers: [
          ...new Set(
            catalog
              .filter(
                (row) =>
                  classIds.includes(row.classId) &&
                  (!filters.subjectId || row.subjectId === filters.subjectId),
              )
              .map((row) => row.catNumber),
          ),
        ].sort((a, b) => a - b),
      },
      ...summarizeCatPerformance(
        analysisClasses,
        analysisRoster,
        selected,
        scores,
      ),
    };
  }
}
