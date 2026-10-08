import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, FileText, Edit3, School } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { formatDate, formatOrdinalDay } from '../../lib/formatters';
import { printElement } from '../../lib/printElement';

interface EmploymentContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: {
    firstName: string;
    middleName?: string;
    lastName: string;
    nationalId?: string;
    address?: string;
    tscNumber?: string;
    roleName?: string;
    salaryAmount?: number | string;
    salaryPaymentDay?: number | string;
    dateOfEmployment?: string | Date;
  } | null;
  currentUser?: {
    firstName: string;
    lastName: string;
  } | null;
}

export const EmploymentContractModal: React.FC<EmploymentContractModalProps> = ({
  isOpen,
  onClose,
  staff,
  currentUser,
}) => {
  const todayFormatted = formatDate(new Date());

  const [commencementText, setCommencementText] = useState('the beginning of the 2nd term');
  const [durationText, setDurationText] = useState('the end of the year');
  const [contractDate, setContractDate] = useState(todayFormatted);
  const [schoolSettings, setSchoolSettings] = useState<any>({
    schoolName: 'ELDORET MUSLIM ACADEMY',
    schoolMotto: 'Excellence in Knowledge & Virtue',
    poBox: 'P.O. Box 7768 – 30100, Eldoret',
    county: 'Eldoret, Uasin Gishu',
    contactPhone: '+254 714731331',
    contactEmail: 'eldoretmuslimacademy@gmail.com',
    address: 'Eldoret-Kitale Road near Tawakkal Mosque',
    logoUrl: null,
  });

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get('/api/settings/public')
        .then((res) => {
          if (res.data.data) {
            setSchoolSettings((prev: any) => ({ ...prev, ...res.data.data }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const staffFullName = staff ? `${staff.firstName || ''} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName || ''}`.trim() : '';

  const formatCurrency = (val?: number | string) => {
    if (!val) return '...................';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? '...................' : num.toLocaleString('en-KE');
  };

  const dot = (len: number = 30) => '.'.repeat(len);

  const handlePrint = () => {
    printElement(
      'contract-document',
      `${schoolSettings.schoolName || 'Eldoret Muslim Academy'} - Employment Contract - ${staffFullName}`
    );
  };

  useEffect(() => {
    if (!isOpen || !staff) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, staff, schoolSettings, staffFullName]);

  if (!isOpen || !staff) return null;

  return (
    <>
      {/* Print-only stylesheet — fallback for direct browser print shortcut */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #contract-document,
          #contract-document * {
            visibility: visible;
          }
          #contract-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 30mm 15mm 20mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            line-height: 1.45 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Full-screen modal overlay */}
      {/* Full-screen modal overlay */}
      <div
        id="contract-print-root"
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex"
      >
        {/* Left sidebar — contract options (hidden on print) */}
        <div className="no-print hidden lg:flex flex-col w-72 sm:w-80 bg-white dark:bg-[#0c1830] border-r border-slate-200 dark:border-[#1a335a] shrink-0">
          {/* Sidebar header */}
          <div className="p-5 border-b border-slate-100 dark:border-[#1a335a]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">Contract Preview</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{schoolSettings.schoolName}</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-5 space-y-5 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Edit3 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> Contract Settings
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Contract Date</label>
              <input
                type="text"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#081224] border border-slate-200 dark:border-[#162b4d] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Commencement Term</label>
              <input
                type="text"
                value={commencementText}
                onChange={(e) => setCommencementText(e.target.value)}
                placeholder="e.g. beginning of 2nd term"
                className="w-full bg-slate-50 dark:bg-[#081224] border border-slate-200 dark:border-[#162b4d] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Duration / Expiry</label>
              <input
                type="text"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder="e.g. the end of the year"
                className="w-full bg-slate-50 dark:bg-[#081224] border border-slate-200 dark:border-[#162b4d] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="p-3 bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 rounded-xl">
              <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                💡 All fields are pre-filled from the staff record and live school settings. Changes update the preview instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Main area — document preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top action bar (hidden on print) */}
          <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3 bg-white dark:bg-[#0c1830] border-b border-slate-200 dark:border-[#1a335a] shrink-0 gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="lg:hidden flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{staffFullName}</p>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">{staff.roleName?.replace(/_/g, ' ') || 'Staff'} • Employment Contract</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-glass cursor-pointer"
              >
                <Printer className="w-4 h-4" /> <span>Print Contract</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable document canvas with contrasting desk surface */}
          <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-200/70 dark:bg-[#060c18] p-4 sm:p-8 md:p-12" ref={printRef}>
            <div className="mx-auto w-full max-w-[760px]">
              {/* Authentic Physical White Paper Letter Canvas (Never inverted) */}
              <div
                id="contract-document"
                className="physical-paper-document bg-white text-black rounded-sm shadow-2xl shadow-black/40 border border-slate-300 p-8 sm:p-14 md:p-16 text-xs sm:text-[13px] select-text"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontFamily: "'Times New Roman', Times, serif",
                  lineHeight: '1.6',
                  boxSizing: 'border-box',
                }}
              >
                {/* Official Letterhead Header with School Crest & Contacts */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    borderBottom: '2.5px solid #000000',
                    paddingBottom: '14px',
                    marginBottom: '22px',
                    gap: '20px',
                  }}
                >
                  <div style={{ width: '80px', height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {schoolSettings.logoUrl ? (
                      <img src={schoolSettings.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <School style={{ width: '56px', height: '56px', color: '#1e3a8a' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <h1 style={{ fontSize: '16.5pt', fontWeight: 900, textTransform: 'uppercase', margin: 0, color: '#000000', letterSpacing: '0.5px' }}>
                      {schoolSettings.schoolName || 'ELDORET MUSLIM ACADEMY'}
                    </h1>
                    {schoolSettings.schoolMotto && (
                      <p style={{ fontSize: '11pt', fontStyle: 'italic', margin: '2px 0 4px 0', fontWeight: 'bold', color: '#1e293b' }}>
                        "{schoolSettings.schoolMotto}"
                      </p>
                    )}
                    <p className="letterhead-subtext" style={{ fontSize: '10pt', margin: '1px 0', color: '#334155' }}>
                      {schoolSettings.poBox ? schoolSettings.poBox : 'P.O. Box 7768 – 30100, Eldoret'}
                      {schoolSettings.county ? ` | ${schoolSettings.county}` : ' | Eldoret, Uasin Gishu'}
                    </p>
                    <p className="letterhead-subtext" style={{ fontSize: '10pt', margin: '1px 0', color: '#334155' }}>
                      Tel: {schoolSettings.contactPhone || '+254 714731331'} | Email: {schoolSettings.contactEmail || 'eldoretmuslimacademy@gmail.com'}
                    </p>
                  </div>
                </div>

                {/* Document Formal Title */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '13.5pt', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '1px', textTransform: 'uppercase', margin: 0, color: '#000000' }}>
                    PRIVATE SCHOOL EMPLOYMENT CONTRACT
                  </h2>
                </div>

                {/* Preamble */}
                <div style={{ marginBottom: '16px', lineHeight: '1.8' }}>
                  <p style={{ marginBottom: '8px' }}>
                    This employment contract is made on this <u><b style={{ padding: '0 4px' }}>{contractDate}</b></u>{' '}
                    Between <b>{schoolSettings.schoolName || 'ELDORET MUSLIM ACADEMY'}</b> located at {schoolSettings.address || 'Eldoret-Kitale Road near Tawakkal Mosque'}.
                  </p>
                  <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>AND</p>
                  <p>
                    <u><b style={{ textTransform: 'uppercase', padding: '0 4px' }}>{staffFullName}</b></u> of National ID/Passport No{' '}
                    <u><b style={{ padding: '0 4px' }}>{staff.nationalId || dot(20)}</b></u>, residing at{' '}
                    <u><b style={{ padding: '0 4px' }}>{staff.address || dot(20)}</b></u>{' '}
                    TSC NO <u><b style={{ padding: '0 4px' }}>{staff.tscNumber || dot(15)}</b></u>.
                  </p>
                </div>

                {/* 1. Position */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    1. POSITION
                  </p>
                  <p>
                    The school hereby employs the Employee as{' '}
                    <u><b style={{ textTransform: 'uppercase', padding: '0 4px' }}>
                      {staff.roleName ? staff.roleName.replace(/_/g, ' ') : dot(30)}
                    </b></u>{' '}
                    (Teacher / Administrator / Support Staff).
                  </p>
                </div>

                {/* 2. Commencement and Duration */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    2. COMMENCEMENT AND DURATION
                  </p>
                  <p>
                    This contract shall commence from <u><b style={{ padding: '0 4px' }}>{commencementText}</b></u> and shall remain in force till{' '}
                    <u><b style={{ padding: '0 4px' }}>{durationText}</b></u>, renewable subject to satisfactory performance and mutual agreement.
                  </p>
                </div>

                {/* 3. Duties and Responsibilities */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    3. DUTIES AND RESPONSIBILITIES
                  </p>
                  <p style={{ marginBottom: '6px' }}>
                    Perform duties assigned by the school diligently and professionally:
                  </p>
                  <ul style={{ paddingLeft: '28px', margin: 0 }}>
                    <li>Ensure the success and excellence of the learners' academics.</li>
                    <li>Make sure respective class learners are speaking in fluent English, offer appropriate teaching content and use of teaching aids e.g. charts.</li>
                    <li>Observe all school rules, prepare schemes of work, lesson plans, progress records and lesson notes.</li>
                    <li>Protect the reputation and property of the school.</li>
                    <li>Uphold high standards of discipline and professionalism.</li>
                  </ul>
                </div>

                {/* 4. Working Hours */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    4. WORKING HOURS
                  </p>
                  <p>
                    The normal working hours shall be from 6:30 am to 4:30 pm, Monday to Friday, with additional duties as may reasonably be required.
                  </p>
                </div>

                {/* 5. Remuneration */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    5. REMUNERATION
                  </p>
                  <p>
                    The school shall pay the employee a salary of KES{' '}
                    <u><b style={{ padding: '0 4px' }}>{formatCurrency(staff.salaryAmount)}</b></u> Per month, payable <i>on or before</i> the{' '}
                    <u><b style={{ padding: '0 4px' }}>{formatOrdinalDay(staff.salaryPaymentDay || 28)}</b></u> day of each month, subject to statutory deductions as required by Kenyan law.
                  </p>
                </div>

                {/* 6. Leave Entitlement */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    6. LEAVE ENTITLEMENT
                  </p>
                  <p>Public holidays as gazetted by the Government of Kenya to be observed.</p>
                  <p>Maternity / Paternity Leave</p>
                  <p style={{ marginBottom: '6px' }}>Sick Leave</p>
                  <p><b>NOTE:</b></p>
                  <p style={{ textAlign: 'justify' }}>
                    Any staff member who is unable to report to duty due to illness must notify the school formally in writing before the start of the working day or latest within 24hrs of absence. For sick-leave exceeding 2 consecutive days, a valid medical supporting document should be submitted upon return to work. Failure to notify the school will treat the absence as unauthorized and disciplinary action will be taken.
                  </p>
                </div>

                {/* 7. Discipline and Conduct */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    7. DISCIPLINE AND CONDUCT
                  </p>
                  <p style={{ marginBottom: '6px' }}>
                    The employee shall comply with the school code of conduct. ANY misconduct may result in disciplinary action in accordance with the Employment Act 2007.
                  </p>
                  <p><b>Disciplinary Procedures:</b></p>
                  <ul style={{ paddingLeft: '28px', margin: 0 }}>
                    <li>Notice to show cause.</li>
                    <li>Disciplinary hearing.</li>
                    <li>Consideration and decision.</li>
                  </ul>
                </div>

                {/* 8. Termination */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    8. TERMINATION
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    Either party may terminate this contract by giving 15 days' written notice or SUMMARILY dismiss the Employee for gross misconduct as provided under the Employment Act 2007. In the event of termination at the end of the term, the school will not owe payment for the holiday period.
                  </p>
                </div>

                {/* 9. Governing Law */}
                <div style={{ marginBottom: '14px', lineHeight: '1.7' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center', fontSize: '11.5pt' }}>
                    9. GOVERNING LAW
                  </p>
                  <p style={{ textAlign: 'center' }}>
                    This contract shall be governed by and construed in accordance with the laws of the Republic of Kenya.
                  </p>
                </div>

                {/* Signatures & Official Stamp Block */}
                <div style={{ marginTop: '28px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', gap: '24px', fontSize: '11.5px', pageBreakInside: 'avoid' }}>
                  {/* School Signatory Column */}
                  <div style={{ width: '48%' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '35px' }}>For and on behalf of the School:</p>
                    <div style={{ borderTop: '1.5px solid #000000', paddingTop: '6px' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Headteacher / Authorized Signatory</p>
                      <p style={{ margin: '2px 0 0 0', color: '#334155' }}>{schoolSettings.schoolName || 'ELDORET MUSLIM ACADEMY'}</p>
                      <p style={{ margin: '2px 0 0 0', color: '#334155' }}>Date: {contractDate}</p>
                    </div>

                    {/* Physical Rubber Stamp Box */}
                    <div
                      className="stamp-box"
                      style={{
                        marginTop: '14px',
                        width: '150px',
                        height: '75px',
                        border: '1.5px dashed #64748b',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        fontSize: '9.5px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        textAlign: 'center',
                        lineHeight: '1.3',
                      }}
                    >
                      <span>Official School</span>
                      <span>Rubber Stamp</span>
                    </div>
                  </div>

                  {/* Employee Acceptance Column */}
                  <div style={{ width: '48%' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '35px' }}>Employee Acceptance:</p>
                    <div style={{ borderTop: '1.5px solid #000000', paddingTop: '6px' }}>
                      <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 'bold' }}>
                        Signature: {staffFullName}
                      </p>
                      <p style={{ margin: '2px 0 0 0', color: '#334155' }}>ID/Passport: {staff.nationalId || dot(15)}</p>
                      <p style={{ margin: '2px 0 0 0', color: '#334155' }}>Date: {contractDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
