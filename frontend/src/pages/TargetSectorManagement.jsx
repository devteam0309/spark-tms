import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { HiPlus, HiPencil, HiTrash, HiTag } from 'react-icons/hi';

export default function TargetSectorManagement() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, sector: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, sector: null });
  const [deleting, setDeleting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const fetchSectors = async () => {
    try {
      const { data } = await api.get('/target-sectors');
      setSectors(data);
    } catch {
      toast.error('Failed to load target sectors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSectors(); }, []);

  const openCreate = () => {
    reset({ name: '', isActive: true });
    setModal({ open: true, sector: null });
  };

  const openEdit = (s) => {
    reset({ name: s.name, isActive: s.isActive });
    setModal({ open: true, sector: s });
  };

  const onSubmit = async (data) => {
    try {
      if (modal.sector) {
        await api.put(`/target-sectors/${modal.sector._id}`, data);
        toast.success('Target sector updated');
      } else {
        await api.post('/target-sectors', data);
        toast.success('Target sector created');
      }
      setModal({ open: false, sector: null });
      fetchSectors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal.sector) return;
    setDeleting(true);
    try {
      await api.delete(`/target-sectors/${deleteModal.sector._id}`);
      toast.success('Target sector deleted');
      setDeleteModal({ open: false, sector: null });
      fetchSectors();
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
          <h1 className="page-title">Target Sector Management</h1>
          <p className="page-subtitle">{sectors.length} target sectors configured</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <HiPlus className="h-4 w-4" />
          Add Target Sector
        </button>
      </div>

      {sectors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <HiTag className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No target sectors configured yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map(s => (
            <div key={s._id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    <HiTag className="h-5 w-5 text-primary-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                </div>
                <span className={`badge ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => openEdit(s)} className="btn-secondary btn-sm flex-1">
                  <HiPencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteModal({ open: true, sector: s })}
                  className="btn-secondary btn-sm text-red-500 hover:text-red-700"
                >
                  <HiTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, sector: null })}
        title={modal.sector ? 'Edit Target Sector' : 'Add Target Sector'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              placeholder="e.g. New Hires"
              className={`input ${errors.name ? 'input-error' : ''}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          {modal.sector && (
            <div className="flex items-center gap-2">
              <input {...register('isActive')} type="checkbox" id="sectorActive" className="w-4 h-4 text-primary-600 rounded" />
              <label htmlFor="sectorActive" className="text-sm text-gray-700">Active</label>
            </div>
          )}
          <p className="text-xs text-gray-400">
            {modal.sector
              ? 'Inactive sectors stay on existing records but no longer appear as options on new submissions.'
              : 'This will appear as a selectable option on the training activity form.'}
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal({ open: false, sector: null })} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : modal.sector ? 'Save Changes' : 'Create Target Sector'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, sector: null })}
        title="Delete Target Sector"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-2">
          Are you sure you want to delete <strong>{deleteModal.sector?.name}</strong>?
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
          This will fail if any training records use this sector. Deactivate it instead to preserve history.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteModal({ open: false, sector: null })} className="btn-secondary" disabled={deleting}>Cancel</button>
          <button onClick={confirmDelete} className="btn-danger" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
