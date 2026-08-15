import React, { useState, useEffect, useRef } from 'react';
import { Printer, X, FileText, Edit3, School } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { formatDate, formatOrdinalDay } from '../../lib/formatters';

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
    poBox: 'P.O. Box 1234 - 30100, Eldoret',
    county: 'Uasin Gishu County',
    contactPhone: '+254 700 000 000',
    contactEmail: 'info@eldoretmuslimacademy.ac.ke',
    address: 'Kisumu Road, Eldoret',
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

  if (!isOpen || !staff) return null;

  const staffFullName = `${staff.firstName || ''} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName || ''}`.trim();

  const formatCurrency = (val?: number | string) => {
    if (!val) return '...................';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? '...................' : num.toLocaleString('en-KE');
  };

  const dot = (len: number = 30) => '.'.repeat(len);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print-only stylesheet — injected once */}
      <style>{`
        @media print {
          /* Hide everything except the contract */
          body > *:not(#contract-print-root) { display: none !important; }
          #contract-print-root { display: block !important; }
          #contract-print-root .no-print { display: none !important; }

          #contract-print-root {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: white !important;
            overflow: visible !important;
          }

          #contract-document {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
            line-height: 1.45 !important;
          }

          #contract-document * {
            color: black !important;
            background: transparent !important;
          }

          @page {
            size: A4;
            margin: 15mm 15mm;
          }
        }
      `}</style>

      {/* Full-screen modal overlay */}
      <div
        id="contract-print-root"
        className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex"
      >
        {/* Left sidebar — contract options (hidden on print) */}
        <div className="no-print hidden lg:flex flex-col w-72 bg-slate-900 border-r border-slate-800 shrink-0">
          {/* Sidebar header */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">Contract Preview</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{schoolSettings.schoolName}</p>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-5 space-y-5 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Edit3 className="w-3 h-3 text-blue-400" /> Contract Settings
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Contract Date</label>
              <input
                type="text"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Commencement Term</label>
              <input
                type="text"
                value={commencementText}
                onChange={(e) => setCommencementText(e.target.value)}
                placeholder="e.g. beginning of 2nd term"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Duration / Expiry</label>
              <input
                type="text"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder="e.g. the end of the year"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="p-3 bg-blue-600/10 border border-blue-500/15 rounded-xl">
              <p className="text-[11px] text-blue-300/80 leading-relaxed">
                💡 All fields are pre-filled from the staff record. Changes here update the preview instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Main area — document preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top action bar (hidden on print) */}
          <div className="no-print flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/15 flex items-center justify-center text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{staffFullName}</p>
                <p className="text-[11px] text-slate-500">{staff.roleName?.replace(/_/g, ' ') || 'Staff'} • Employment Contract</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all active:scale-[0.97]"
              >
                <Printer className="w-4 h-4" /> Print Contract
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable document area */}
          <div className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-8" ref={printRef}>
            <div className="mx-auto" style={{ maxWidth: '750px' }}>
              {/* The A4 document */}
              <div
                id="contract-document"
                className="bg-white text-black rounded-sm shadow-2xl shadow-black/30 border border-slate-300/50"
                style={{
                  fontFamily: "'Times New Roman', Times, serif",
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  padding: '45px 50px',
                }}
              >
                {/* Official Letterhead Header with Logo on Left */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    borderBottom: '2.5px solid #000',
                    paddingBottom: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ width: '80px', height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {schoolSettings.logoUrl ? (
                      <img src={schoolSettings.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <School style={{ width: '50px', height: '50px', color: '#1e3a8a' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, paddingLeft: '18px', textAlign: 'left' }}>
                    <h1 style={{ fontSize: '18px', fontWeight: '900', textTransform: 'uppercase', margin: 0, color: '#000', letterSpacing: '0.5px' }}>
                      {schoolSettings.schoolName}
                    </h1>
                    <p style={{ fontSize: '12px', fontStyle: 'italic', margin: '2px 0 4px 0', fontWeight: 'bold', color: '#334155' }}>
                      "{schoolSettings.schoolMotto}"
                    </p>
                    <p style={{ fontSize: '11px', margin: 0, color: '#475569' }}>
                      {schoolSettings.poBox} | {schoolSettings.county}
                    </p>
                    <p style={{ fontSize: '11px', margin: 0, color: '#475569' }}>
                      Tel: {schoolSettings.contactPhone} | Email: {schoolSettings.contactEmail}
                    </p>
                  </div>
                </div>

                {/* Document Title */}
                <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '15px', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                    PRIVATE SCHOOL EMPLOYMENT CONTRACT
                  </h2>
                </div>

                {/* Preamble */}
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ marginBottom: '8px' }}>
                    This employment contract is made on this <u><b>{contractDate}</b></u>{' '}
                    Between <b>{schoolSettings.schoolName}</b> located at {schoolSettings.address || 'Eldoret'}.
                  </p>
                  <p style={{ marginBottom: '8px' }}><b>AND</b></p>
                  <p>
                    <u><b style={{ textTransform: 'uppercase' }}>{staffFullName}</b></u> of National ID/Passport No{' '}
                    <u><b>{staff.nationalId || dot(20)}</b></u>, residing at{' '}
                    <u><b>{staff.address || dot(20)}</b></u>{' '}
                    TSC NO <u><b>{staff.tscNumber || dot(15)}</b></u>.
                  </p>
                </div>

                {/* 1. Position */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    1. POSITION
                  </p>
                  <p>
                    The school hereby employs the Employee as{' '}
                    <u><b style={{ textTransform: 'uppercase' }}>
                      {staff.roleName ? staff.roleName.replace(/_/g, ' ') : dot(30)}
                    </b></u>{' '}
                    (Teacher / Administrator / Support Staff).
                  </p>
                </div>

                {/* 2. Commencement and Duration */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    2. COMMENCEMENT AND DURATION
                  </p>
                  <p>
                    This contract shall commence from <u><b>{commencementText}</b></u> and shall remain in force till{' '}
                    <u><b>{durationText}</b></u>, renewable subject to satisfactory performance and mutual agreement.
                  </p>
                </div>

                {/* 3. Duties and Responsibilities */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    3. DUTIES AND RESPONSIBILITIES
                  </p>
                  <p style={{ marginBottom: '6px' }}>
                    Perform duties assigned by the school diligently and professionally.
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
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    4. WORKING HOURS
                  </p>
                  <p>
                    The normal working hours shall be from 6:30 am to 4:30 pm, Monday to Friday, with additional duties as may reasonably be required.
                  </p>
                </div>

                {/* 5. Remuneration */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    5. REMUNERATION
                  </p>
                  <p>
                    The school shall pay the employee a salary of KES{' '}
                    <u><b>{formatCurrency(staff.salaryAmount)}</b></u> Per month, payable <i>on or before</i> the{' '}
                    <u><b style={{ textDecoration: 'underline' }}>{formatOrdinalDay(staff.salaryPaymentDay || 28)}</b></u> day of each month, subject to statutory deductions as required by Kenyan law.
                  </p>
                </div>

                {/* 6. Leave Entitlement */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
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
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
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
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    8. TERMINATION
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    Either party may terminate this contract by giving 15 days' written notice or SUMMARILY dismiss the Employee for gross misconduct as provided under the Employment Act 2007. In the event of termination at the end of the term, the school will not owe payment for the holiday period.
                  </p>
                </div>

                {/* 9. Governing Law */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    9. GOVERNING LAW
                  </p>
                  <p style={{ textAlign: 'center' }}>
                    This contract shall be governed by and construed in accordance with the laws of the Republic of Kenya.
                  </p>
                </div>

                {/* Signatures Block */}
                <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                  <div style={{ width: '45%' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '40px' }}>For and on behalf of the School:</p>
                    <p style={{ borderTop: '1px solid #000', paddingTop: '4px', fontWeight: 'bold' }}>
                      Headteacher / Authorized Signatory
                    </p>
                    <p style={{ margin: 0, color: '#475569' }}>{schoolSettings.schoolName}</p>
                    <p style={{ margin: 0, color: '#475569' }}>Date: {contractDate}</p>
                  </div>

                  <div style={{ width: '45%' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '40px' }}>Employee Acceptance:</p>
                    <p style={{ borderTop: '1px solid #000', paddingTop: '4px', fontStyle: 'italic' }}>
                      Signature: {staffFullName}
                    </p>
                    <p style={{ margin: 0, color: '#475569' }}>ID/Passport: {staff.nationalId || dot(15)}</p>
                    <p style={{ margin: 0, color: '#475569' }}>Date: {contractDate}</p>
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
