import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, ShieldAlert, KeyRound, UserX, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

export const StaffManagementView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  // Selected staff for edit/reset
  const [selectedStaff, setSelectedStaff] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    roleId: '', // Ideally fetched from DB, but we will mock or type the roles
    salaryAmount: ''
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes] = await Promise.all([
        apiClient.get('/api/staff'),
        apiClient.get('/api/staff/roles')
      ]);
      setStaff(staffRes.data.data);
      setRoles(rolesRes.data.data);
    } catch (error) {
      toast.error('Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // In a real scenario, we'd fetch the roleId from a /api/roles endpoint.
      // For Phase 1 demo, we'll assume a hardcoded role ID for 'TEACHER' if left blank.
      const payload = { ...formData };
      const res = await apiClient.post('/api/staff', payload);
      
      toast.success(`Staff added! Default password: ${res.data.defaultPassword}`, { autoClose: false });
      setShowAddModal(false);
      setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '', roleId: '', salaryAmount: '' });
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add staff');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/api/staff/${selectedStaff.id}`, formData);
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
      const res = await apiClient.post(`/api/staff/${selectedStaff.id}/reset-password`);
      toast.success(`Password reset successful! New password: ${res.data.defaultPassword}`, { autoClose: false });
      setShowResetModal(false);
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const openEditModal = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setFormData({
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      email: staffMember.email,
      phoneNumber: staffMember.phoneNumber,
      roleId: staffMember.roleId,
      salaryAmount: staffMember.salaryAmount || ''
    });
    setShowEditModal(true);
  };

  const openResetModal = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setShowResetModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold">Staff Directory</h2>
          <p className="text-sm text-slate-500">Manage school employees and accounts</p>
        </div>
        <button
          onClick={() => {
            setFormData({ firstName: '', lastName: '', email: '', phoneNumber: '', roleId: roles.length > 0 ? roles[0].id : '', salaryAmount: '' });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
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
                  <td colSpan={5} className="p-8 text-center text-slate-500">No staff found. Add some test data!</td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">
                        {s.roleName}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-900 dark:text-white">{s.email}</div>
                      <div className="text-xs text-slate-500">{s.phoneNumber}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 w-max ${s.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {s.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`p-1.5 transition-colors ${s.isActive ? 'text-slate-400 hover:text-red-600 dark:hover:text-red-400' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                          title={s.isActive ? "Deactivate Account" : "Activate Account"}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Staff">
        <form onSubmit={handleAddSubmit} className="space-y-4">
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
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address *</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number *</label>
            <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
            <select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm">
              <option value="" disabled>Select a role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">Add Staff</button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff Details">
        <form onSubmit={handleEditSubmit} className="space-y-4">
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
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Email Address *</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number *</label>
            <input type="text" required value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Role *</label>
            <select required value={formData.roleId} onChange={e => setFormData({...formData, roleId: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm">
              <option value="" disabled>Select a role</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={showResetModal} onClose={() => setShowResetModal(false)} title="Reset Password">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-xl text-sm">
            Are you sure you want to reset the password for <strong>{selectedStaff?.firstName} {selectedStaff?.lastName}</strong>? This will invalidate their current password and generate a new temporary password.
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">Cancel</button>
            <button onClick={handleResetPassword} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl">Yes, Reset Password</button>
          </div>
        </div>
      </Modal>

    </motion.div>
  );
};
