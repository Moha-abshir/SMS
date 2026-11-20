export interface ExamScheduleConfig {
  dailyStartTime: string;
  dailyEndTime: string;
  breaks: Array<{ name: string; startTime: string; endTime: string }>;
}
export function examTimeMinutes(time: string): number {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error('Use a valid time in HH:mm format.');
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
export function examTimeLabel(minutes: number): string {
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}
export function examTimeRange(time: string) {
  if (typeof time !== 'string')
    throw new Error('A paper start and end time are required.');
  const parts = time.split(/\s*-\s*/);
  if (parts.length !== 2) throw new Error('Use a valid paper time range.');
  const start = examTimeMinutes(parts[0]),
    end = examTimeMinutes(parts[1]);
  if (end <= start) throw new Error('The paper must end after it starts.');
  return { start, end };
}
export function validateExamSchedule(value: unknown): ExamScheduleConfig {
  const config = value as ExamScheduleConfig;
  if (!config || typeof config !== 'object')
    throw new Error(
      'Set examination hours and breaks before editing this timetable.',
    );
  const start = examTimeMinutes(config.dailyStartTime),
    end = examTimeMinutes(config.dailyEndTime);
  if (end <= start)
    throw new Error('Examination closing time must be after opening time.');
  if (!Array.isArray(config.breaks) || config.breaks.length > 20)
    throw new Error('Provide up to 20 examination breaks.');
  const breaks = config.breaks
    .map((b) => {
      if (
        !b ||
        typeof b.name !== 'string' ||
        !b.name.trim() ||
        b.name.trim().length > 100
      )
        throw new Error('Give each examination break a name.');
      const from = examTimeMinutes(b.startTime),
        to = examTimeMinutes(b.endTime);
      if (from < start || to > end || from >= to)
        throw new Error(
          'Breaks must fall inside examination hours and end after they start.',
        );
      return {
        name: b.name.trim(),
        startTime: b.startTime,
        endTime: b.endTime,
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  for (let i = 1; i < breaks.length; i++)
    if (breaks[i].startTime < breaks[i - 1].endTime)
      throw new Error('Examination breaks cannot overlap.');
  return {
    dailyStartTime: config.dailyStartTime,
    dailyEndTime: config.dailyEndTime,
    breaks,
  };
}
export function examTestingIntervals(config: ExamScheduleConfig) {
  const checked = validateExamSchedule(config);
  let start = examTimeMinutes(checked.dailyStartTime);
  const intervals: Array<{ start: number; end: number }> = [];
  for (const pause of checked.breaks) {
    const end = examTimeMinutes(pause.startTime);
    if (end > start) intervals.push({ start, end });
    start = examTimeMinutes(pause.endTime);
  }
  const end = examTimeMinutes(checked.dailyEndTime);
  if (start < end) intervals.push({ start, end });
  return intervals;
}
export function assertExamPaperFits(
  exam: {
    startDate: string | null;
    endDate: string | null;
    scheduleConfig: ExamScheduleConfig | null;
  },
  paper: {
    sessionDate: string;
    sessionTime: string;
    durationMinutes?: number | null;
  },
) {
  const config = validateExamSchedule(exam.scheduleConfig);
  const date = new Date(`${paper.sessionDate}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(paper.sessionDate) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== paper.sessionDate
  )
    throw new Error('Choose a valid examination date.');
  if (
    !exam.startDate ||
    !exam.endDate ||
    paper.sessionDate < exam.startDate ||
    paper.sessionDate > exam.endDate ||
    [0, 6].includes(date.getUTCDay())
  )
    throw new Error('Choose a weekday within this examination period.');
  const { start, end } = examTimeRange(paper.sessionTime);
  if (
    paper.durationMinutes != null &&
    (!Number.isInteger(paper.durationMinutes) ||
      paper.durationMinutes <= 0 ||
      end - start !== paper.durationMinutes)
  )
    throw new Error('The selected time must preserve the full paper duration.');
  if (
    !examTestingIntervals(config).some(
      (window) => start >= window.start && end <= window.end,
    )
  )
    throw new Error(
      'The full paper must fit within examination hours without crossing a break.',
    );
}
