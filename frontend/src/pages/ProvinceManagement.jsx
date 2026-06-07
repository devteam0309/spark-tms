import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { HiPlus, HiPencil, HiTrash, HiOfficeBuilding, HiUsers } from 'react-icons/hi';

export default function ProvinceManagement() {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, province: null });
  const [detailModal, setDetailModal] = useState({ open: false, province: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, province: null });
  const [deleting, setDeleting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchProvinces = async () => {
    try {
      const { data } = await api.get('/provinces');
      setProvinces(data);
    } catch {
      toast.error('Failed to load provinces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProvinces(); }, []);

  const openCreate = () => {
    reset({ region: 'REGION IV-B (MIMAROPA)', isActive: true });
    setModal({ open: true, province: null });
  };

  const openEdit = (p) => {
    reset({ name: p.name, code: p.code, region: p.region, isActive: p.isActive });
    setModal({ open: true, province: p });
  };

  const openDetail = async (p) => {
    try {
      const { data } = await api.get(`/provinces/${p._id}`);
      setDetailModal({ open: true, province: data });
    } catch {
      toast.error('Failed to load province details');
    }
  };

  const onSubmit = async (data) => {
    try {
      if (modal.province) {
        await api.put(`/provinces/${modal.province._id}`, data);
        toast.success('Province updated');
      } else {
        await api.post('/provinces', data);
        toast.success('Province created');
      }
      setModal({ open: false, province: null });
      fetchProvinces();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.province) return;
    setDeleting(true);
    try {
      await api.delete(`/provinces/${deleteModal.province._id}`);
      toast.success('Province deleted');
      setDeleteModal({ open: false, province: null });
      fetchProvinces();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Province Management</h1>
          <p className="page-subtitle">{provinces.length} provinces configured</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <HiPlus className="h-4 w-4" />
          Add Province
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {provinces.map(p => (
          <div key={p._id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <HiOfficeBuilding className="h-5 w-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{p.code} · {p.region}</p>
                </div>
              </div>
              <span className={`badge ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {p.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => openDetail(p)} className="btn-secondary btn-sm flex-1">
                <HiUsers className="h-4 w-4" />
                Focals
              </button>
              <button onClick={() => openEdit(p)} className="btn-secondary btn-sm">
                <HiPencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteModal({ open: true, province: p })}
                className="btn-secondary btn-sm text-red-500 hover:text-red-700"
              >
                <HiTrash className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, province: null })}
        title={modal.province ? 'Edit Province' : 'Add Province'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Province Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. Marinduque"
              className={`input ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Code *</label>
              <input
                {...register('code', { required: 'Code is required' })}
                placeholder="e.g. MAR"
                className={`input uppercase ${errors.code ? 'input-error' : ''}`}
              />
              {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="label">Region</label>
              <input {...register('region')} className="input" />
            </div>
          </div>
          {modal.province && (
            <div className="flex items-center gap-2">
              <input {...register('isActive')} type="checkbox" id="provActive" className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="provActive" className="text-sm text-gray-700">Active</label>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal({ open: false, province: null })} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : modal.province ? 'Save Changes' : 'Create Province'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Focals Detail Modal */}
      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, province: null })}
        title={`${detailModal.province?.name} — Province Focals`}
        size="md"
      >
        {detailModal.province && (
          <div>
            {detailModal.province.focals?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No province focals assigned</p>
            ) : (
              <div className="space-y-2">
                {detailModal.province.focals?.map(f => (
                  <div key={f._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.firstName} {f.lastName}</p>
                      <p className="text-xs text-gray-500">{f.email} · @{f.username}</p>
                    </div>
                    <span className={`badge ${f.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {f.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, province: null })}
        title="Delete Province"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-2">
          Are you sure you want to delete <strong>{deleteModal.province?.name}</strong>?
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
          This will fail if the province has linked training records. Deactivate it instead to preserve history.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteModal({ open: false, province: null })} className="btn-secondary" disabled={deleting}>Cancel</button>
          <button onClick={confirmDelete} className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
