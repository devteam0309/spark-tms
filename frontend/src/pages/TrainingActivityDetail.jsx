import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { formatDate } from '../utils/helpers';
import {
  HiPencil, HiChevronLeft, HiCheckCircle, HiRefresh,
  HiBan, HiExternalLink, HiExclamation, HiDocumentText,
} from 'react-icons/hi';

const LINK_FIELDS = [
  { key: 'trainerRequirementsLink', label: 'Trainer Requirements' },
  { key: 'certificateOfCompletionLink', label: 'Certificate of Completion' },
  { key: 'certificateOfParticipationLink', label: 'Certificate of Participation' },
  { key: 'attendanceFormLink', label: 'Attendance Form' },
  { key: 'terminalReportLink', label: 'Terminal Report' },
  { key: 'evaluationFeedbackReportLink', label: 'Evaluation/Feedback Report' },
  { key: 'scholarsAgreementLink', label: "Scholars Agreement" },
  { key: 'assessmentScoresheetLink', label: 'Assessment Scoresheet' },
  { key: 'rawPhotoVideoDocumentationLink', label: 'Raw Photo/Video' },
  { key: 'monitoringTrackerLink', label: 'Monitoring Tracker' },
  { key: 'afterTrainingReportLink', label: 'After Training Report' },
  { key: 'testimonialDriveLink', label: 'Testimonials' },
];

