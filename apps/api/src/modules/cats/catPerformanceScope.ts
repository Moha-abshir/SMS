import type { AuthenticatedUser } from '../../middleware/auth.js';
import { teachingScope } from '../academic-access/teachingScope.js';

export async function catPerformanceScope(
  actor: Pick<AuthenticatedUser, 'id' | 'roleName'>,
) {
  if (actor.roleName === 'DOS')
    return {
      kind: 'SCHOOL' as const,
      classIds: new Set<string>(),
      pairs: new Set<string>(),
      allows: (_classId: string, _subjectId?: string) => true,
    };
  if (actor.roleName !== 'TEACHER')
    throw Object.assign(
      new Error(
        'CAT performance is available to the DoS and assigned class or subject teachers.',
      ),
      { status: 403 },
    );
  const scope = await teachingScope(actor.id);
  const classIds = new Set(scope.managedClasses.map((c) => c.id));
  const pairs = new Set(
    scope.allocations.map((a) => `${a.classId}:${a.subjectId}`),
  );
  const subjectClassIds = new Set(scope.allocations.map((a) => a.classId));
  return {
    kind: classIds.size
      ? ('CLASS_TEACHER' as const)
      : ('SUBJECT_TEACHER' as const),
    classIds,
    pairs,
    allows: (classId: string, subjectId?: string) =>
      classIds.has(classId) ||
      (subjectId
        ? pairs.has(`${classId}:${subjectId}`)
        : subjectClassIds.has(classId)),
  };
}
