import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { formatDate } from '../utils/helpers';
import { HiCheckCircle, HiRefresh, HiEye, HiExclamation, HiChevronLeft, HiChevronRight } from 'react-icons/hi';

export default function ReviewSubmissions() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('submitted');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState({ open: false, type: '', ids: [] });
  const [remarks, setRemarks] = useState('');
  const [actioning, setActioning] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trainings', {
        params: { status: activeFilter, limit: 20, page },
      });
      setTrainings(data.trainings);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [activeFilter]);
  useEffect(() => { fetchData(); setSelected(new Set()); }, [activeFilter, page]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = trainings.length > 0 && trainings.every(t => selected.has(t._id));
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(trainings.map(t => t._id)));
  };

  const closeModal = () => {
    setModal({ open: false, type: '', ids: [] });
    setRemarks('');
  };

  const handleAction = async () => {
    setActioning(true);
    const { type, ids } = modal;
    const results = await Promise.allSettled(
      ids.map(id => api.patch(`/trainings/${id}/status`, { status: type, remarks }))
    );
    const failed = results.filter(r => r.status === 'rejected');
    const succeeded = results.length - failed.length;

    if (ids.length === 1) {
      if (failed.length === 0) toast.success(`Record ${type.replace('_', ' ')}`);
      else toast.error(failed[0].reason?.response?.data?.message || 'Action failed');
    } else if (failed.length === 0) {
      toast.success(`${succeeded} record${succeeded !== 1 ? 's' : ''} ${type.replace('_', ' ')}`);
    } else if (succeeded === 0) {
      toast.error(`Failed to update ${failed.length} record${failed.length !== 1 ? 's' : ''}`);
    } else {
      toast(`${succeeded} updated, ${failed.length} failed — see remaining records for details`, { icon: '⚠️' });
    }

    closeModal();
    setSelected(new Set());
    fetchData();
    setActioning(false);
  };

  const filterTabs = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'for_revision', label: 'For Revision' },
    { key: 'approved', label: 'Approved' },
    { key: 'ongoing', label: 'Ongoing' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Review Submissions</h1>
        <p className="page-subtitle">Review and manage training activity submissions</p>
      </div>

      {/* Filter tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeFilter === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : total === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <HiCheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No {activeFilter.replace('_', ' ')} records</p>
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            {total} record{total !== 1 ? 's' : ''}
          </label>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-primary-700">{selected.size} selected</span>
              {activeFilter === 'submitted' && (
                <button
                  onClick={() => setModal({ open: true, type: 'under_review', ids: [...selected] })}
                  className="btn-primary btn-sm"
                >
                  Mark Under Review
                </button>
              )}
              {['submitted', 'under_review'].includes(activeFilter) && (
                <>
                  <button
                    onClick={() => setModal({ open: true, type: 'approved', ids: [...selected] })}
                    className="btn-success btn-sm"
                  >
                    <HiCheckCircle className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => setModal({ open: true, type: 'for_revision', ids: [...selected] })}
                    className="btn-warning btn-sm"
                  >
                    <HiRefresh className="h-4 w-4" />
                    Return
                  </button>
                </>
              )}
              {activeFilter === 'approved' && (
                <button onClick={() => setModal({ open: true, type: 'ongoing', ids: [...selected] })} className="btn-primary btn-sm">
                  Mark Ongoing
                </button>
              )}
              {activeFilter === 'ongoing' && (
                <button onClick={() => setModal({ open: true, type: 'completed', ids: [...selected] })} className="btn-success btn-sm">
                  Mark Completed
                </button>
              )}
              {activeFilter === 'completed' && (
                <button onClick={() => setModal({ open: true, type: 'consolidated', ids: [...selected] })} className="btn-primary btn-sm">
                  Consolidate
                </button>
              )}
              <button onClick={() => setSelected(new Set())} className="btn-secondary btn-sm">Clear</button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {trainings.map(t => (
            <div key={t._id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected.has(t._id)}
                    onChange={() => toggleSelect(t._id)}
                    className="mt-1.5 flex-shrink-0 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{t.quarter}</span>
                    <span className="text-xs text-gray-500">{t.province?.name}</span>
                    <StatusBadge status={t.status} />
                    {t.missingDocuments?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <HiExclamation className="h-3 w-3" />
                        {t.missingDocuments.length} docs missing
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mt-1 truncate">{t.trainingCourse}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{formatDate(t.startDate)} – {formatDate(t.endDate)}</span>
                    <span>{t.mode}</span>
                    <span>Enrolled: {t.totalEnrolled}</span>
                    <span>Graduates: {t.numberOfGraduates}</span>
                    {t.completionRate > 0 && <span>{t.completionRate}% completion</span>}
                  </div>
                  {t.remarks && (
                    <p className="mt-1 text-xs text-amber-700 italic">Remarks: "{t.remarks}"</p>
                  )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/trainings/${t._id}`} className="btn-secondary btn-sm">
                    <HiEye className="h-4 w-4" />
                    View
                  </Link>

                  {t.status === 'submitted' && (
                    <button
                      onClick={() => setModal({ open: true, type: 'under_review', ids: [t._id] })}
                      className="btn-primary btn-sm"
                    >
                      Review
                    </button>
                  )}
                  {['submitted', 'under_review'].includes(t.status) && (
                    <>
                      <button
                        onClick={() => setModal({ open: true, type: 'approved', ids: [t._id] })}
                        className="btn-success btn-sm"
                      >
                        <HiCheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setModal({ open: true, type: 'for_revision', ids: [t._id] })}
                        className="btn-warning btn-sm"
                      >
                        <HiRefresh className="h-4 w-4" />
                        Return
                      </button>
                    </>
                  )}
                  {t.status === 'approved' && (
                    <button onClick={() => setModal({ open: true, type: 'ongoing', ids: [t._id] })} className="btn-primary btn-sm">
                      Ongoing
                    </button>
                  )}
                  {t.status === 'ongoing' && (
                    <button onClick={() => setModal({ open: true, type: 'completed', ids: [t._id] })} className="btn-success btn-sm">
                      Complete
                    </button>
                  )}
                  {t.status === 'completed' && (
                    <button onClick={() => setModal({ open: true, type: 'consolidated', ids: [t._id] })} className="btn-primary btn-sm">
                      Consolidate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary btn-sm">
                <HiChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-secondary btn-sm">
                <HiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Action modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={`Confirm: ${modal.type?.replace(/_/g, ' ')}${modal.ids.length > 1 ? ` (${modal.ids.length} records)` : ''}`}
        size="sm"
      >
        <div className="space-y-4">
          {['for_revision', 'approved', 'consolidated'].includes(modal.type) && (
            <div>
              <label className="label">
                Remarks {modal.type === 'for_revision' ? <span className="text-red-500">*</span> : '(optional)'}
              </label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder={modal.type === 'for_revision' ? 'Describe what needs to be revised…' : 'Optional remarks…'}
                className="input resize-none"
              />
              {modal.ids.length > 1 && (
                <p className="text-xs text-gray-400 mt-1">The same remarks will be applied to all {modal.ids.length} selected records.</p>
              )}
            </div>
          )}
          <p className="text-sm text-gray-600">
            {modal.ids.length > 1 ? (
              <>This will update <strong>{modal.ids.length}</strong> selected records to <strong>{modal.type?.replace(/_/g, ' ')}</strong>.{modal.type === 'for_revision' && ' Each province focal will be notified.'}</>
            ) : (
              <>
                {modal.type === 'under_review' && 'Mark this submission as under review?'}
                {modal.type === 'approved' && 'Approve this training activity?'}
                {modal.type === 'for_revision' && 'Return this record for revision? The province focal will be notified.'}
                {modal.type === 'ongoing' && 'Mark this training as currently ongoing?'}
                {modal.type === 'completed' && 'Mark this training as completed?'}
                {modal.type === 'consolidated' && 'Mark this training as consolidated?'}
              </>
            )}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={closeModal}
              className="btn-secondary"
              disabled={actioning}
            >
              Cancel
            </button>
            <button
              onClick={handleAction}
              disabled={actioning || (modal.type === 'for_revision' && !remarks.trim())}
              className={modal.type === 'for_revision' ? 'btn-warning' : modal.type === 'approved' ? 'btn-success' : 'btn-primary'}
            >
              {actioning ? 'Processing…' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
