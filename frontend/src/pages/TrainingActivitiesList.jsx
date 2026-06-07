import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
} from '@tanstack/react-table';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { formatDate, QUARTERS, STATUS_CONFIG, YEARS } from '../utils/helpers';
import {
  HiPlus, HiSearch, HiFilter, HiPencil, HiEye, HiTrash,
  HiChevronLeft, HiChevronRight, HiRefresh,
} from 'react-icons/hi';

export default function TrainingActivitiesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', quarter: '', year: '', province: '' });
  const [provinces, setProvinces] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const fetchTrainings = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search, ...filters };
      const { data } = await api.get('/trainings', { params });
      setTrainings(data.trainings);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast.error('Failed to load trainings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { api.get('/provinces').then(r => setProvinces(r.data)); }, []);
  useEffect(() => { fetchTrainings(); }, [page, filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTrainings();
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/trainings/${deleteId}`);
      toast.success('Training deleted');
      setDeleteId(null);
      fetchTrainings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Period',
      cell: ({ row }) => (
        <span className="font-semibold text-primary-700 whitespace-nowrap">
          {row.original.year} {row.original.quarter}
        </span>
      ),
      size: 80,
    },
    {
      header: 'Training Course',
      accessorKey: 'trainingCourse',
      cell: info => (
        <Link to={`/trainings/${info.row.original._id}`} className="font-medium text-gray-900 hover:text-primary-700 line-clamp-2 max-w-xs">
          {info.getValue()}
        </Link>
      ),
    },
    {
      header: 'Province',
      accessorKey: 'province',
      cell: info => info.getValue()?.name || '—',
    },
    {
      header: 'Dates',
      cell: ({ row }) => (
        <div className="text-xs text-gray-600">
          <p>{formatDate(row.original.startDate)}</p>
          <p className="text-gray-400">to {formatDate(row.original.endDate)}</p>
        </div>
      ),
    },
    {
      header: 'Enrolled',
      accessorKey: 'totalEnrolled',
      cell: info => <span className="font-medium">{info.getValue() || 0}</span>,
    },
    {
      header: 'Graduates',
      accessorKey: 'numberOfGraduates',
      cell: info => <span className="font-medium">{info.getValue() || 0}</span>,
    },
    {
      header: 'Rate',
      accessorKey: 'completionRate',
      cell: info => {
        const v = info.getValue() || 0;
        const color = v >= 80 ? 'text-green-600' : v >= 50 ? 'text-amber-600' : 'text-red-500';
        return <span className={`font-semibold ${color}`}>{v}%</span>;
      },
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: info => <StatusBadge status={info.getValue()} />,
    },
    {
      header: 'Docs',
      cell: ({ row }) => {
        const missing = row.original.missingDocuments?.length || 0;
        return missing > 0
          ? <span className="text-xs text-red-500 font-medium">{missing} missing</span>
          : <span className="text-xs text-green-600">Complete</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const t = row.original;
        const canEdit = user.role === 'spark_focal' || ['draft', 'for_revision'].includes(t.status);
        return (
          <div className="flex items-center gap-1">
            <Link to={`/trainings/${t._id}`} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
              <HiEye className="h-4 w-4" />
            </Link>
            {canEdit && (
              <Link to={`/trainings/${t._id}/edit`} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded">
                <HiPencil className="h-4 w-4" />
              </Link>
            )}
            {(user.role === 'spark_focal' || ['draft', 'for_revision', 'submitted'].includes(t.status)) &&
              !['approved', 'completed', 'consolidated'].includes(t.status) && (
              <button onClick={() => setDeleteId(t._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                <HiTrash className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ], [user]);

  const table = useReactTable({
    data: trainings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pages,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Training Activities</h1>
          <p className="page-subtitle">{total} records found</p>
        </div>
        <Link to="/trainings/new" className="btn-primary">
          <HiPlus className="h-4 w-4" />
          New Training
        </Link>
      </div>

      {/* Filters */}
      <div className="card card-body">
        <div className="flex flex-wrap gap-3 items-end">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search training, trainer, venue…"
                className="input pl-9"
              />
            </div>
            <button type="submit" className="btn-primary btn-sm">Search</button>
          </form>

          <div className="flex gap-2 flex-wrap">
            <select
              value={filters.year}
              onChange={e => { setFilters(f => ({ ...f, year: e.target.value })); setPage(1); }}
              className="input w-24 text-sm"
            >
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              value={filters.quarter}
              onChange={e => { setFilters(f => ({ ...f, quarter: e.target.value })); setPage(1); }}
              className="input w-20 text-sm"
            >
              <option value="">All Q</option>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>

            <select
              value={filters.status}
              onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
              className="input w-36 text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            {user.role === 'spark_focal' && (
              <select
                value={filters.province}
                onChange={e => { setFilters(f => ({ ...f, province: e.target.value })); setPage(1); }}
                className="input w-44 text-sm"
              >
                <option value="">All Provinces</option>
                {provinces.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            )}

            <button
              onClick={() => { setFilters({ status: '', quarter: '', year: '', province: '' }); setSearch(''); setPage(1); }}
              className="btn-secondary btn-sm"
            >
              <HiRefresh className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(h => (
                      <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                      No training records found
                    </td>
                  </tr>
                ) : table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {pages} ({total} records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary btn-sm"
              >
                <HiChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="btn-secondary btn-sm"
              >
                <HiChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Training" size="sm">
        <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this training record? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
