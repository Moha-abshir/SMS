import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, ShieldAlert, UserX, UserCheck, MailWarning, Clock, Ban, Send, RefreshCw, Lock, AlertTriangle, Mail, CheckCircle2, XCircle, FileText, BookOpen, Users, Trash2, Phone, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { SearchableSelect } from '../../components/SearchableSelect';
import { EmploymentContractModal } from './EmploymentContractModal';
import { SubjectManagementModal } from './SubjectManagementModal';
import { TeachingSubjectPicker } from './TeachingSubjectPicker';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

export const StaffManagementView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'INVITATIONS' | 'DEACTIVATED'>('ACTIVE');

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailRecoveryModal, setShowEmailRecoveryModal] = useState(false);
  const [show2FaResetModal, setShow2FaResetModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<any | null>(null);
  const [deletingInvitation, setDeletingInvitation] = useState(false);
  const [classTeacherWarningModal, setClassTeacherWarningModal] = useState<{
    isOpen: boolean;
    teacherName: string;
    classNames: string;
  }>({
    isOpen: false,
    teacherName: '',
    classNames: '',
  });

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
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [togglingStaffId, setTogglingStaffId] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);
  
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
    if (submittingInvite) return;
    setSubmittingInvite(true);
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
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingEdit) return;
    setSubmittingEdit(true);
    try {
      const payload = {
        ...formData,
        subjectIds: isTeachingRole(formData.roleId) ? selectedSubjectIds : []
      };
      await apiClient.put(`/api/staff/${selectedStaff.id}`, payload);
      toast.success('Staff details updated');
      setShowEditModal(false);
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update staff');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleStatus = async (staffMember: any) => {
    if (togglingStaffId) return;
    if (staffMember.isActive) {
      // 1. Client-side protection: Check if user is currently assigned as class teacher
      if (staffMember.classTeacherFor && staffMember.classTeacherFor.length > 0) {
        const classNames = staffMember.classTeacherFor.map((c: any) => c.name).join(', ');
        setClassTeacherWarningModal({
          isOpen: true,
          teacherName: `${staffMember.firstName} ${staffMember.lastName}`,
          classNames,
        });
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to deactivate ${staffMember.firstName} ${staffMember.lastName}? Their session tokens will be revoked and they will be blocked from logging into the system.`
      );
      if (!confirmed) return;
    }

    setTogglingStaffId(staffMember.id);
    try {
      await apiClient.patch(`/api/staff/${staffMember.id}/status`, {
        isActive: !staffMember.isActive
      });
      toast.success(
        staffMember.isActive
          ? `Staff account for ${staffMember.firstName} ${staffMember.lastName} deactivated. System access blocked.`
          : `Staff account for ${staffMember.firstName} ${staffMember.lastName} reactivated. Login access restored.`
      );
      await fetchStaff();
    } catch (error: any) {
      if (error.response?.data?.code === 'CANNOT_DEACTIVATE_CLASS_TEACHER') {
        const assignedClasses = error.response.data.assignedClasses;
        const classNames = assignedClasses && assignedClasses.length > 0
          ? assignedClasses.map((c: any) => c.name).join(', ')
          : 'an assigned class';
        setClassTeacherWarningModal({
          isOpen: true,
          teacherName: `${staffMember.firstName} ${staffMember.lastName}`,
          classNames,
        });
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to change staff status');
    } finally {
      setTogglingStaffId(null);
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
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset 2FA');
    } finally {
      setSubmitting2Fa(false);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (resendingInviteId) return;
    setResendingInviteId(invitationId);
    try {
      const res = await apiClient.post(`/api/staff/invitations/${invitationId}/resend`);
      toast.success(res.data.emailSent ? 'Invitation resent successfully!' : 'Invitation resent, but email failed to send.');
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (cancellingInviteId) return;
    if (!window.confirm("Are you sure you want to cancel this invitation?")) return;
    setCancellingInviteId(invitationId);
    try {
      await apiClient.post(`/api/staff/invitations/${invitationId}/cancel`);
      toast.success('Invitation cancelled successfully');
      await fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel invitation');
    } finally {
      setCancellingInviteId(null);
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
    const qualifiedList = staffMember.qualifiedSubjects || staffMember.assignedSubjects || [];
    setSelectedSubjectIds(qualifiedList.map((s: any) => s.id));
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

  const activeStaff = useMemo(() => staff.filter((s) => !s.isInvitation && s.isActive), [staff]);
  const deactivatedStaff = useMemo(() => staff.filter((s) => !s.isInvitation && !s.isActive), [staff]);
  const pendingInvitations = useMemo(() => staff.filter((s) => s.isInvitation), [staff]);

  const displayedList = useMemo(() => {
    if (activeTab === 'ACTIVE') return activeStaff;
    if (activeTab === 'DEACTIVATED') return deactivatedStaff;
    return pendingInvitations;
  }, [activeTab, activeStaff, deactivatedStaff, pendingInvitations]);

  const getStatusBadge = (s: any) => {
    if (!s.isInvitation) {
      return (
        <div className="flex flex-col gap-1 items-start">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-max ${
              s.isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
            }`}
          >
            {s.isActive ? <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> : <UserX className="w-3.5 h-3.5 text-rose-500" />}
            {s.isActive ? 'Active' : 'Deactivated & Blocked'}
          </span>
          {s.twoFactorResetRequired && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100/60 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              2FA: Setup Required
            </span>
          )}
        </div>
      );
    } else {
      switch (s.invitationStatus) {
        case 'PENDING':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-max bg-sky-100/60 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <MailWarning className="w-3.5 h-3.5" /> Pending Invitation
            </span>
          );
        case 'EXPIRED':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-max bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50">
              <Clock className="w-3.5 h-3.5" /> Expired
            </span>
          );
        case 'CANCELLED':
          return (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-max bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Ban className="w-3.5 h-3.5" /> Cancelled
            </span>
          );
        default:
          return null;
      }
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'S';
  };

  const renderActionButtons = (s: any) => {
    if (activeTab === 'DEACTIVATED') {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleToggleStatus(s)}
            disabled={togglingStaffId === s.id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Restore account access and allow login"
          >
            {togglingStaffId === s.id ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Reactivating...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Reactivate</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setSelectedStaff(s);
              setShowContractModal(true);
            }}
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Employment Contract Preview & Print"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(s)}
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Edit Details"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (!s.isInvitation) {
      return (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              setSelectedStaff(s);
              setShowContractModal(true);
            }}
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Employment Contract Preview & Print"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(s)}
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Edit Details & Teaching Qualifications"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEmailRecoveryModal(s)}
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Reset 2FA Configuration"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(s)}
            disabled={togglingStaffId === s.id}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              s.classTeacherFor && s.classTeacherFor.length > 0
                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
            title={
              s.classTeacherFor && s.classTeacherFor.length > 0
                ? `Active Class Teacher for ${s.classTeacherFor.map((c: any) => c.name).join(', ')} (Cannot be deactivated)`
                : 'Deactivate Staff Account (Block Access)'
            }
          >
            {togglingStaffId === s.id ? (
              <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {s.invitationStatus === 'PENDING' && (
          <>
            <button
              onClick={() => handleResendInvitation(s.id)}
              disabled={resendingInviteId === s.id}
              className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resend Invitation"
            >
              {resendingInviteId === s.id ? (
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => handleCancelInvitation(s.id)}
              disabled={cancellingInviteId === s.id}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Cancel Invitation"
            >
              {cancellingInviteId === s.id ? (
                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
            </button>
          </>
        )}
        {s.invitationStatus === 'EXPIRED' && (
          <>
            <button
              onClick={() => handleResendInvitation(s.id)}
              disabled={resendingInviteId === s.id}
              className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Resend Invitation (60 mins)"
            >
              {resendingInviteId === s.id ? (
                <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setInvitationToDelete(s)}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Delete Expired Staff Member"
            >
              <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
            </button>
          </>
        )}
        {s.invitationStatus === 'CANCELLED' && (
          <button
            onClick={() => setInvitationToDelete(s)}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Delete Cancelled Staff Member"
          >
            <Trash2 className="w-4 h-4 text-rose-500 hover:text-rose-600" />
          </button>
        )}
      </div>
    );
  };

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Staff Management Directory"
      subtitle="Loading staff profiles, roles, and security credentials..."
      icon={Users}
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-white/80 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Users className="w-4 h-4 text-sky-500" />
            Human Resources & Staff Management
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Staff Directory & User Invitations</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Manage school employees, subject qualifications, role invitations, and employment contracts.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setShowSubjectModal(true)}
            className="flex-1 sm:flex-none justify-center px-3.5 sm:px-4 py-2.5 bg-sky-50 dark:bg-[#0c1830] hover:bg-sky-100/80 dark:hover:bg-[#122347] text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-[#162b4d] rounded-xl font-bold text-xs flex items-center gap-2 transition-all min-h-[42px] cursor-pointer"
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

      {/* Directory Section Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/80 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ACTIVE'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-sky-50/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Staff ({activeStaff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVITATIONS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'INVITATIONS'
                ? 'bg-sky-500 text-white shadow-glass'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-sky-50/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Mail className="w-4 h-4 text-sky-400" />
            <span>Pending Invitations ({pendingInvitations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DEACTIVATED')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'DEACTIVATED'
                ? 'bg-rose-500 text-white shadow-glass'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-rose-50/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserX className="w-4 h-4 text-rose-400" />
            <span>Deactivated Staff ({deactivatedStaff.length})</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing {displayedList.length} staff records
        </div>
      </div>

      {/* Zero Trust Alert Banner when on Deactivated Tab */}
      {activeTab === 'DEACTIVATED' && (
        <div className="p-3.5 sm:p-4 bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl flex items-start sm:items-center gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 leading-relaxed">
            <strong className="font-bold">Zero-Trust Access Restriction:</strong> Deactivated staff accounts are completely blocked from logging in, accessing school portals, and taking roll call. All active session tokens have been revoked. Click <strong>Reactivate</strong> on any staff member below to restore access.
          </div>
        </div>
      )}

      {/* Staff Directory Container: Responsive Cards for Mobile/Tablet (< lg) + Pristine Wide Table for Desktop (>= lg) */}
      <div className="bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-glass border border-sky-100 dark:border-[#162b4d] overflow-hidden">
        {/* 1. Mobile & Split-Screen Responsive Card List (< lg) */}
        <div className="lg:hidden divide-y divide-sky-100/70 dark:divide-[#162b4d]/70">
          {displayedList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              {activeTab === 'ACTIVE' && 'No active staff members found.'}
              {activeTab === 'DEACTIVATED' && 'No deactivated staff accounts. All registered staff are currently active.'}
              {activeTab === 'INVITATIONS' && 'No pending invitations. Click "Invite Staff" above to invite new team members.'}
            </div>
          ) : (
            displayedList.map((s) => (
              <div key={s.id} className="p-4 space-y-3 hover:bg-sky-50/30 dark:hover:bg-[#0c1830]/40 transition-colors">
                {/* Header row: Avatar + Name + TSC + Role & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-200/60 dark:border-sky-800/60 shadow-xs">
                      {getInitials(s.firstName, s.lastName)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                        {s.firstName} {s.lastName}
                      </h3>
                      {s.tscNumber ? (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                          TSC: {s.tscNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block">
                          Staff Member
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className="px-2.5 py-0.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-[#162b4d] text-sky-700 dark:text-sky-300 rounded-lg text-xs font-semibold whitespace-nowrap">
                      {s.roleName ? s.roleName.replace(/_/g, ' ') : 'STAFF'}
                    </span>
                    <div>{getStatusBadge(s)}</div>
                  </div>
                </div>

                {/* Class Teacher Badge (if assigned) */}
                {s.classTeacherFor && s.classTeacherFor.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Class Teacher ({s.classTeacherFor.map((c: any) => c.name).join(', ')})</span>
                  </div>
                )}

                {/* Contact Information */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  {s.phoneNumber && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="pt-2 border-t border-sky-100/60 dark:border-[#162b4d]/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Quick Actions
                  </span>
                  {renderActionButtons(s)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. Desktop Wide Table View (>= lg) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[880px]">
            <thead>
              <tr className="bg-sky-50/70 dark:bg-[#0c1830] border-b border-sky-100 dark:border-[#162b4d] text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 backdrop-blur-md">
                <th className="p-3.5 sm:p-4 min-w-[280px]">Staff Member</th>
                <th className="p-3.5 sm:p-4 min-w-[130px]">Role</th>
                <th className="p-3.5 sm:p-4 min-w-[220px]">Contact Info</th>
                <th className="p-3.5 sm:p-4 min-w-[150px]">Status</th>
                <th className="p-3.5 sm:p-4 min-w-[160px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50 dark:divide-[#162b4d] text-sm">
              {displayedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    {activeTab === 'ACTIVE' && 'No active staff members found.'}
                    {activeTab === 'DEACTIVATED' && 'No deactivated staff accounts. All registered staff are currently active.'}
                    {activeTab === 'INVITATIONS' && 'No pending invitations. Click "Invite Staff" above to invite new team members.'}
                  </td>
                </tr>
              ) : (
                displayedList.map((s) => (
                  <tr key={s.id} className="hover:bg-sky-50/40 dark:hover:bg-[#0c1830]/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-200/60 dark:border-sky-800/60 shadow-xs">
                          {getInitials(s.firstName, s.lastName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {s.firstName} {s.lastName}
                            </span>
                            {s.classTeacherFor && s.classTeacherFor.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 whitespace-nowrap shrink-0"
                                title={`Assigned Class Teacher for ${s.classTeacherFor.map((c: any) => c.name).join(', ')}`}
                              >
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                Class Teacher ({s.classTeacherFor.map((c: any) => c.name).join(', ')})
                              </span>
                            )}
                          </div>
                          {s.tscNumber && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap mt-0.5">
                              TSC: {s.tscNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-[#162b4d] text-sky-700 dark:text-sky-300 rounded-lg text-xs font-semibold whitespace-nowrap inline-block">
                        {s.roleName ? s.roleName.replace(/_/g, ' ') : 'STAFF'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-200 whitespace-nowrap truncate max-w-[220px]">
                        {s.email}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap mt-0.5">
                        {s.phoneNumber || '—'}
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(s)}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        {renderActionButtons(s)}
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
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite New Staff" maxWidth="max-w-2xl lg:max-w-3xl">
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
            <button
              type="submit"
              disabled={submittingInvite}
              className="w-full sm:w-auto px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-glass min-h-[40px] transition-all"
            >
              {submittingInvite ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Sending Invitation...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff Details" maxWidth="max-w-2xl lg:max-w-3xl">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1 sm:px-2">
          
          <div className="pb-2 border-b border-sky-100 dark:border-[#162b4d]">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">First Name *</label>
              <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Last Name *</label>
              <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">National ID / Passport *</label>
              <input type="text" required value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number *</label>
              <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Address</label>
            <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
          </div>

          <div className="pb-2 pt-4 border-b border-sky-100 dark:border-[#162b4d]">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Professional Details</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Email Address *</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Role *</label>
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
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">TSC Number <span className="font-normal text-slate-400 text-[11px]">(Teachers)</span></label>
              <input type="text" value={formData.tscNumber} onChange={e => setFormData({...formData, tscNumber: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
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

          <div className="pb-2 pt-4 border-b border-sky-100 dark:border-[#162b4d]">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Financial Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Salary Amount (KSH)</label>
              <input type="number" value={formData.salaryAmount} onChange={e => setFormData({...formData, salaryAmount: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Payment Day (1-31)</label>
              <input type="number" min="1" max="31" value={formData.salaryPaymentDay} onChange={e => setFormData({...formData, salaryPaymentDay: e.target.value})} className="w-full bg-white dark:bg-[#081224] border border-sky-200 dark:border-[#162b4d] rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors" />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-sky-100 dark:border-[#162b4d] sticky bottom-0 bg-white/95 dark:bg-[#091326]/95 backdrop-blur-md mt-4">
            <button type="button" onClick={() => setShowEditModal(false)} className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700 rounded-xl shadow-xs min-h-[40px] transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={submittingEdit}
              className="w-full sm:w-auto px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-glass min-h-[40px] transition-all"
            >
              {submittingEdit ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
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
              {submittingEmailChange ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Sending Link...</span>
                </>
              ) : (
                'Dispatch Email Recovery Link'
              )}
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
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-glass disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting2Fa ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Resetting 2FA...</span>
                </>
              ) : (
                'Confirm & Reset 2FA'
              )}
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

      {/* Class Teacher Deactivation Protection Modal */}
      <Modal
        isOpen={classTeacherWarningModal.isOpen}
        onClose={() => setClassTeacherWarningModal({ isOpen: false, teacherName: '', classNames: '' })}
        title="Action Restricted: Active Class Teacher"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Cannot Deactivate Class Teacher
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold text-amber-950 dark:text-amber-100">{classTeacherWarningModal.teacherName}</span> is currently assigned as the active Class Teacher for <span className="font-bold text-amber-950 dark:text-amber-100 underline">{classTeacherWarningModal.classNames}</span>.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5 leading-relaxed bg-slate-50 dark:bg-[#071328] p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
            
            <div className="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="text-sky-500"></span> Required Action:
              </p>
              <p>
                Please contact the <strong className="text-sky-600 dark:text-sky-400">Deputy Head Teacher</strong> to unassign or reassign them from <strong className="text-slate-800 dark:text-slate-200">{classTeacherWarningModal.classNames}</strong> in the <span className="font-semibold text-slate-700 dark:text-slate-300">Academic Workstation & Allocations</span> tab. Once unassigned, you will be able to deactivate this account.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setClassTeacherWarningModal({ isOpen: false, teacherName: '', classNames: '' })}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      </Modal>

      </div>
    </PageLoadingWrapper>
  );
};
