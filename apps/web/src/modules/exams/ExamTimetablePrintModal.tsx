import React from 'react';
import { motion } from 'framer-motion';
import { Printer, X } from 'lucide-react';
import { parseISO, format } from 'date-fns';
import { printElement } from '../../lib/printElement';

interface ExamTimetablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: any;
  term?: any;
  className: string;
  sessions: any[];
  breaks?: Array<{ name: string; startTime: string; endTime: string }>;
  schoolSettings: any;
}

export const ExamTimetablePrintModal: React.FC<ExamTimetablePrintModalProps> = ({
  isOpen,
  onClose,
  exam,
  term,
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

  // Extract class invigilator (uniform across sessions for this class)
  const classInvigilator = sessions.find((s) => s.invigilator)?.invigilator;
  const invigilatorName = classInvigilator
    ? `${classInvigilator.firstName} ${classInvigilator.lastName}`.trim()
    : 'Allocated Staff';

  const academicYear = term?.year || exam?.term?.year || schoolSettings?.currentAcademicYear || 2026;
  const termNumber = term?.termNumber || exam?.term?.termNumber || schoolSettings?.currentTermNumber || 1;
  const examTitle = exam?.title || 'EXAMINATION TIMETABLE';

  const formatDateAndDay = (dStr: string) => {
    try {
      const d = parseISO(dStr);
      if (!isNaN(d.getTime())) {
        return {
          day: format(d, 'EEEE'),
          formattedDate: format(d, 'dd/MM/yyyy'),
        };
      }
    } catch (e) {}
    return {
      day: 'Exam Day',
      formattedDate: dStr,
    };
  };

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
            className="p-8 bg-white border border-slate-300 rounded-xl text-black shadow-sm space-y-4 max-w-3xl mx-auto"
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {/* Embedded styles to guarantee solid black grid cells and crisp print styling */}
            <style>{`
              #${printDocumentId} table {
                width: 100% !important;
                border-collapse: collapse !important;
                border: 1.5px solid #000000 !important;
              }
              #${printDocumentId} th,
              #${printDocumentId} td {
                border: 1px solid #000000 !important;
                padding: 8px 12px !important;
                color: #000000 !important;
              }
              #${printDocumentId} th {
                background-color: #f1f5f9 !important;
                font-weight: 800 !important;
                text-transform: uppercase !important;
                font-size: 10pt !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            `}</style>

            {/* School Header */}
            <div className="text-center border-b-2 border-black pb-3">
              <h1 className="text-xl font-black uppercase tracking-wider text-black">
                {schoolSettings?.schoolName || 'ELDORET MUSLIM ACADEMY'}
              </h1>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-700 mt-0.5">
                Office of the Director of Studies · Examination Board
              </p>
              <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-black rounded text-xs font-black uppercase tracking-wider text-black">
                {examTitle}
              </div>
            </div>

            {/* Metadata Bar: Grade, Academic Year, Term on Left; Invigilator at Top Right */}
            <div className="flex flex-row items-end justify-between border-b border-black pb-2 text-xs">
              <div className="flex items-center gap-3 text-black">
                <span>
                  <strong>Grade:</strong> <span className="font-bold">{className}</span>
                </span>
                <span>•</span>
                <span>
                  <strong>Academic Year:</strong> <span className="font-bold">{academicYear}</span>
                </span>
                <span>•</span>
                <span>
                  <strong>Term:</strong> <span className="font-bold">Term {termNumber}</span>
                </span>
              </div>
              <div className="text-right text-black">
                <span className="text-slate-600 font-semibold">Class Invigilator: </span>
                <span className="font-black text-black underline decoration-black decoration-1 underline-offset-2">
                  {invigilatorName}
                </span>
              </div>
            </div>

            {/* Timetable Table Guided within Grid Cells */}
            <div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1.5px solid #000000',
                  fontSize: '10.5pt',
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1.5px solid #000000',
                      textAlign: 'left',
                    }}
                  >
                    <th
                      style={{
                        border: '1px solid #000000',
                        padding: '8px 12px',
                        width: '24%',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        fontSize: '10pt',
                        color: '#000000',
                      }}
                    >
                      Date & Day
                    </th>
                    <th
                      style={{
                        border: '1px solid #000000',
                        padding: '8px 12px',
                        width: '24%',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        fontSize: '10pt',
                        color: '#000000',
                      }}
                    >
                      Time Slot
                    </th>
                    <th
                      style={{
                        border: '1px solid #000000',
                        padding: '8px 12px',
                        width: '40%',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        fontSize: '10pt',
                        color: '#000000',
                      }}
                    >
                      Subject Paper
                    </th>
                    <th
                      style={{
                        border: '1px solid #000000',
                        padding: '8px 12px',
                        width: '12%',
                        textAlign: 'center',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        fontSize: '10pt',
                        color: '#000000',
                      }}
                    >
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDates.map((dateStr) => {
                    const dateSessions = groupedByDate[dateStr];
                    const { day, formattedDate } = formatDateAndDay(dateStr);

                    return dateSessions.map((row, idx) => (
                      <tr key={row.session.id}>
                        {idx === 0 && (
                          <td
                            rowSpan={dateSessions.length}
                            style={{
                              border: '1px solid #000000',
                              padding: '8px 12px',
                              verticalAlign: 'top',
                              backgroundColor: '#fafafa',
                            }}
                          >
                            <div style={{ fontWeight: 800, color: '#000000', fontSize: '10.5pt' }}>
                              {day}
                            </div>
                            <div style={{ fontSize: '9.5pt', color: '#333333', marginTop: '2px', fontWeight: 600 }}>
                              {formattedDate}
                            </div>
                          </td>
                        )}
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '8px 12px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#000000',
                            verticalAlign: 'middle',
                            fontSize: '10pt',
                          }}
                        >
                          {row.session.sessionTime}
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '8px 12px',
                            verticalAlign: 'middle',
                          }}
                        >
                          <span style={{ fontWeight: 800, color: '#000000' }}>{row.subject?.name}</span>
                          {row.subject?.code && (
                            <span
                              style={{
                                fontSize: '9pt',
                                color: '#444444',
                                fontFamily: 'monospace',
                                marginLeft: '6px',
                                fontWeight: 600,
                              }}
                            >
                              ({row.subject.code})
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            border: '1px solid #000000',
                            padding: '8px 12px',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#000000',
                            verticalAlign: 'middle',
                          }}
                        >
                          {row.session.durationMinutes || 60}m
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
