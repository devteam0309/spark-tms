import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { downloadBlob, QUARTERS, STATUS_CONFIG, YEARS } from '../utils/helpers';
import { HiDownload, HiDocumentText, HiTable } from 'react-icons/hi';

export default function Reports() {
  const { user } = useAuth();
  const [provinces, setProvinces] = useState([]);
  const [filters, setFilters] = useState({ year: '', quarter: '', status: '', province: '' });
  const [exporting, setExporting] = useState({ excel: false, pdf: false });

  useEffect(() => {
    api.get('/provinces').then(r => setProvinces(r.data));
  }, []);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.quarter) params.append('quarter', filters.quarter);
    if (filters.status) params.append('status', filters.status);
    if (filters.province) params.append('province', filters.province);
    return params.toString();
  };

  const handleExcelExport = async () => {
    setExporting(e => ({ ...e, excel: true }));
    try {
      const qs = buildParams();
      const { data } = await api.get(`/exports/excel${qs ? '?' + qs : ''}`, {
        responseType: 'blob',
      });
      downloadBlob(data, 'SPARK_Training_Activities.xlsx');
      toast.success('Excel file downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(e => ({ ...e, excel: false }));
    }
  };

  const handlePDFExport = async () => {
    setExporting(e => ({ ...e, pdf: true }));
    try {
      const qs = buildParams();
      const { data } = await api.get(`/exports/pdf${qs ? '?' + qs : ''}`, {
        responseType: 'blob',
      });
      downloadBlob(data, 'SPARK_Summary_Report.pdf');
      toast.success('PDF file downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(e => ({ ...e, pdf: false }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Reports & Exports</h1>
        <p className="page-subtitle">Export training data to Excel or PDF</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-gray-900">Export Filters</h3>
          <p className="text-sm text-gray-500 mt-0.5">Filter the data before exporting</p>
        </div>
        <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Year</label>
            <select
              value={filters.year}
              onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
              className="input"
            >
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Quarter</label>
            <select
              value={filters.quarter}
              onChange={e => setFilters(f => ({ ...f, quarter: e.target.value }))}
              className="input"
            >
              <option value="">All Quarters</option>
              {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="input"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          {user.role === 'spark_focal' && (
            <div>
              <label className="label">Province</label>
              <select
                value={filters.province}
                onChange={e => setFilters(f => ({ ...f, province: e.target.value }))}
                className="input"
              >
                <option value="">All Provinces</option>
                {provinces.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
            <HiTable className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Export to Excel</h3>
            <p className="text-sm text-gray-500 mt-1">
              Complete training data with all fields in .xlsx format
            </p>
          </div>
          <button
            onClick={handleExcelExport}
            disabled={exporting.excel}
            className="btn-success w-full"
          >
            {exporting.excel ? (
              <><LoadingSpinner size="sm" /> Exporting…</>
            ) : (
              <><HiDownload className="h-4 w-4" /> Download Excel</>
            )}
          </button>
        </div>

        <div className="card p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
            <HiDocumentText className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Export Summary PDF</h3>
            <p className="text-sm text-gray-500 mt-1">
              Summary report with key statistics and tables in .pdf format
            </p>
          </div>
          <button
            onClick={handlePDFExport}
            disabled={exporting.pdf}
            className="btn-danger w-full"
          >
            {exporting.pdf ? (
              <><LoadingSpinner size="sm" /> Exporting…</>
            ) : (
              <><HiDownload className="h-4 w-4" /> Download PDF</>
            )}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">Export Notes</p>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Excel export includes all training fields and document link statuses.</li>
          <li>PDF export shows a summary with key statistics and a condensed table.</li>
          <li>Filters applied above will be reflected in both exports.</li>
          {user.role === 'province_focal' && (
            <li>Only your province's training records will be exported.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
