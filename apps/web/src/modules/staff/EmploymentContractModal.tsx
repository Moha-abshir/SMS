import React, { useState, useRef } from 'react';
import { Printer, X, FileText, Edit3 } from 'lucide-react';

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
  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const [commencementText, setCommencementText] = useState('the beginning of the 2nd term');
  const [durationText, setDurationText] = useState('the end of the year');
  const [contractDate, setContractDate] = useState(todayStr);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !staff) return null;

  const staffFullName = `${staff.firstName || ''} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName || ''}`.trim();
  const headTeacherName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'HEAD TEACHER';

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
            margin: 18mm 15mm;
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
                <p className="text-[11px] text-slate-500 mt-0.5">Eldoret Muslim Academy</p>
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
                  fontSize: '13px',
                  lineHeight: '1.5',
                  padding: '50px 55px',
                }}
              >

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '3px', marginBottom: '2px' }}>
                    ELDORET MUSLIM
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', textDecoration: 'underline', letterSpacing: '1px' }}>
                    PRIVATE SCHOOL EMPLOYMENT CONTRACT.
                  </p>
                </div>

                {/* Preamble */}
                <div style={{ marginBottom: '14px' }}>
                  <p style={{ marginBottom: '8px' }}>
                    This employment contract is made on this <u><b>{contractDate}</b></u>{' '}
                    Between <b>ELDORET MUSLIM ACADEMY</b> located at mailinne-Eldoret.
                  </p>
                  <p style={{ marginBottom: '8px' }}><b>AND</b></p>
                  <p>
                    <u><b style={{ textTransform: 'uppercase' }}>{staffFullName}</b></u> of National ID/Passport No{' '}
                    <u><b>{staff.nationalId || dot(20)}</b></u>, residing at{' '}
                    <u><b>{staff.address || dot(20)}</b></u>{' '}
                    TSC NO <u><b>{staff.tscNumber || dot(15)}</b></u>{' '}
                    SIGN {dot(20)}
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
                    (Teacher/Administrator/ support staff).
                  </p>
                </div>

                {/* 2. Commencement and Duration */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    2. COMMENCEMENT AND DURATION
                  </p>
                  <p>
                    This contract shall commence from <u><b>{commencementText}</b></u> and shall remain in force till{' '}
                    <u><b>{durationText}</b></u>, renewable subject to satisfactory of performance and mutual agreement.
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
                    <li>Make sure respective class learners are speaking in fluent English, offer appropriate teaching content and use of teaching aids e.g. charts</li>
                    <li>Observe all school rules, prepare scheme, lesson plan, progress record and lesson notes</li>
                    <li>Protect the reputation and property of the school.</li>
                    <li>Uphold high standards of discipline professionalism.</li>
                  </ul>
                </div>

                {/* 4. Working Hours */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    4. WORKING HOURS
                  </p>
                  <p>
                    The normal working hours shall be from 6:30 am to4:30pm, Monday to Friday, with additional duties as may reasonably be required.
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
                    <u><b>{staff.salaryPaymentDay || dot(10)}</b></u> day of each month, subject to statutory deductions as required by Kenyan law.
                  </p>
                </div>

                {/* 6. Leave Entitlement */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    6. LEAVE ENTITLEMENT
                  </p>
                  <p>Public holidays as gazette by the government of Kenya to be observed.</p>
                  <p>Maternity leave</p>
                  <p style={{ marginBottom: '6px' }}>Sick leave</p>
                  <p><b>NOTE.</b></p>
                  <p style={{ textAlign: 'justify' }}>
                    Any staff member who is unable to report to duty due to illness must notify the school formally in writing before the start of the working day or latest within 24hrs of absence. For sick-leave exceeding 2 consecutive days a valid medical supporting document should be submitted upon return to work failure to notify the school the absence will be treated as an authorized and disciplinary action taken.
                  </p>
                </div>

                {/* 7. Discipline and Conduct */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    7. DISCIPLINE AND CONDUCT
                  </p>
                  <p style={{ marginBottom: '6px' }}>
                    The employee shall comply with the school code of conduct ANY misconduct may results in disciplinary action in accordance with the employment Act 2007.
                  </p>
                  <p><b>Displinary procedures.</b></p>
                  <ul style={{ paddingLeft: '28px', margin: 0 }}>
                    <li>Notice to show cause.</li>
                    <li>Displinary hearing.</li>
                    <li>Consideration and decision.</li>
                  </ul>
                </div>

                {/* 8. Termination */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    8. TERMINATION
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    Either party may terminate this contract by giving 15 days' written notice or SUMMARILY dismiss the Teacher for gross misconduct as provided under the employment Act 2007.In the event of being terminated at the end of the term, the school will not be owed for the holiday period.
                  </p>
                </div>

                {/* 9. Governing Law */}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    9. GOVERNING LAW
                  </p>
                  <p style={{ textAlign: 'center' }}>
                    This contract shall be governed by and construed in accordance with the laws of Republic of Kenya.
                  </p>
                </div>

                {/* 10. Entire Agreement */}
                <div style={{ marginBottom: '18px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '3px', textAlign: 'center' }}>
                    10. ENTIRE AGREEMENT
                  </p>
                  <p>
                    This contract constitutes the entire agreement between the parties.
                  </p>
                </div>

                {/* Islamic Ethics Note */}
                <div style={{ marginBottom: '18px' }}>
                  <p><b>NOTE:</b></p>
                  <p style={{ marginBottom: '6px' }}>
                    It being an Islamic institution the teaches are expected to respect and to uphold the Islamic values and ethics of the school while carrying out the professional duty
                  </p>
                  <ol style={{ paddingLeft: '28px', margin: 0 }}>
                    <li>Professional dress code according to the Islamic principles.</li>
                    <li>Respect for Islamic practices.</li>
                    <li>Moral and ethical behavior.</li>
                    <li>Respect for student's religious identity.</li>
                    <li>Compliance and accountability.</li>
                  </ol>
                </div>

                {/* Declaration */}
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '6px', textAlign: 'center' }}>
                    DECLARATION
                  </p>
                  <p style={{ textAlign: 'justify' }}>
                    I <u><b style={{ textTransform: 'uppercase' }}>{staffFullName}</b></u> declare that I have carefully read the term and conditions of this employment contract and agree to abide to all policies, rules and obligations set out here in. I confirm that the information provided by me is accurate and that I accept this contract voluntarily and in good faith.
                  </p>
                </div>

                {/* Signature Blocks */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                  <div style={{ flex: 1 }}>
                    <p><b>EMPLOYEE NAME</b> <span style={{ textTransform: 'uppercase', textDecoration: 'underline' }}>{staffFullName}</span></p>
                    <p><b>EMPLOYEE SIGNATURE</b> {dot(25)}</p>
                    <p><b>ID NUMBER</b> {staff.nationalId || dot(25)}</p>
                    <p><b>TSC NUMBER</b> {staff.tscNumber || dot(25)}</p>
                    <p><b>DATE</b> {dot(25)}</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p><b>EMPLOYER NAME</b> <span style={{ textTransform: 'uppercase', textDecoration: 'underline' }}>{headTeacherName}</span></p>
                    <p><b>EMPLOYER SIGNATURE</b> {dot(25)}</p>
                    <p><b>DATE</b> {dot(25)}</p>
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
