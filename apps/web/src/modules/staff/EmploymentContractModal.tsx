import React, { useState } from 'react';
import { Printer, X, FileText, Calendar, Edit3 } from 'lucide-react';

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
  const dayOrdinal = new Date().getDate() + (['st', 'nd', 'rd'][(new Date().getDate() % 10) - 1] || 'th');
  const monthYearStr = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const [commencementText, setCommencementText] = useState('the beginning of the 2nd term');
  const [durationText, setDurationText] = useState('the end of the year');
  const [contractDate, setContractDate] = useState(todayStr);

  if (!isOpen || !staff) return null;

  const staffFullName = `${staff.firstName || ''} ${staff.middleName ? staff.middleName + ' ' : ''}${staff.lastName || ''}`.trim();
  const headTeacherName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'HEAD TEACHER';

  const formatCurrency = (val?: number | string) => {
    if (!val) return '...................';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? '...................' : num.toLocaleString('en-KE');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Container Card */}
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white print:rounded-none">
        
        {/* Modal Header & Controls (Hidden during Print) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-900/90 rounded-t-2xl print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Employment Contract Preview</h2>
              <p className="text-xs text-slate-400">Eldoret Muslim Private School • {staffFullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" /> Print Contract
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split view (Settings panel + Printable A4 Canvas) */}
        <div className="flex flex-col lg:flex-row overflow-y-auto print:overflow-visible print:block">
          
          {/* Quick Edit Side Panel (Hidden during Print) */}
          <div className="w-full lg:w-72 p-5 bg-slate-950/60 border-r border-slate-800 space-y-4 print:hidden shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Contract Options
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Date</label>
              <input
                type="text"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Commencement Term</label>
              <input
                type="text"
                value={commencementText}
                onChange={(e) => setCommencementText(e.target.value)}
                placeholder="e.g. beginning of 2nd term"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Duration / Expiry</label>
              <input
                type="text"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
                placeholder="e.g. the end of the year"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 leading-relaxed">
              💡 Pre-filled from staff record. Modifying fields here updates the document preview instantly for printing.
            </div>
          </div>

          {/* Printable A4 Paper Document Canvas */}
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-950 flex justify-center print:bg-white print:p-0 print:overflow-visible">
            <div
              id="contract-print-area"
              className="w-full max-w-[790px] bg-white text-black font-serif p-8 md:p-14 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none text-sm leading-relaxed"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              
              {/* Document Header */}
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-xl font-bold tracking-widest uppercase mb-1">ELDORET MUSLIM</h1>
                <h2 className="text-lg font-bold tracking-wider underline uppercase">PRIVATE SCHOOL EMPLOYMENT CONTRACT.</h2>
              </div>

              {/* Preamble */}
              <div className="mb-6 space-y-3">
                <p>
                  This employment contract is made on this <strong className="underline px-1">{contractDate}</strong>
                  Between <strong className="uppercase">ELDORET MUSLIM ACADEMY</strong> located at mailinne-Eldoret.
                </p>
                <p className="font-bold">AND</p>
                <p>
                  <strong className="underline uppercase px-1">{staffFullName}</strong> of National ID/Passport No{' '}
                  <strong className="underline px-1">{staff.nationalId || '...........................'}</strong>, residing at{' '}
                  <strong className="underline px-1">{staff.address || '...........................'}</strong> TSC NO{' '}
                  <strong className="underline px-1">{staff.tscNumber || '...........................'}</strong> SIGN ..........................
                </p>
              </div>

              {/* Section 1 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">1. POSITION</h3>
                <p>
                  The school hereby employs the Employee as <strong className="underline uppercase px-1">{staff.roleName ? staff.roleName.replace('_', ' ') : 'Teacher'}</strong> (Teacher/Administrator/ support staff).
                </p>
              </div>

              {/* Section 2 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">2. COMMENCEMENT AND DURATION</h3>
                <p>
                  This contract shall commence from <strong className="underline px-1">{commencementText}</strong> and shall remain in force till{' '}
                  <strong className="underline px-1">{durationText}</strong>, renewable subject to satisfactory of performance and mutual agreement.
                </p>
              </div>

              {/* Section 3 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">3. DUTIES AND RESPONSIBILITIES</h3>
                <p className="mb-2">Perform duties assigned by the school diligently and professionally.</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Ensure the success and excellence of the learners &apos;academics.</li>
                  <li>Make sure respective class learners are speaking in fluent English, offer appropriate teaching content and use of teaching aids e.g. charts</li>
                  <li>Observe all school rules, prepare scheme, lesson plan, progress record and lesson notes</li>
                  <li>Protect the reputation and property of the school.</li>
                  <li>Uphold high standards of discipline professionalism.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">4. WORKING HOURS</h3>
                <p>
                  The normal working hours shall be from 6:30 am to 4:30pm, Monday to Friday, with additional duties as may reasonably be required.
                </p>
              </div>

              {/* Section 5 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">5. REMUNERATION</h3>
                <p>
                  The school shall pay the employee a salary of KES <strong className="underline px-1">{formatCurrency(staff.salaryAmount)}</strong> Per month, payable on or before the{' '}
                  <strong className="underline px-1">{staff.salaryPaymentDay || '..............'}</strong> day of each month, subject to statutory deductions as required by Kenyan law.
                </p>
              </div>

              {/* Section 6 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">6. LEAVE ENTITLEMENT</h3>
                <p className="mb-1">Public holidays as gazette by the government of Kenya to be observed.</p>
                <p className="mb-1">Maternity leave</p>
                <p className="mb-2">Sick leave</p>
                <p className="font-bold mb-1">NOTE.</p>
                <p className="text-justify">
                  Any staff member who is unable to report to duty due to illness must notify the school formally in writing before the start of the working day or latest within 24hrs of absence. For sick-leave exceeding 2 consecutive days a valid medical supporting document should be submitted upon return to work failure to notify the school the absence will be treated as an authorized and disciplinary action taken.
                </p>
              </div>

              {/* Section 7 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">7. DISCIPLINE AND CONDUCT</h3>
                <p className="mb-2">
                  The employee shall comply with the school code of conduct ANY misconduct may results in disciplinary action in accordance with the employment Act 2007.
                </p>
                <p className="font-bold mb-1">Displinary procedures.</p>
                <ul className="list-disc list-inside space-y-0.5 pl-2">
                  <li>Notice to show cause.</li>
                  <li>Displinary hearing.</li>
                  <li>Consideration and decision.</li>
                </ul>
              </div>

              {/* Section 8 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">8. TERMINATION</h3>
                <p className="text-justify">
                  Either party may terminate this contract by giving 15 days&apos; written notice or SUMMARILY dismiss the Teacher for gross misconduct as provided under the employment Act 2007. In the event of being terminated at the end of the term, the school will not be owed for the holiday period.
                </p>
              </div>

              {/* Section 9 */}
              <div className="mb-5">
                <h3 className="font-bold uppercase underline mb-1">9. GOVERNING LAW</h3>
                <p>
                  This contract shall be governed by and construed in accordance with the laws of Republic of Kenya.
                </p>
              </div>

              {/* Section 10 */}
              <div className="mb-6">
                <h3 className="font-bold uppercase underline mb-1">10. ENTIRE AGREEMENT</h3>
                <p>
                  This contract constitutes the entire agreement between the parties.
                </p>
              </div>

              {/* Islamic Ethics Note */}
              <div className="mb-8 p-4 border border-black/30 rounded bg-slate-50/50 print:bg-transparent">
                <p className="font-bold mb-2">NOTE:</p>
                <p className="mb-2">
                  It being an Islamic institution the teaches are expected to respect and to uphold the Islamic values and ethics of the school while carrying out the professional duty
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-2 font-medium">
                  <li>Professional dress code according to the Islamic principles.</li>
                  <li>Respect for Islamic practices.</li>
                  <li>Moral and ethical behavior.</li>
                  <li>Respect for student&apos;s religious identity.</li>
                  <li>Compliance and accountability.</li>
                </ol>
              </div>

              {/* Declaration */}
              <div className="mb-10">
                <h3 className="font-bold uppercase underline mb-2">DECLARATION</h3>
                <p className="text-justify">
                  I <strong className="underline uppercase px-1">{staffFullName}</strong> declare that I have carefully read the term and conditions of this employment contract and agree to abide to all policies, rules and obligations set out here in. I confirm that the information provided by me is accurate and that I accept this contract voluntarily and in good faith.
                </p>
              </div>

              {/* Signature Blocks */}
              <div className="space-y-8 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                  <div className="space-y-2">
                    <p><strong>EMPLOYEE NAME:</strong> <span className="uppercase underline">{staffFullName}</span></p>
                    <p><strong>EMPLOYEE SIGNATURE:</strong> ............................................</p>
                    <p><strong>ID NUMBER:</strong> <span>{staff.nationalId || '............................................'}</span></p>
                    <p><strong>TSC NUMBER:</strong> <span>{staff.tscNumber || '............................................'}</span></p>
                    <p><strong>DATE:</strong> <span>............................................</span></p>
                  </div>

                  <div className="space-y-2">
                    <p><strong>EMPLOYER NAME:</strong> <span className="uppercase underline">{headTeacherName}</span></p>
                    <p><strong>EMPLOYER SIGNATURE:</strong> ............................................</p>
                    <p><strong>DATE:</strong> <span>............................................</span></p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Embedded CSS for Hardware Printing (@media print) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #contract-print-area, #contract-print-area * {
            visibility: visible;
          }
          #contract-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-w: none !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
};
