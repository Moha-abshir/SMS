import React, { useState } from 'react';
import { Send, Phone, MessageSquare, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { Modal } from '../../components/Modal';
import { apiClient } from '../../lib/apiClient';

interface ContactParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    studentId: string;
    fullName: string;
    className?: string;
    guardianName: string;
    guardianPhone: string;
    academicAverage?: number | null;
  } | null;
}

export const ContactParentModal: React.FC<ContactParentModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const [templateType, setTemplateType] = useState<
    'ACADEMIC_PROGRESS' | 'ATTENDANCE_CONCERN' | 'COMMENDATION' | 'CUSTOM_CONTROLLED'
  >('ACADEMIC_PROGRESS');
  const [customNote, setCustomNote] = useState('');
  const [sending, setSending] = useState(false);

  if (!student) return null;

  const getPreviewText = () => {
    const school = 'Eldoret Muslim Academy';
    const sName = student.fullName;
    const gName = student.guardianName;
    const cName = student.className || 'Class';

    switch (templateType) {
      case 'ACADEMIC_PROGRESS':
        return `${school} Academic Notice: Dear ${gName}, this is an academic update for ${sName} (${cName}). Recent assessment average: ${student.academicAverage ? `${student.academicAverage}%` : 'recorded'}. Regular assessments are ongoing. Please review their progress and encourage consistent study habits at home.`;
      case 'ATTENDANCE_CONCERN':
        return `${school} Attendance Notice: Dear ${gName}, ${sName} has accumulated repeated unexcused absences in ${cName}. Consistent class attendance is vital for learning. Please contact the class teacher urgently.`;
      case 'COMMENDATION':
        return `${school} Commendation: Dear ${gName}, we are pleased to commend ${sName} (${cName}) for commendable effort, diligence, and positive character in class. Keep up the great work!`;
      case 'CUSTOM_CONTROLLED':
        return `${school} Class Teacher Note: Dear ${gName} (re: ${sName}), ${customNote.trim() || '[Your message note will appear here]'}`;
      default:
        return '';
    }
  };

  const preview = getPreviewText();

  const handleSendSms = async () => {
    if (templateType === 'CUSTOM_CONTROLLED' && !customNote.trim()) {
      toast.error('Please enter a note for the custom message');
      return;
    }

    setSending(true);
    try {
      const payload = {
        studentId: student.studentId,
        templateType,
        customNote: templateType === 'CUSTOM_CONTROLLED' ? customNote.trim() : undefined,
      };

      const res = await apiClient.post('/api/teacher/send-learner-sms', payload);
      toast.success(res.data?.message || 'SMS dispatched to guardian successfully!');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Controlled Parent / Guardian Outreach">
      <div className="space-y-4">
        {/* Recipient Details */}
        <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800">
              {student.guardianName}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Guardian of <span className="font-semibold text-sky-700">{student.fullName}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-sky-200 text-xs font-bold text-sky-800">
            <Phone className="w-3.5 h-3.5 text-sky-600" />
            {student.guardianPhone || 'No Phone'}
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Select Controlled Message Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              {
                id: 'ACADEMIC_PROGRESS',
                label: 'Academic Progress Update',
                desc: 'Shares recent performance and study encouragement',
              },
              {
                id: 'ATTENDANCE_CONCERN',
                label: 'Attendance Concern Notice',
                desc: 'Alerts guardian to repeated learner absences',
              },
              {
                id: 'COMMENDATION',
                label: 'Positive Commendation',
                desc: 'Recognizes exceptional conduct and effort',
              },
              {
                id: 'CUSTOM_CONTROLLED',
                label: 'Custom Teacher Note',
                desc: 'Brief personalized note with school branding',
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateType(t.id as any)}
                className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                  templateType === t.id
                    ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-800">{t.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Note input if CUSTOM_CONTROLLED selected */}
        {templateType === 'CUSTOM_CONTROLLED' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Teacher Note <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Ahmed forgot his science workbook today. Please ensure he brings it tomorrow."
              maxLength={140}
              className="w-full bg-slate-50 border border-sky-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-400 outline-hidden transition-all"
            />
            <div className="text-right text-[10px] text-slate-400 mt-0.5">
              {customNote.length} / 140 chars
            </div>
          </div>
        )}

        {/* Live SMS Message Preview */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              Live SMS Preview
            </span>
            <span className="text-[11px] text-slate-400">
              {preview.length} characters ({Math.ceil(preview.length / 160)} SMS)
            </span>
          </div>
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 leading-relaxed break-words">
            {preview}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-sky-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSendSms}
            disabled={sending || !student.guardianPhone}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? 'Dispatching SMS...' : 'Send SMS to Guardian'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
