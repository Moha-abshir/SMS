import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, School, Calendar, Clock, BookOpen, User } from 'lucide-react';

interface TimetableSlotItem {
  id: string;
  dayOfWeek: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectCode: string;
  teacherFirstName?: string;
  teacherLastName?: string;
  className?: string;
  isDoubleLesson?: boolean;
  doubleLessonPart?: number | null;
}

interface PeriodGridDef {
  index: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  breakName?: string;
}

interface TimetablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  schoolName: string;
  logoUrl?: string | null;
  academicYear: number;
  term: number;
  periodsGrid: Record<string, PeriodGridDef[]>;
  slots: TimetableSlotItem[];
  schoolDays?: string[];
  viewType: 'class' | 'teacher' | 'master';
  classes?: Array<{ id: string; name: string }>;
}

export const TimetablePrintModal: React.FC<TimetablePrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  schoolName,
  logoUrl,
  academicYear,
  term,
  periodsGrid,
  slots,
  schoolDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  viewType,
  classes = [],
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Group slots by day and period
  // For class or teacher view: key = `${day}_${periodIndex}`
  const slotsMap = new Map<string, TimetableSlotItem>();
  // For master view: key = `${classId}_${day}_${periodIndex}`
  const masterSlotsMap = new Map<string, TimetableSlotItem>();

  slots.forEach((s) => {
    slotsMap.set(`${s.dayOfWeek}_${s.periodIndex}`, s);
    if ((s as any).classId) {
      masterSlotsMap.set(`${(s as any).classId}_${s.dayOfWeek}_${s.periodIndex}`, s);
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="relative w-full max-w-6xl max-h-[96vh] flex flex-col bg-white dark:bg-[#091326] rounded-2xl shadow-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden my-auto"
          >
            {/* Modal Controls Header (Hidden during Print) */}
            <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b172e] shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base sm:text-lg">
                  Print Preview: Official Timetable (A4 Landscape)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Timetable
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div
              ref={printAreaRef}
              className="printable-sheet flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 print:p-0 print:m-0 print:overflow-visible print:w-full"
            >
              <style>{`
                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 8mm;
                  }
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  .print\\:hidden {
                    display: none !important;
                  }
                  .printable-sheet {
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                  }
                }
              `}</style>

              {/* Official School Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border border-slate-300 flex items-center justify-center bg-slate-50">
                      <School className="w-8 h-8 text-slate-700" />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                      {schoolName}
                    </h1>
                    <div className="text-sm font-semibold text-slate-700 mt-0.5">
                      {title} {subtitle ? `— ${subtitle}` : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs font-medium text-slate-600 space-y-0.5">
                  <div>
                    <span className="font-bold text-slate-900">Academic Year:</span> {academicYear}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Term:</span> Term {term}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Printed:</span>{' '}
                    {new Date().toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>

              {/* Grid Rendering */}
              {viewType !== 'master' ? (
                /* Class or Teacher Weekly Timetable (Standard Row = Day, Col = Periods) */
                <div className="overflow-x-auto">
                  {schoolDays.map((day) => {
                    const daySlots = periodsGrid[day] || [];
                    if (daySlots.length === 0) return null;

                    return (
                      <div key={day} className="mb-4 break-inside-avoid">
                        <div className="bg-slate-100 border border-slate-300 px-3 py-1 font-bold text-xs uppercase tracking-wide text-slate-800">
                          {day}
                        </div>
                        <div className="grid grid-cols-8 gap-1 mt-1">
                          {daySlots.map((p) => {
                            if (p.isBreak) {
                              return (
                                <div
                                  key={`${day}-break-${p.index}`}
                                  className="border border-dashed border-slate-300 bg-amber-50/50 p-2 text-center rounded flex flex-col justify-center min-h-[64px]"
                                >
                                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                                    {p.breakName}
                                  </span>
                                  <span className="text-[9px] text-slate-500">
                                    {p.startTime} - {p.endTime}
                                  </span>
                                </div>
                              );
                            }

                            const slot = slotsMap.get(`${day}_${p.index}`);

                            return (
                              <div
                                key={`${day}-p-${p.index}`}
                                className={`border p-2 rounded flex flex-col justify-between min-h-[64px] ${
                                  slot
                                    ? 'border-slate-300 bg-white'
                                    : 'border-slate-200 bg-slate-50/50 text-slate-400'
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9px] text-slate-500 font-medium">
                                  <span>P{p.index}</span>
                                  <span>{p.startTime}</span>
                                </div>

                                {slot ? (
                                  <div className="my-1">
                                    <div className="font-bold text-xs text-slate-900 leading-tight">
                                      {slot.subjectName}
                                    </div>
                                    <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                                      {viewType === 'teacher'
                                        ? slot.className
                                        : `${slot.teacherFirstName || ''} ${slot.teacherLastName || ''}`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400 italic text-center py-2">
                                    Free Period
                                  </div>
                                )}

                                <div className="text-[9px] text-slate-400 text-right">
                                  {p.endTime}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Master Grid (Class-by-Class Table per Day) */
                <div className="space-y-6">
                  {schoolDays.map((day) => {
                    const daySlots = periodsGrid[day] || [];
                    if (daySlots.length === 0) return null;

                    return (
                      <div key={day} className="break-inside-avoid">
                        <div className="bg-slate-800 text-white font-bold px-3 py-1.5 text-xs uppercase tracking-wider">
                          {day} Schedule — Upper Primary & Junior Secondary
                        </div>
                        <table className="w-full border-collapse border border-slate-300 text-xs mt-1">
                          <thead>
                            <tr className="bg-slate-100 text-slate-800 font-semibold">
                              <th className="border border-slate-300 p-1.5 text-left w-24">Class</th>
                              {daySlots.map((p) => (
                                <th
                                  key={p.index}
                                  className={`border border-slate-300 p-1 text-center ${
                                    p.isBreak ? 'bg-amber-100 text-amber-900 text-[10px]' : ''
                                  }`}
                                >
                                  {p.isBreak ? (
                                    <div>{p.breakName}</div>
                                  ) : (
                                    <>
                                      <div>P{p.index}</div>
                                      <div className="text-[9px] font-normal text-slate-600">
                                        {p.startTime}-{p.endTime}
                                      </div>
                                    </>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {classes.map((cls) => (
                              <tr key={cls.id} className="hover:bg-slate-50">
                                <td className="border border-slate-300 p-1.5 font-bold text-slate-900 bg-slate-50">
                                  {cls.name}
                                </td>
                                {daySlots.map((p) => {
                                  if (p.isBreak) {
                                    return (
                                      <td
                                        key={p.index}
                                        className="border border-slate-300 p-1 text-center bg-amber-50/50 text-[10px] text-amber-800 italic"
                                      >
                                        —
                                      </td>
                                    );
                                  }

                                  const slot = masterSlotsMap.get(`${cls.id}_${day}_${p.index}`);

                                  return (
                                    <td
                                      key={p.index}
                                      className={`border border-slate-300 p-1 text-center align-top ${
                                        slot ? 'bg-white' : 'bg-slate-50/30'
                                      }`}
                                    >
                                      {slot ? (
                                        <div className="leading-tight">
                                          <div className="font-semibold text-slate-900">
                                            {slot.subjectCode || slot.subjectName}
                                          </div>
                                          <div className="text-[9px] text-slate-600 truncate mt-0.5">
                                            {slot.teacherLastName || slot.teacherFirstName}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-slate-300 text-[10px]">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer Note */}
              <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                <span>Eldoret Muslim Academy Timetable System • Grades 4 to 9</span>
                <span>Approved by Deputy Headteacher</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
