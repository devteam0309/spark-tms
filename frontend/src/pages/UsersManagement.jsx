import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDate } from '../utils/helpers';
import { HiPlus, HiPencil, HiTrash, HiLockClosed, HiSearch } from 'react-icons/hi';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, type: '', user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    api.get('/provinces').then(r => setProvinces(r.data));
  }, []);

  const openCreate = () => {
    reset({ role: 'province_focal', isActive: true });
    setModal({ open: true, type: 'create', user: null });
  };

  const openEdit = (u) => {
    reset({
      firstName: u.firstName, lastName: u.lastName, email: u.email,
      username: u.username, role: u.role,
      assignedProvince: u.assignedProvince?._id || '',
      isActive: u.isActive,
    });
    setModal({ open: true, type: 'edit', user: u });
  };

  const openReset = (u) => {
    reset({});
    setModal({ open: true, type: 'reset', user: u });
  };

  const onSubmit = async (data) => {
    try {
      if (modal.type === 'create') {
        await api.post('/users', data);
        toast.success('User created');
      } else if (modal.type === 'edit') {
        await api.put(`/users/${modal.user._id}`, data);
        toast.success('User updated');
      } else if (modal.type === 'reset') {
        await api.put(`/users/${modal.user._id}/reset-password`, { newPassword: data.newPassword });
        toast.success('Password reset');
      }
      setModal({ open: false, type: '', user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.user) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteModal.user._id}`);
      toast.success('User deleted');
      setDeleteModal({ open: false, user: null });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.username}`.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} users</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <HiPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

      <div className="card card-body">
        <div className="relative max-w-sm">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users…" className="input pl-9"
          />
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Province</th>
                <th>Status</th>
                <th>Last Login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td className="font-medium">{u.firstName} {u.lastName}</td>
                  <td className="text-gray-500">{u.username}</td>
                  <td className="text-gray-500">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'spark_focal' ? 'bg-primary-100 text-primary-700' : 'bg-teal-100 text-teal-700'}`}>
                      {u.role === 'spark_focal' ? 'SPARK Focal' : 'Province Focal'}
                    </span>
                  </td>
                  <td className="text-gray-600">{u.assignedProvince?.name || '—'}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-gray-500 text-xs">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                        <HiPencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => openReset(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <HiLockClosed className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteModal({ open: true, user: u })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <HiTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modal.open && modal.type !== 'reset'}
        onClose={() => setModal({ open: false, type: '', user: null })}
        title={modal.type === 'create' ? 'Add New User' : 'Edit User'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input {...register('firstName', { required: true })} className={`input ${errors.firstName ? 'input-error' : ''}`} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input {...register('lastName', { required: true })} className={`input ${errors.lastName ? 'input-error' : ''}`} />
            </div>
          </div>
          <div>
            <label className="label">Username *</label>
            <input {...register('username', { required: true })} className={`input ${errors.username ? 'input-error' : ''}`} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input {...register('email', { required: true })} type="email" className={`input ${errors.email ? 'input-error' : ''}`} />
          </div>
          {modal.type === 'create' && (
            <div>
              <label className="label">Password *</label>
              <input {...register('password', { required: true, minLength: 8 })} type="password" className={`input ${errors.password ? 'input-error' : ''}`} />
              {errors.password?.type === 'minLength' && <p className="text-xs text-red-500 mt-1">Min 8 characters</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Role *</label>
              <select {...register('role', { required: true })} className="input">
                <option value="province_focal">Province Focal</option>
                <option value="spark_focal">SPARK Focal</option>
              </select>
            </div>
            <div>
              <label className="label">Province</label>
              <select {...register('assignedProvince')} className="input">
                <option value="">None</option>
                {provinces.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          {modal.type === 'edit' && (
            <div className="flex items-center gap-2">
              <input {...register('isActive')} type="checkbox" id="isActive" className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active account</label>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal({ open: false, type: '', user: null })} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : modal.type === 'create' ? 'Create User' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
        title="Delete User"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{deleteModal.user?.firstName} {deleteModal.user?.lastName}</strong> (@{deleteModal.user?.username})?
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteModal({ open: false, user: null })} className="btn-secondary" disabled={deleting}>Cancel</button>
          <button onClick={confirmDeleteUser} className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={modal.open && modal.type === 'reset'}
        onClose={() => setModal({ open: false, type: '', user: null })}
        title={`Reset Password — ${modal.user?.firstName} ${modal.user?.lastName}`}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">New Password *</label>
            <input
              {...register('newPassword', { required: true, minLength: 8 })}
              type="password"
              className="input"
              placeholder="Min 8 characters"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal({ open: false, type: '', user: null })} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">Reset Password</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
