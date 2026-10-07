import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, ShieldAlert, UserX, UserCheck, MailWarning, Clock, Ban, Send, RefreshCw, Lock, AlertTriangle, Mail, CheckCircle2, XCircle, FileText, BookOpen, Users, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { SearchableSelect } from '../../components/SearchableSelect';
import { EmploymentContractModal } from './EmploymentContractModal';
import { SubjectManagementModal } from './SubjectManagementModal';
import { TeachingSubjectPicker } from './TeachingSubjectPicker';

export const StaffManagementView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailRecoveryModal, setShowEmailRecoveryModal] = useState(false);
  const [show2FaResetModal, setShow2FaResetModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<any | null>(null);
  const [deletingInvitation, setDeletingInvitation] = useState(false);

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

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;
    setDeletingInvitation(true);
    try {
      await apiClient.delete(`/api/staff/invitations/${invitationToDelete.id}`);
      toast.success(`Staff invitation for ${invitationToDelete.firstName} ${invitationToDelete.lastName} deleted successfully`);
      setInvitationToDelete(null);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete invitation');
    } finally {
      setDeletingInvitation(false);
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

  const openEmailRecoveryModal = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setNewEmailInput('');
    setConfirmNewEmailInput('');
    setEmailChangeAdminPassword('');
    setShowEmailRecoveryModal(true);
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
      setShowEmailRecoveryModal(false);
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
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max ${s.isActive ? 'bg-sky-50 text-sky-700 border border-sky-200/80' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
            {s.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            {s.isActive ? 'Active' : 'Inactive'}
          </span>
          {s.twoFactorResetRequired && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100/60 text-sky-800 border border-sky-200">
              2FA: Setup Required
            </span>
          )}
        </div>
      );
    } else {
      switch (s.invitationStatus) {
        case 'PENDING':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max bg-sky-100/60 text-sky-800 border border-sky-200">
              <MailWarning className="w-3 h-3" /> Pending Invitation
            </span>
          );
        case 'EXPIRED':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max bg-rose-50 text-rose-600 border border-rose-100">
              <Clock className="w-3 h-3" /> Expired
            </span>
          );
        case 'CANCELLED':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max bg-slate-100 text-slate-600 border border-slate-200">
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
      className="space-y-4 sm:space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Users className="w-4 h-4 text-sky-500" />
            Human Resources & Staff Management
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Staff Directory & User Invitations</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Manage school employees, subject qualifications, role invitations, and employment contracts.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2.5 bg-sky-50 hover:bg-sky-100/80 text-sky-700 border border-sky-200/70 rounded-xl font-bold text-xs flex items-center gap-2 transition-all min-h-[42px] cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-500" /> Manage Subjects
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowInviteModal(true);
            }}
            className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all min-h-[42px] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Invite Staff
          </button>
        </div>
      </div>

      <div className="bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-glass border border-sky-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-sky-50/70 border-b border-sky-100 text-xs uppercase tracking-wider text-slate-600 font-bold">
                <th className="p-3.5 sm:p-4">Name</th>
                <th className="p-3.5 sm:p-4">Role</th>
                <th className="p-3.5 sm:p-4">Contact</th>
                <th className="p-3.5 sm:p-4">Status</th>
                <th className="p-3.5 sm:p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50 text-sm">
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
                  <tr key={s.id} className="hover:bg-sky-50/40 transition-colors">
                    <td className="p-4 font-semibold text-slate-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 bg-sky-50 border border-sky-100 text-sky-700 rounded-lg text-xs font-semibold inline-block">
                          {s.roleName}
                        </span>
                        {s.assignedSubjects && s.assignedSubjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {s.assignedSubjects.map((sub: any) => (
                              <span key={sub.id} className="px-1.5 py-0.5 bg-sky-100/70 text-sky-800 border border-sky-200 text-[10px] font-mono font-bold rounded">
                                {sub.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-900">{s.email}</div>
                      <div className="text-xs text-slate-500">{s.phoneNumber}</div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(s)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedStaff(s);
                            setShowContractModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Employment Contract Preview & Print"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {!s.isInvitation ? (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEmailRecoveryModal(s)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="Recover / Change Staff Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStaff(s);
                                setAdminPasswordConfirm('');
                                setShow2FaResetModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                              title="Reset 2FA Configuration"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(s)}
                              className={`p-1.5 transition-colors ${s.isActive ? 'text-slate-400 hover:text-red-600' : 'text-slate-400 hover:text-sky-600'}`}
                              title={s.isActive ? "Deactivate Account" : "Activate Account"}
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {s.invitationStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleResendInvitation(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                  title="Resend Invitation"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleCancelInvitation(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel Invitation"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {s.invitationStatus === 'EXPIRED' && (
                              <>
                                <button
                                  onClick={() => handleResendInvitation(s.id)}
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                  title="Resend Invitation (60 mins)"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setInvitationToDelete(s)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Expired Staff Member"
                                >
                                  <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                                </button>
                              </>
                            )}
                            {s.invitationStatus === 'CANCELLED' && (
                              <button
                                onClick={() => setInvitationToDelete(s)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Cancelled Staff Member"
                              >
                                <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
                              </button>
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
        <form onSubmit={handleInviteSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 sm:px-2">
          
          <div className="pb-2 border-b border-sky-100">
            <h3 className="text-sm font-bold text-slate-800">Personal Details</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">First Name *</label>
              <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Last Name *</label>
              <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">National ID / Passport *</label>
              <input type="text" required value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number *</label>
              <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Address</label>
            <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
          </div>

          <div className="pb-2 pt-4 border-b border-sky-100">
            <h3 className="text-sm font-bold text-slate-800">Professional Details</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address * (For Invitation)</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
              <SearchableSelect
                required
                value={formData.roleId}
                onChange={(val) => setFormData({ ...formData, roleId: val })}
                placeholder="-- Select a role --"
                searchPlaceholder="Search role..."
                options={roles.map((r) => ({
                  value: r.id,
                  label: r.name.replace(/_/g, ' '),
                }))}
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">TSC Number <span className="font-normal text-slate-400 text-[11px]">(Required for Teachers)</span></label>
              <input type="text" value={formData.tscNumber} onChange={e => setFormData({...formData, tscNumber: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>

          {isTeachingRole(formData.roleId) && (
            <TeachingSubjectPicker
              subjects={subjects}
              selectedSubjectIds={selectedSubjectIds}
              onToggleSubject={toggleSubjectSelection}
              onClearAll={() => setSelectedSubjectIds([])}
            />
          )}

          <div className="pb-2 pt-4 border-b border-sky-100">
            <h3 className="text-sm font-bold text-slate-800">Financial Details</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Salary Amount (KSH)</label>
              <input type="number" value={formData.salaryAmount} onChange={e => setFormData({...formData, salaryAmount: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Payment Day (1-31)</label>
              <input type="number" min="1" max="31" value={formData.salaryPaymentDay} onChange={e => setFormData({...formData, salaryPaymentDay: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 mt-4 sm:mt-6 border-t border-sky-100 sticky bottom-0 bg-white">
            <button type="button" onClick={() => setShowInviteModal(false)} className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl shadow-xs min-h-[40px] transition-colors">Cancel</button>
            <button
              type="button"
              onClick={handlePreviewContractFromInvite}
              className="w-full sm:w-auto px-4 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors min-h-[40px]"
            >
              <FileText className="w-4 h-4 text-sky-600" /> Preview Contract
            </button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-glass min-h-[40px] transition-all">
              <Send className="w-4 h-4" /> Send Invitation
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff Details">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1 sm:px-2">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">First Name *</label>
              <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Last Name *</label>
              <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">National ID / Passport *</label>
              <input type="text" required value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number *</label>
              <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address *</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
              <SearchableSelect
                required
                value={formData.roleId}
                onChange={(val) => setFormData({ ...formData, roleId: val })}
                placeholder="-- Select a role --"
                searchPlaceholder="Search role..."
                options={roles.map((r) => ({
                  value: r.id,
                  label: r.name.replace(/_/g, ' '),
                }))}
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 mb-1">TSC Number <span className="font-normal text-slate-400 text-[11px]">(Teachers)</span></label>
              <input type="text" value={formData.tscNumber} onChange={e => setFormData({...formData, tscNumber: e.target.value})} className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>

          {isTeachingRole(formData.roleId) && (
            <TeachingSubjectPicker
              subjects={subjects}
              selectedSubjectIds={selectedSubjectIds}
              onToggleSubject={toggleSubjectSelection}
              onClearAll={() => setSelectedSubjectIds([])}
            />
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-sky-100">
            <button type="button" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl shadow-xs min-h-[40px] transition-colors">Cancel</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-glass min-h-[40px] transition-all">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Staff Email Recovery & Address Change Modal */}
      <Modal isOpen={showEmailRecoveryModal} onClose={() => setShowEmailRecoveryModal(false)} title="Staff Email Recovery & Address Change" maxWidth="max-w-lg">
        <form onSubmit={handleInitiateEmailChange} className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sky-600">
            <Mail className="w-5 h-5 text-sky-500" /> Email Recovery & Address Change
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            If staff member lost access to <strong className="text-slate-900">{selectedStaff?.email}</strong>, enter their new email address below. A verification link will be sent to the new inbox.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              New Email Address *
            </label>
            <input
              type="email"
              required
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
              placeholder="e.g. new.email@gmail.com"
              className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-600">
                Confirm New Email Address *
              </label>
              {confirmNewEmailInput.length > 0 && (
                <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                  newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0
                    ? 'text-sky-600'
                    : 'text-rose-500'
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
                className={`w-full bg-white border rounded-xl px-4 py-2 pr-10 text-xs text-slate-800 outline-none transition-all ${
                  confirmNewEmailInput.length > 0
                    ? newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0
                      ? 'border-sky-500 ring-1 ring-sky-500/30'
                      : 'border-rose-500 ring-1 ring-rose-500/30'
                    : 'border-sky-200 focus:border-sky-500'
                }`}
              />
              {confirmNewEmailInput.length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {newEmailInput.trim().toLowerCase() === confirmNewEmailInput.trim().toLowerCase() && newEmailInput.trim().length > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
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
                className="w-full bg-white border border-sky-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-sky-100">
            <button
              type="button"
              onClick={() => setShowEmailRecoveryModal(false)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl shadow-xs min-h-[40px] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submittingEmailChange ||
                confirmNewEmailInput.length === 0 ||
                newEmailInput.trim().toLowerCase() !== confirmNewEmailInput.trim().toLowerCase() ||
                !emailChangeAdminPassword
              }
              className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-glass disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
            >
              {submittingEmailChange ? 'Sending Link...' : 'Dispatch Email Recovery Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset 2FA Modal */}
      <Modal isOpen={show2FaResetModal} onClose={() => setShow2FaResetModal(false)} title="Reset Two-Factor Authentication (2FA)">
        <form onSubmit={handle2FaReset} className="space-y-4">
          <div className="p-4 bg-sky-50 text-slate-800 rounded-xl text-xs leading-relaxed border border-sky-100">
            <div className="flex items-center gap-2 font-bold text-sky-700 mb-1">
              <AlertTriangle className="w-4 h-4 text-sky-600" /> Security Confirmation
            </div>
            Reset 2FA configuration for <strong className="text-slate-900">{selectedStaff?.firstName} {selectedStaff?.lastName}</strong> ({selectedStaff?.email})?
            <ul className="mt-2 space-y-1 text-xs text-sky-700 list-disc list-inside">
              <li>All active authentication sessions for this user will be revoked immediately.</li>
              <li>The staff member will be required to re-verify via a new email OTP upon next sign-in.</li>
            </ul>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
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
                className="w-full bg-white border border-sky-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-sky-100">
            <button type="button" onClick={() => setShow2FaResetModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl shadow-xs transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={submitting2Fa}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-glass disabled:opacity-50 transition-all"
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

      {/* Delete Staff Member (Expired / Cancelled Invitation) Confirmation Modal */}
      {invitationToDelete && (
        <Modal
          isOpen={!!invitationToDelete}
          onClose={() => !deletingInvitation && setInvitationToDelete(null)}
          title="Delete Inactive Staff Member"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 space-y-1">
                <p className="font-bold">Permanent Deletion</p>
                <p>
                  Are you sure you want to delete this staff member? This will permanently remove the expired invitation record from the school directory, ensuring inactive accounts do not linger in the system.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-sky-50/50 border border-sky-100 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Staff Member:</span>
                <span className="font-bold text-slate-800">{invitationToDelete.firstName} {invitationToDelete.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Role:</span>
                <span className="font-semibold text-sky-700">{invitationToDelete.roleName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono text-slate-700">{invitationToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-extrabold text-rose-600 uppercase">{invitationToDelete.invitationStatus}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-sky-100">
              <button
                type="button"
                onClick={() => setInvitationToDelete(null)}
                disabled={deletingInvitation}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-sky-200 hover:bg-sky-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInvitation}
                disabled={deletingInvitation}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingInvitation ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

    </motion.div>
  );
};
