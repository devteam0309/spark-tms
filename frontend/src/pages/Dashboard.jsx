import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, Title,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import { formatDate, STATUS_CONFIG, YEARS } from '../utils/helpers';
import {
  HiClipboardList, HiClock, HiRefresh, HiCheckCircle,
  HiExclamation, HiTrendingUp, HiDocumentText,
} from 'react-icons/hi';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState('');

  useEffect(() => {
    setLoading(true);
    const endpoint = user.role === 'spark_focal' ? '/dashboard/spark' : '/dashboard/province';
    const params = year ? { year } : {};
    api.get(endpoint, { params })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.role, year]);

  if (loading) return <LoadingSpinner fullPage />;
  if (!data) return <p className="text-gray-500">Failed to load dashboard.</p>;

  if (user.role === 'spark_focal') return <SparkDashboard data={data} year={year} setYear={setYear} />;
  return <ProvinceDashboard data={data} user={user} year={year} setYear={setYear} />;
}

function SparkDashboard({ data, year, setYear }) {
  const statusColors = {
    draft: '#9CA3AF', submitted: '#3B82F6', under_review: '#8B5CF6',
    for_revision: '#F59E0B', approved: '#10B981', ongoing: '#14B8A6',
    completed: '#22C55E', consolidated: '#1E40AF',
  };

  const statusChart = {
    labels: data.byStatus.map(s => STATUS_CONFIG[s._id]?.label || s._id),
    datasets: [{
      data: data.byStatus.map(s => s.count),
      backgroundColor: data.byStatus.map(s => statusColors[s._id] || '#9CA3AF'),
      borderWidth: 0,
    }],
  };

  const provinceChart = {
    labels: data.byProvince.map(p => p.province?.name || 'Unknown'),
    datasets: [{
      label: 'Training Count',
      data: data.byProvince.map(p => p.count),
      backgroundColor: '#1D4ED8',
      borderRadius: 4,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Regional Dashboard</h1>
          <p className="page-subtitle">Overview of all SPARK training activities across provinces</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="input w-32 text-sm flex-shrink-0"
        >
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HiClipboardList} label="Total Trainings" value={data.totalTrainings} color="bg-blue-100 text-blue-600" />
        <StatCard icon={HiClock} label="Pending Review" value={data.pending} color="bg-amber-100 text-amber-600" />
        <StatCard icon={HiCheckCircle} label="Completed" value={data.completed} color="bg-green-100 text-green-600" />
        <StatCard icon={HiDocumentText} label="Consolidated" value={data.consolidated} color="bg-primary-100 text-primary-700" />
        <StatCard icon={HiTrendingUp} label="Total Enrolled" value={data.totalEnrolled?.toLocaleString()} color="bg-purple-100 text-purple-600" />
        <StatCard icon={HiCheckCircle} label="Total Graduates" value={data.totalGraduates?.toLocaleString()} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={HiTrendingUp} label="Completion Rate" value={`${data.completionRate}%`} color="bg-teal-100 text-teal-600" />
        <StatCard icon={HiExclamation} label="Missing Docs" value={data.missingDocsCount} color="bg-red-100 text-red-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-semibold text-gray-900 mb-4">Trainings by Status</h3>
          <div className="h-56 flex items-center justify-center">
            {data.byStatus.length > 0 ? (
              <Doughnut data={statusChart} options={{
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
                cutout: '65%', maintainAspectRatio: false,
              }} />
            ) : <p className="text-gray-400 text-sm">No data yet</p>}
          </div>
        </div>

        <div className="card card-body">
          <h3 className="font-semibold text-gray-900 mb-4">Trainings by Province</h3>
          <div className="h-56">
            {data.byProvince.length > 0 ? (
              <Bar data={provinceChart} options={{
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
                maintainAspectRatio: false,
              }} />
            ) : <p className="text-gray-400 text-sm">No data yet</p>}
          </div>
        </div>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Draft', val: data.draft, color: 'bg-gray-50 border-gray-200 text-gray-700' },
          { label: 'For Revision', val: data.forRevision, color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'Approved', val: data.approved, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Ongoing', val: data.ongoing, color: 'bg-teal-50 border-teal-200 text-teal-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.val || 0}</p>
            <p className="text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Upcoming Trainings (30 days)</h3>
            <Link to="/trainings" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.upcomingTrainings.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">No upcoming trainings</p>
            ) : data.upcomingTrainings.map(t => (
              <Link key={t._id} to={`/trainings/${t._id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                <div className="text-center w-10">
                  <p className="text-base font-bold text-primary-700">{formatDate(t.startDate, 'dd')}</p>
                  <p className="text-xs text-gray-400">{formatDate(t.startDate, 'MMM')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.trainingCourse}</p>
                  <p className="text-xs text-gray-500">{t.province?.name}</p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentLogs.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">No activity yet</p>
            ) : data.recentLogs.map(log => (
              <div key={log._id} className="px-6 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {log.user?.firstName} {log.user?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.action.replace(/_/g, ' ')}
                      {log.trainingActivity && ` — ${log.trainingActivity.trainingCourse}`}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(log.createdAt, 'MMM d, h:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProvinceDashboard({ data, user, year, setYear }) {
  const statusChart = {
    labels: data.byStatus.map(s => STATUS_CONFIG[s._id]?.label || s._id),
    datasets: [{
      data: data.byStatus.map(s => s.count),
      backgroundColor: ['#9CA3AF', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#14B8A6', '#22C55E'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{user.assignedProvince?.name || 'Province'} Dashboard</h1>
          <p className="page-subtitle">Your training activities overview</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="input w-32 text-sm flex-shrink-0"
        >
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={HiClipboardList} label="Total Trainings" value={data.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={HiDocumentText} label="Drafts" value={data.draft} color="bg-gray-100 text-gray-600" />
        <StatCard icon={HiClock} label="Submitted" value={data.submitted} color="bg-blue-100 text-blue-600" />
        <StatCard icon={HiRefresh} label="For Revision" value={data.forRevision} color="bg-amber-100 text-amber-600" />
        <StatCard icon={HiCheckCircle} label="Approved" value={data.approved} color="bg-green-100 text-green-600" />
        <StatCard icon={HiTrendingUp} label="Total Enrolled" value={data.totalEnrolled?.toLocaleString()} color="bg-purple-100 text-purple-600" />
        <StatCard icon={HiCheckCircle} label="Total Graduates" value={data.totalGraduates?.toLocaleString()} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={HiExclamation} label="Missing Docs" value={data.missingDocs} color="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card card-body">
          <h3 className="font-semibold text-gray-900 mb-4">Trainings by Status</h3>
          <div className="h-56 flex items-center justify-center">
            {data.byStatus.length > 0 ? (
              <Doughnut data={statusChart} options={{
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } },
                cutout: '65%', maintainAspectRatio: false,
              }} />
            ) : <p className="text-gray-400 text-sm">No data yet</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Upcoming Trainings</h3>
            <Link to="/trainings" className="text-xs text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.upcomingTrainings.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">No upcoming trainings</p>
            ) : data.upcomingTrainings.map(t => (
              <Link key={t._id} to={`/trainings/${t._id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50">
                <div className="text-center w-10">
                  <p className="text-base font-bold text-primary-700">{formatDate(t.startDate, 'dd')}</p>
                  <p className="text-xs text-gray-400">{formatDate(t.startDate, 'MMM')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.trainingCourse}</p>
                  <p className="text-xs text-gray-400">{formatDate(t.startDate)} – {formatDate(t.endDate)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {data.recentRemarks.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Recent Remarks from SPARK Focal</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentRemarks.map(t => (
              <Link key={t._id} to={`/trainings/${t._id}`} className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.trainingCourse}</p>
                  <p className="text-sm text-amber-700 mt-0.5">"{t.remarks}"</p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
