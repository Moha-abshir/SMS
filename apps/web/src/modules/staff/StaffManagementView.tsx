import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, ShieldAlert, KeyRound, UserX, UserCheck, MailWarning, Clock, Ban, Send, RefreshCw, Lock, AlertTriangle, Mail, CheckCircle2, XCircle, FileText, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { EmploymentContractModal } from './EmploymentContractModal';
import { SubjectManagementModal } from './SubjectManagementModal';

export const StaffManagementView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [show2FaResetModal, setShow2FaResetModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const currentUser = (() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [submitting2Fa, setSubmitting2Fa] = useState(false);
  
  // Selected staff for edit/reset
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [confirmNewEmailInput, setConfirmNewEmailInput] = useState('');
  const [emailChangeAdminPassword, setEmailChangeAdminPassword] = useState('');
  const [submittingEmailChange, setSubmittingEmailChange] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    nationalId: '',
    address: '',
    tscNumber: '',
    roleId: '',
    salaryAmount: '',
    salaryPaymentDay: ''
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes, subjectsRes] = await Promise.all([
        apiClient.get('/api/staff'),
        apiClient.get('/api/staff/roles'),
        apiClient.get('/api/subjects').catch(() => ({ data: { data: [] } }))
      ]);
      setStaff(staffRes.data.data);
      setRoles(rolesRes.data.data);
      setSubjects(subjectsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const isTeachingRole = (roleId: string) => {
    const r = roles.find(role => role.id === roleId);
    if (!r) return true;
    const name = r.name.toUpperCase();
    return ['TEACHER', 'SUBJECT_TEACHER', 'CLASS_TEACHER', 'HOD', 'DEPUTY_HEAD', 'HEAD_TEACHER'].some(roleName => name.includes(roleName));
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData,
        salaryPaymentDay: formData.salaryPaymentDay ? parseInt(formData.salaryPaymentDay) : null,
        subjectIds: isTeachingRole(formData.roleId) ? selectedSubjectIds : []
      };
      
      const res = await apiClient.post('/api/staff/invitations', payload);
      
      toast.success(res.data.emailSent ? 'Invitation sent successfully!' : 'Invitation created, but failed to send email. Check API key.', { autoClose: false });
      setShowInviteModal(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        subjectIds: isTeachingRole(formData.roleId) ? selectedSubjectIds : []
      };
      await apiClient.put(`/api/staff/${selectedStaff.id}`, payload);
      toast.success('Staff details updated');
      setShowEditModal(false);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update staff');
    }
  };

  const handleToggleStatus = async (staffMember: any) => {
    try {
      await apiClient.patch(`/api/staff/${staffMember.id}/status`, {
        isActive: !staffMember.isActive
      });
      toast.success(`Staff account ${!staffMember.isActive ? 'activated' : 'deactivated'}`);
      fetchStaff();
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const handleResetPassword = async () => {
    try {
      const res = await apiClient.post(`/api/staff/${selectedStaff.id}/password-reset-request`);
      toast.success(`Password reset email sent to ${selectedStaff.email}`);
      setShowResetModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate password reset');
    }
  };

  const handle2FaReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordConfirm) {
      toast.error('Please enter your Head Teacher password to confirm.');
      return;
    }

    setSubmitting2Fa(true);
    try {
      await apiClient.post(`/api/staff/${selectedStaff.id}/2fa-reset`, {
        adminPasswordConfirm,
      });
      toast.success('2FA configuration reset successfully. Staff member will be required to re-verify upon next sign-in.');
      setShow2FaResetModal(false);
      setAdminPasswordConfirm('');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset 2FA');
    } finally {
      setSubmitting2Fa(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const res = await apiClient.post(`/api/staff/invitations/${invitationId}/resend`);
      toast.success(res.data.emailSent ? 'Invitation resent successfully!' : 'Invitation resent, but email failed to send.');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!window.confirm("Are you sure you want to cancel this invitation?")) return;
    try {
      await apiClient.post(`/api/staff/invitations/${invitationId}/cancel`);
      toast.success('Invitation cancelled successfully');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel invitation');
    }
  };

  const resetForm = () => {
    setSelectedSubjectIds([]);
    setFormData({ 
      firstName: '', middleName: '', lastName: '', 
      email: '', phoneNumber: '', nationalId: '', address: '', tscNumber: '',
      roleId: roles.length > 0 ? roles[0].id : '', 
      salaryAmount: '', salaryPaymentDay: '' 
    });
  };

  const handlePreviewContractFromInvite = () => {
    if (!formData.firstName || !formData.lastName) {
      toast.error('Please enter at least First Name and Last Name to preview the contract.');
      return;
    }

    const selectedRole = roles.find(r => r.id === formData.roleId);
    const draftStaff = {
      firstName: formData.firstName,
      middleName: formData.middleName,
      lastName: formData.lastName,
      nationalId: formData.nationalId,
      address: formData.address,
      tscNumber: formData.tscNumber,
      roleName: selectedRole ? selectedRole.name : 'Teacher',
      salaryAmount: formData.salaryAmount,
      salaryPaymentDay: formData.salaryPaymentDay,
      dateOfEmployment: new Date()
    };

    setSelectedStaff(draftStaff);
    setShowContractModal(true);
  };

  const openEditModal = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setSelectedSubjectIds(staffMember.assignedSubjects ? staffMember.assignedSubjects.map((s: any) => s.id) : []);
    setFormData({
      firstName: staffMember.firstName,
      middleName: staffMember.middleName || '',
      lastName: staffMember.lastName,
      email: staffMember.email,
      phoneNumber: staffMember.phoneNumber,
      nationalId: staffMember.nationalId || '',
      address: staffMember.address || '',
      tscNumber: staffMember.tscNumber || '',
      roleId: staffMember.roleId,
      salaryAmount: staffMember.salaryAmount || '',
      salaryPaymentDay: staffMember.salaryPaymentDay?.toString() || ''
    });
    setShowEditModal(true);
  };

  const openResetModal = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setNewEmailInput('');
    setConfirmNewEmailInput('');
    setEmailChangeAdminPassword('');
    setShowResetModal(true);
  };

  const handleInitiateEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmailInput.trim().toLowerCase() !== confirmNewEmailInput.trim().toLowerCase()) {
      toast.error('New email address entries do not match.');
      return;
    }
    if (!emailChangeAdminPassword) {
      toast.error('Head Teacher password authorization is required.');
      return;
    }

    setSubmittingEmailChange(true);
    try {
      const res = await apiClient.post(`/api/staff/${selectedStaff.id}/email-change-request`, {
        newEmail: newEmailInput.trim(),
        adminPasswordConfirm: emailChangeAdminPassword,
      });
      toast.success(res.data.message || `Email recovery verification link sent to ${newEmailInput}`);
      setShowResetModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initiate email address recovery');
    } finally {
      setSubmittingEmailChange(false);
    }
  };

  const getStatusBadge = (s: any) => {
    if (!s.isInvitation) {
      return (
        <div className="flex flex-col gap-1 items-start">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max ${s.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {s.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            {s.isActive ? 'Active' : 'Inactive'}
          </span>
          {s.twoFactorResetRequired && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
              2FA: Setup Required
            </span>
          )}
        </div>
      );
    } else {
      switch (s.invitationStatus) {
        case 'PENDING':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <MailWarning className="w-3 h-3" /> Pending Invitation
            </span>
          );
        case 'EXPIRED':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <Clock className="w-3 h-3" /> Expired
            </span>
          );
        case 'CANCELLED':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Ban className="w-3 h-3" /> Cancelled
            </span>
          );
        default:
          return null;
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-3xl shadow-xl border border-blue-900/40">
        <div>
          <h2 className="text-xl font-bold text-white">Staff Directory & User Invitations</h2>
          <p className="text-xs text-blue-100 mt-0.5">Manage school employees, subject qualifications, and issuing employment contracts</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-blue-500" /> Manage Subjects
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowInviteModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Invite Staff
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">Loading staff...</td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No staff found. Send an invitation!</td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold inline-block">
                          {s.roleName}
                        </span>
                        {s.assignedSubjects && s.assignedSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {s.assignedSubjects.map((sub: any) => (
                              <span key={sub.id} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold rounded">
                                {sub.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-900 dark:text-white">{s.email}</div>
                      <div className="text-xs text-slate-500">{s.phoneNumber}</div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(s)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedStaff(s);
                            setShowContractModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Employment Contract Preview & Print"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {!s.isInvitation ? (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Edit Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openResetModal(s)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="Initiate Password Reset"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStaff(s);
                                setAdminPasswordConfirm('');
                                setShow2FaResetModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                              title="Reset 2FA Configuration"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(s)}
                              className={`p-1.5 transition-colors ${s.isActive ? 'text-slate-400 hover:text-red-600 dark:hover:text-red-400' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                              title={s.isActive ? "Deactivate Account" : "Activate Account"}
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {(s.invitationStatus === 'PENDING' || s.invitationStatus === 'EXPIRED') && (
                              <>
                                <button
                                  onClick={() => handleResendInvitation(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  title="Resend Invitation"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleCancelInvitation(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Cancel Invitation"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Staff Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New Staff">
        <form onSubmit={handleInviteSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
          
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Personal Details</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">First Name *</label>
              <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Last Name *</label>
              <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">National ID / Passport *</label>
              <input type="text" required value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number *</label>
              <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
            <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div className="pb-2 pt-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Professional Details</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address * (For Invitation)</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
              <select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm">
                <option value="" disabled>Select a role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">TSC Number <span className="font-normal text-slate-400 text-[11px]">(Required for Teachers)</span></label>
              <input type="text" value={formData.tscNumber} onChange={e => setFormData({...formData, tscNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          {isTeachingRole(formData.roleId) && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-500">
                Assigned Teaching Subjects <span className="font-normal text-slate-400 text-[11px]">(Select subjects this teacher can teach)</span>
              </label>
              {subjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  No subjects registered yet. Use "Manage Subjects" button to register school subjects.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectIds.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubjectSelection(sub.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <span className="font-mono font-bold text-[10px] opacity-80">{sub.code}</span>
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pb-2 pt-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Financial Details</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Salary Amount (KSH)</label>
              <input type="number" value={formData.salaryAmount} onChange={e => setFormData({...formData, salaryAmount: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Payment Day (1-31)</label>
              <input type="number" min="1" max="31" value={formData.salaryPaymentDay} onChange={e => setFormData({...formData, salaryPaymentDay: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button
              type="button"
              onClick={handlePreviewContractFromInvite}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-semibold rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-500" /> Preview Contract
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Invitation
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff Details">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
           <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">First Name *</label>
              <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Last Name *</label>
              <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">National ID / Passport *</label>
              <input type="text" required value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number *</label>
              <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address *</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
              <select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm">
                <option value="" disabled>Select a role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">TSC Number <span className="font-normal text-slate-400 text-[11px]">(Teachers)</span></label>
              <input type="text" value={formData.tscNumber} onChange={e => setFormData({...formData, tscNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
            </div>
          </div>

          {isTeachingRole(formData.roleId) && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-500">
                Assigned Teaching Subjects <span className="font-normal text-slate-400 text-[11px]">(Select subjects this teacher can teach)</span>
              </label>
              {subjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  No subjects registered yet. Use "Manage Subjects" button to register school subjects.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-36 overflow-y-auto">
                  {subjects.map((sub) => {
                    const isSelected = selectedSubjectIds.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubjectSelection(sub.id)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <span className="font-mono font-bold text-[10px] opacity-80">{sub.code}</span>
                        <span>{sub.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Initiate Password Reset & Email Address Recovery Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Initiate Password Reset & Email Recovery" maxWidth="max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          
          {/* LEFT PANEL: Standard Password Reset */}
          <div className="space-y-4 pr-0 md:pr-4">
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
              <KeyRound className="w-5 h-5" /> Standard Password Reset
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 rounded-xl text-sm leading-relaxed border border-blue-200 dark:border-blue-800">
              Send a secure reset email link to current email <strong>{selectedStaff?.email}</strong>?
              <ul className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-400 list-disc list-inside">
                <li>Link expires in 60 minutes.</li>
                <li>Head Teacher will not see or set password.</li>
                <li>All active sessions logged out upon completion.</li>
              </ul>
            </div>
            <div className="pt-2">
              <button
                onClick={handleResetPassword}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                <Send className="w-4 h-4" /> Send Reset Link to Current Email
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: Email Recovery & Address Change */}
          <form onSubmit={handleInitiateEmailChange} className="space-y-4 pt-4 md:pt-0 pl-0 md:pl-4">
            <div className="flex items-center gap-2 font-bold text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" /> Email Recovery & Address Change
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              If staff member lost access to <strong>{selectedStaff?.email}</strong>, enter their new email address below. A verification link will be sent to the new inbox.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                New Email Address *
              </label>
              <input
                type="email"
                required
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                placeholder="e.g. new.email@gmail.com"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  Confirm New Email Address *
                </label>
                {confirmNewEmailInput.length > 0 && (
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                    newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500 dark:text-rose-400'
                  }`}>
                    {newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Emails match
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Emails do not match
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={confirmNewEmailInput}
                  onChange={(e) => setConfirmNewEmailInput(e.target.value)}
                  placeholder="Re-enter new email address"
                  className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-4 py-2 pr-10 text-sm outline-none transition-all ${
                    confirmNewEmailInput.length > 0
                      ? newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0
                        ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                        : 'border-rose-500 ring-1 ring-rose-500/30'
                      : 'border-slate-200 dark:border-slate-800 focus:border-blue-500'
                  }`}
                />
                {confirmNewEmailInput.length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Head Teacher Password Authorization *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={emailChangeAdminPassword}
                  onChange={(e) => setEmailChangeAdminPassword(e.target.value)}
                  placeholder="Enter your Head Teacher password"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  submittingEmailChange ||
                  confirmNewEmailInput.length === 0 ||
                  newEmailInput.trim().toLowerCase() !== confirmNewEmailInput.trim().toLowerCase() ||
                  !emailChangeAdminPassword
                }
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submittingEmailChange ? 'Sending Link...' : 'Dispatch Email Recovery Link'}
              </button>
            </div>
          </form>

        </div>
      </Modal>

      {/* Reset 2FA Modal */}
      <Modal isOpen={show2FaResetModal} onClose={() => setShow2FaResetModal(false)} title="Reset Two-Factor Authentication (2FA)">
        <form onSubmit={handle2FaReset} className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300 rounded-xl text-sm leading-relaxed border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-400 mb-1">
              <AlertTriangle className="w-4 h-4" /> Security Confirmation
            </div>
            Reset 2FA configuration for <strong>{selectedStaff?.firstName} {selectedStaff?.lastName}</strong> ({selectedStaff?.email})?
            <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-400 list-disc list-inside">
              <li>All active authentication sessions for this user will be revoked immediately.</li>
              <li>The staff member will be required to re-verify via a new email OTP upon next sign-in.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
              Re-enter Head Teacher Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={adminPasswordConfirm}
                onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                placeholder="Enter your current password"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShow2FaResetModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button
              type="submit"
              disabled={submitting2Fa}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              {submitting2Fa ? 'Resetting 2FA...' : 'Confirm & Reset 2FA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Employment Contract Modal */}
      <EmploymentContractModal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        staff={selectedStaff}
        currentUser={currentUser}
      />

      {/* School Subject Management Modal */}
      <SubjectManagementModal
        isOpen={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        onSubjectsUpdated={fetchStaff}
      />

    </motion.div>
  );
};
