import React from 'react';
import { motion } from 'framer-motion';
import { Printer, X } from 'lucide-react';
import { printElement } from '../../lib/printElement';
import { formatDate } from '../../lib/formatters';

interface ExamTimetablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  className: string;
  sessions: any[];
  breaks: Array<{ name: string; startTime: string; endTime: string }>;
  schoolSettings: any;
}

export const ExamTimetablePrintModal: React.FC<ExamTimetablePrintModalProps> = ({
  isOpen,
  onClose,
  exam,
  className,
  sessions,
  breaks,
  schoolSettings,
}) => {
  if (!isOpen) return null;

  const printDocumentId = 'printable-exam-timetable-sheet';

  // Group sessions by date
  const groupedByDate: Record<string, any[]> = {};
  sessions.forEach((s) => {
    const d = s.session?.sessionDate || 'General';
    if (!groupedByDate[d]) groupedByDate[d] = [];
    groupedByDate[d].push(s);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#162b4d] flex items-center justify-between bg-slate-50/80 dark:bg-[#091326]/80">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              A4 Print Preview — {className} Examination Timetable
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                printElement(
                  printDocumentId,
                  `${schoolSettings?.schoolName || 'Eldoret Muslim Academy'} - ${className} Exam Timetable`
                )
              }
              className="px-3.5 py-1.5 rounded-xl border border-sky-600 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Document
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Sheet Preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-900/50">
          <div
            id={printDocumentId}
            className="p-8 bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm space-y-6 max-w-3xl mx-auto"
          >
            {/* School Header */}
            <div className="text-center border-b-2 border-slate-800 pb-4">
              <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
                {schoolSettings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
              </h1>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                Office of the Director of Studies · Examination Board
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-black uppercase tracking-wider text-slate-800">
                {exam?.title || 'EXAMINATION TIMETABLE'}
              </div>
              <div className="mt-2 text-xs text-slate-600 flex justify-center items-center gap-6 font-semibold">
                <span>
                  <strong>Class:</strong> {className}
                </span>
                <span>
                  <strong>Academic Year:</strong> {schoolSettings?.currentAcademicYear || 2026}
                </span>
                <span>
                  <strong>Term:</strong> Term {schoolSettings?.currentTermNumber || 1}
                </span>
              </div>
            </div>

            {/* Timetable Table */}
            <div>
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300 text-[11px]">
                    <th className="p-2.5 border border-slate-300 w-28">Exam Date</th>
                    <th className="p-2.5 border border-slate-300 w-32">Time Slot</th>
                    <th className="p-2.5 border border-slate-300">Subject Paper</th>
                    <th className="p-2.5 border border-slate-300 w-20 text-center">Duration</th>
                    <th className="p-2.5 border border-slate-300">Supervisor / Invigilator</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map((dateStr) => {
                    const dateSessions = groupedByDate[dateStr];
                    return dateSessions.map((row, idx) => (
                      <tr key={row.session.id} className="border-b border-slate-200">
                        {idx === 0 && (
                          <td
                            rowSpan={dateSessions.length}
                            className="p-2.5 border border-slate-300 font-bold text-slate-800 align-top bg-slate-50/50"
                          >
                            <div>{formatDate(dateStr)}</div>
                          </td>
                        )}
                        <td className="p-2.5 border border-slate-300 font-mono font-bold text-slate-700">
                          {row.session.sessionTime}
                        </td>
                        <td className="p-2.5 border border-slate-300">
                          <span className="font-bold text-slate-900">{row.subject?.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono ml-1.5">({row.subject?.code})</span>
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center font-bold text-slate-600">
                          {row.session.durationMinutes || 60}m
                        </td>
                        <td className="p-2.5 border border-slate-300 font-medium text-slate-700">
                          {row.invigilator
                            ? `${row.invigilator.firstName} ${row.invigilator.lastName}`
                            : 'Allocated Staff'}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>

            {/* Directives to Candidates */}
            <div className="border border-slate-200 bg-slate-50/50 p-3 rounded text-[11px] space-y-1 text-slate-700">
              <p className="font-bold uppercase tracking-wider text-slate-900">Important Instructions to Learners:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                <li>Arrive in the examination room at least <strong>10 minutes</strong> before paper commencement.</li>
                <li>Write your assessment number, full name, and class clearly on every question-and-answer booklet.</li>
                <li>Strictly no unauthorized materials (mobile phones, textbooks, unapproved notes) permitted.</li>
                <li>Stop writing immediately when the final invigilator bell sounds.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-xs">
              <div>
                <div className="border-b border-slate-400 h-10 mb-1" />
                <p className="font-bold text-slate-800">Director of Studies (DoS)</p>
                <p className="text-[10px] text-slate-500">Signature & Date</p>
              </div>

              <div>
                <div className="border-b border-slate-400 h-10 mb-1" />
                <p className="font-bold text-slate-800">Class Teacher</p>
                <p className="text-[10px] text-slate-500">Signature & Date</p>
              </div>

              <div className="flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[7px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none">
                  <span>ELDORET MUSLIM</span>
                  <span>ACADEMY</span>
                  <span className="my-0.5 text-[6px] text-sky-600">★ EXAM OFFICE ★</span>
                  <span>OFFICIAL SEAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