export default function TrainingActivityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, type: '' });
  const [remarks, setRemarks] = useState('');
  const [actioning, setActioning] = useState(false);

  const fetchData = async () => {
    try {
      const { data } = await api.get(`/trainings/${id}`);
      setTraining(data.training);
      setLogs(data.logs);
    } catch (err) {
      toast.error('Failed to load training');
      navigate('/trainings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleAction = async (status) => {
    setActioning(true);
    try {
      await api.patch(`/trainings/${id}/status`, { status, remarks });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      setModal({ open: false, type: '' });
      setRemarks('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!training) return null;

  const t = training;
  const isSparkFocal = user.role === 'spark_focal';
  const canSubmit = !isSparkFocal && ['draft', 'for_revision'].includes(t.status);
  const canReview = isSparkFocal && t.status === 'submitted';
  const canManageStatus = isSparkFocal;

  const InfoRow = ({ label, value }) => (
    <div className="py-2 flex flex-col sm:flex-row sm:gap-4">
      <dt className="text-sm text-gray-500 sm:w-44 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5 sm:mt-0">{value || '—'}</dd>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm mt-1">
            <HiChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{t.trainingCourse}</h1>
              <StatusBadge status={t.status} />
            </div>
            <p className="page-subtitle">{t.province?.name} · {t.year} {t.quarter}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {(isSparkFocal || ['draft', 'for_revision'].includes(t.status)) && (
            <Link to={`/trainings/${id}/edit`} className="btn-secondary btn-sm">
              <HiPencil className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Missing docs alert */}
      {t.missingDocuments?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
          <HiExclamation className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Missing Documents</p>
            <p className="text-sm text-amber-700">{t.missingDocuments.join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Remarks */}
      {t.remarks && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Remarks from SPARK Focal</p>
          <p className="text-sm text-blue-900">{t.remarks}</p>
        </div>
      )}

      {/* Actions (SPARK Focal) */}
      {isSparkFocal && (
        <div className="card card-body">
          <p className="text-sm font-semibold text-gray-700 mb-3">Workflow Actions</p>
          <div className="flex flex-wrap gap-2">
            {t.status === 'submitted' && (
              <button onClick={() => { setModal({ open: true, type: 'under_review' }); }} className="btn-primary btn-sm">
                <HiDocumentText className="h-4 w-4" />
                Mark Under Review
              </button>
            )}
            {['submitted', 'under_review'].includes(t.status) && (
              <>
                <button onClick={() => setModal({ open: true, type: 'approved' })} className="btn-success btn-sm">
                  <HiCheckCircle className="h-4 w-4" />
                  Approve
                </button>
                <button onClick={() => setModal({ open: true, type: 'for_revision' })} className="btn-warning btn-sm">
                  <HiRefresh className="h-4 w-4" />
                  Return for Revision
                </button>
              </>
            )}
            {t.status === 'approved' && (
              <button onClick={() => setModal({ open: true, type: 'ongoing' })} className="btn-primary btn-sm">
                Mark Ongoing
              </button>
            )}
            {t.status === 'ongoing' && (
              <button onClick={() => setModal({ open: true, type: 'completed' })} className="btn-success btn-sm">
                <HiCheckCircle className="h-4 w-4" />
                Mark Completed
              </button>
            )}
            {t.status === 'completed' && (
              <button onClick={() => setModal({ open: true, type: 'consolidated' })} className="btn-primary btn-sm">
                <HiDocumentText className="h-4 w-4" />
                Mark Consolidated
              </button>
            )}
          </div>
        </div>
      )}

      {/* Province Focal: Submit */}
      {canSubmit && (
        <div className="card card-body flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Ready to submit?</p>
            <p className="text-xs text-gray-500">Ensure all required fields are filled before submitting.</p>
          </div>
          <button onClick={() => setModal({ open: true, type: 'submitted' })} className="btn-primary">
            Submit for Review
          </button>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Basic Information</h3></div>
          <div className="card-body divide-y divide-gray-100">
            <InfoRow label="Year" value={t.year} />
            <InfoRow label="Quarter" value={t.quarter} />
            <InfoRow label="Province" value={t.province?.name} />
            <InfoRow label="Target Sector" value={t.targetSector} />
            <InfoRow label="Venue" value={t.venue} />
            <InfoRow label="Partner Agency" value={t.partnerAgency} />
            <InfoRow label="Partner Provision" value={t.partnerProvision} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Trainer Details</h3></div>
          <div className="card-body divide-y divide-gray-100">
            <InfoRow label="Course Coordinator(s)" value={t.courseCoordinator} />
            <InfoRow label="Trainer" value={t.trainer} />
            <InfoRow label="Trainer Email" value={t.trainerEmail} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Schedule</h3></div>
          <div className="card-body divide-y divide-gray-100">
            <InfoRow label="Start Date" value={formatDate(t.startDate)} />
            <InfoRow label="End Date" value={formatDate(t.endDate)} />
            <InfoRow label="Mode" value={t.mode} />
            <InfoRow label="Time" value={t.time} />
            <InfoRow label="Assessment Date" value={formatDate(t.assessmentDate)} />
            <InfoRow label="Graduation Date" value={formatDate(t.graduationDate)} />
            <InfoRow label="Online Campaign" value={t.onlineCampaignDates} />
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Enrollment & Graduates</h3></div>
          <div className="card-body divide-y divide-gray-100">
            <InfoRow label="Male Enrolled" value={t.maleEnrolled} />
            <InfoRow label="Female Enrolled" value={t.femaleEnrolled} />
            <InfoRow label="Total Enrolled" value={<strong>{t.totalEnrolled}</strong>} />
            <InfoRow label="Male Graduates" value={t.maleGraduates} />
            <InfoRow label="Female Graduates" value={t.femaleGraduates} />
            <InfoRow label="Total Graduates" value={<strong>{t.numberOfGraduates}</strong>} />
            <InfoRow label="Completion Rate" value={
              <span className={t.completionRate >= 80 ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                {t.completionRate}%
              </span>
            } />
            <InfoRow label="Medalists" value={t.numberOfMedalists} />
            <InfoRow label="With Online Jobs" value={t.withOnlineJobs} />
            <InfoRow label="Freelance Sales" value={t.freelanceSales ? `₱${t.freelanceSales.toLocaleString()}` : null} />
            <InfoRow label="Training Status" value={t.trainingStatus} />
          </div>
        </div>
      </div>

      {/* Document Links */}
      <div className="card">
        <div className="card-header"><h3 className="font-semibold text-gray-900">Document Links</h3></div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LINK_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">{label}</span>
                {t[key] ? (
                  <a href={t[key]} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary-600 hover:underline">
                    <HiExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-red-400">Missing</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      {logs.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900">Activity Log</h3></div>
          <div className="divide-y divide-gray-100">
            {logs.map(log => (
              <div key={log._id} className="px-6 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {log.user?.firstName} {log.user?.lastName}
                    <span className="ml-2 text-xs text-gray-500 font-normal">({log.user?.role?.replace('_', ' ')})</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {log.action.replace(/_/g, ' ')}
                    {log.previousStatus && log.newStatus && (
                      <span className="ml-1">
                        · <StatusBadge status={log.previousStatus} /> → <StatusBadge status={log.newStatus} />
                      </span>
                    )}
                  </p>
                  {log.remarks && <p className="text-xs text-amber-700 italic mt-0.5">"{log.remarks}"</p>}
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">{formatDate(log.createdAt, 'MMM d, yyyy h:mm a')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status action modal */}
      <Modal
        open={modal.open}
        onClose={() => { setModal({ open: false, type: '' }); setRemarks(''); }}
        title={`Confirm: ${(modal.type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`}
        size="sm"
      >
        <div className="space-y-4">
          {['for_revision', 'approved', 'consolidated'].includes(modal.type) && (
            <div>
              <label className="label">Remarks {modal.type === 'for_revision' ? <span className="text-red-500">*</span> : '(optional)'}</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Add remarks or instructions…"
                className="input resize-none"
              />
            </div>
          )}
          <p className="text-sm text-gray-600">
            {modal.type === 'submitted' && 'Submit this training record for review by the SPARK focal?'}
            {modal.type === 'under_review' && 'Mark this submission as under review?'}
            {modal.type === 'approved' && 'Approve this training record?'}
            {modal.type === 'for_revision' && 'Return this record for revision?'}
            {modal.type === 'ongoing' && 'Mark this training as ongoing?'}
            {modal.type === 'completed' && 'Mark this training as completed?'}
            {modal.type === 'consolidated' && 'Mark this training as consolidated?'}
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => { setModal({ open: false, type: '' }); setRemarks(''); }}
              className="btn-secondary"
              disabled={actioning}
            >
              Cancel
            </button>
            <button
              onClick={() => handleAction(modal.type)}
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
