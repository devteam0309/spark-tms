import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDateInput, QUARTERS, MODES, TRAINING_STATUSES } from '../utils/helpers';
import { HiSave, HiPaperAirplane, HiChevronLeft, HiChevronRight, HiExclamationCircle } from 'react-icons/hi';

const TABS = [
  'Basic Info',
  'Trainer Details',
  'Enrollment & Schedule',
  'Graduates & Outcomes',
  'Document Links',
];

const TAB_FIELDS = [
  ['year', 'quarter', 'trainingCourse', 'province', 'targetSector', 'venue', 'partnerAgency', 'partnerProvision'],
  ['courseCoordinator', 'trainer', 'trainerEmail'],
  ['maleEnrolled', 'femaleEnrolled', 'startDate', 'endDate', 'mode', 'time', 'assessmentDate', 'graduationDate'],
  ['maleGraduates', 'femaleGraduates', 'numberOfMedalists', 'withOnlineJobs', 'freelanceSales'],
  ['certificateOfCompletionLink', 'attendanceFormLink', 'terminalReportLink', 'evaluationFeedbackReportLink', 'scholarsAgreementLink', 'assessmentScoresheetLink'],
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

export default function TrainingActivityForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState([]);
  const [targetSectors, setTargetSectors] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState(0);
  const [maleE, setMaleE] = useState(0);
  const [femaleE, setFemaleE] = useState(0);
  const [maleG, setMaleG] = useState(0);
  const [femaleG, setFemaleG] = useState(0);

  const {
    register, handleSubmit, reset, trigger, getValues, watch, setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      mode: '', quarter: '', year: currentYear, trainingStatus: 'Ongoing',
      courseCoordinator: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    },
  });

  const allowNavigate = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !allowNavigate.current &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !allowNavigate.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    api.get('/provinces').then(r => setProvinces(r.data)).catch(() => toast.error('Failed to load provinces'));
    api.get('/target-sectors').then(r => setTargetSectors(r.data.filter(s => s.isActive))).catch(() => toast.error('Failed to load target sectors'));
    if (isEdit) {
      api.get(`/trainings/${id}`).then(({ data }) => {
        const t = data.training;
        reset({
          ...t,
          province: t.province?._id || t.province,
          year: t.year || currentYear,
          startDate: formatDateInput(t.startDate),
          endDate: formatDateInput(t.endDate),
          assessmentDate: formatDateInput(t.assessmentDate),
          graduationDate: formatDateInput(t.graduationDate),
          trainingStatus: t.trainingStatus || 'Ongoing',
        });
        setMaleE(t.maleEnrolled || 0);
        setFemaleE(t.femaleEnrolled || 0);
        setMaleG(t.maleGraduates || 0);
        setFemaleG(t.femaleGraduates || 0);
        setLoading(false);
      }).catch(() => {
        toast.error('Failed to load training record');
        navigate('/trainings');
      });
    }
  }, [id]);

  const tabHasErrors = (tabIndex) => {
    return TAB_FIELDS[tabIndex].some(field => errors[field]);
  };

  const onSubmit = async (formData, submitForReview = false) => {
    try {
      let trainingId = id;
      if (isEdit) {
        await api.put(`/trainings/${id}`, formData);
      } else {
        const { data } = await api.post('/trainings', formData);
        trainingId = data._id;
      }

      if (submitForReview) {
        try {
          await api.patch(`/trainings/${trainingId}/status`, { status: 'submitted' });
          toast.success('Training submitted for review');
        } catch (submitErr) {
          toast.error(submitErr.response?.data?.message || 'Saved as draft — submit failed. Please submit from the record page.');
          allowNavigate.current = true;
          navigate(`/trainings/${trainingId}`);
          return;
        }
      } else {
        toast.success(isEdit ? 'Training saved' : 'Training saved as draft');
      }
      allowNavigate.current = true;
      navigate(`/trainings/${trainingId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleSubmitForReview = async (e) => {
    e.preventDefault();
    const valid = await trigger();
    if (!valid) {
      const firstErrTab = TAB_FIELDS.findIndex(fields =>
        fields.some(f => errors[f])
      );
      if (firstErrTab >= 0) {
        setActiveTab(firstErrTab);
        toast.error(`Please fix errors on the "${TABS[firstErrTab]}" tab`);
      }
      return;
    }
    handleSubmit(d => onSubmit(d, true))();
  };

  if (loading) return <LoadingSpinner fullPage />;

  // Keep a record's existing sector selectable even if it's since been deactivated/renamed.
  const targetSectorValue = watch('targetSector');
  const targetSectorOptions = !targetSectorValue || targetSectors.some(s => s.name === targetSectorValue)
    ? targetSectors
    : [...targetSectors, { _id: '__legacy__', name: targetSectorValue }];

  const InputRow = ({ label, name, type = 'text', required, placeholder, className = '' }) => (
    <div className={className}>
      <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input
        {...register(name, required ? { required: `${label} is required` } : {})}
        type={type}
        placeholder={placeholder}
        className={`input ${errors[name] ? 'input-error' : ''}`}
      />
      {errors[name] && <p className="mt-1 text-xs text-red-500">{errors[name].message}</p>}
    </div>
  );

  // Assessment/Graduation dates may not be scheduled yet — lets the focal mark
  // them "TBD" now and fill in the real date once it's known.
  const DateOrTBDField = ({ label, name }) => {
    const value = watch(name);
    const isTBD = value === 'TBD';
    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="label mb-0">{label}</label>
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isTBD}
              onChange={e => setValue(name, e.target.checked ? 'TBD' : '', { shouldDirty: true })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            TBD
          </label>
        </div>
        {isTBD ? (
          <input type="text" value="TBD" disabled className="input bg-gray-50 text-gray-400 cursor-not-allowed" />
        ) : (
          <input {...register(name)} type="date" className="input" />
        )}
      </div>
    );
  };

  const tabs = (
    <div className="flex border-b border-gray-200 overflow-x-auto">
      {TABS.map((tab, i) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(i)}
          className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            activeTab === i
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab}
          {tabHasErrors(i) && (
            <HiExclamationCircle className="inline h-3.5 w-3.5 text-red-500 ml-1 mb-0.5" />
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
          <HiChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Training Activity' : 'New Training Activity'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update training record' : 'Create a new training record'}</p>
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600">You have unsaved changes. If you leave now, your changes will be lost.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => blocker.reset()} className="btn-secondary">Stay & Keep Editing</button>
              <button onClick={() => blocker.proceed()} className="btn-danger">Leave Without Saving</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(d => onSubmit(d, false))}>
        <div className="card">
          {tabs}
          <div className="card-body">

            {/* Tab 0: Basic Info */}
            {activeTab === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Year <span className="text-red-500">*</span></label>
                  <select
                    {...register('year', { required: 'Year is required', valueAsNumber: true })}
                    className={`input ${errors.year ? 'input-error' : ''}`}
                  >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  {errors.year && <p className="mt-1 text-xs text-red-500">{errors.year.message}</p>}
                </div>

                <div>
                  <label className="label">Quarter <span className="text-red-500">*</span></label>
                  <select {...register('quarter', { required: 'Quarter is required' })} className={`input ${errors.quarter ? 'input-error' : ''}`}>
                    <option value="">Select quarter</option>
                    {QUARTERS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                  {errors.quarter && <p className="mt-1 text-xs text-red-500">{errors.quarter.message}</p>}
                </div>

                {user.role === 'spark_focal' && (
                  <div>
                    <label className="label">Province <span className="text-red-500">*</span></label>
                    <select {...register('province', { required: 'Province is required' })} className={`input ${errors.province ? 'input-error' : ''}`}>
                      <option value="">Select province</option>
                      {provinces.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    {errors.province && <p className="mt-1 text-xs text-red-500">{errors.province.message}</p>}
                  </div>
                )}

                <InputRow label="Training Course" name="trainingCourse" required className="sm:col-span-2" />
                <div>
                  <label className="label">Target Sector <span className="text-red-500">*</span></label>
                  <select {...register('targetSector', { required: 'Target Sector is required' })} className={`input ${errors.targetSector ? 'input-error' : ''}`}>
                    <option value="">Select target sector</option>
                    {targetSectorOptions.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                  </select>
                  {errors.targetSector && <p className="mt-1 text-xs text-red-500">{errors.targetSector.message}</p>}
                </div>
                <InputRow label="Venue" name="venue" required />
                <InputRow label="Partner Agency" name="partnerAgency" />
                <InputRow label="Partner Provision" name="partnerProvision" />
              </div>
            )}

            {/* Tab 1: Trainer Details */}
            {activeTab === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputRow
                  label="Course Coordinator(s)"
                  name="courseCoordinator"
                  required
                  placeholder="e.g. Juan Dela Cruz, Maria Santos"
                  className="sm:col-span-2"
                />
                <InputRow label="Trainer Name" name="trainer" required />
                <InputRow label="Trainer Email" name="trainerEmail" type="email" />
                <InputRow label="Trainer Requirements Link" name="trainerRequirementsLink" type="url" placeholder="https://drive.google.com/..." className="sm:col-span-2" />
              </div>
            )}

            {/* Tab 2: Enrollment & Schedule */}
            {activeTab === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Male Enrolled</label>
                  <input
                    {...register('maleEnrolled', { valueAsNumber: true, min: 0 })}
                    type="number" min="0" className="input"
                    onChange={e => setMaleE(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Female Enrolled</label>
                  <input
                    {...register('femaleEnrolled', { valueAsNumber: true, min: 0 })}
                    type="number" min="0" className="input"
                    onChange={e => setFemaleE(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
                    Total Enrolled (auto-computed): <strong>{maleE + femaleE}</strong>
                  </div>
                </div>

                <InputRow label="Start Date" name="startDate" type="date" required />
                <div>
                  <label className="label">End Date <span className="text-red-500">*</span></label>
                  <input
                    {...register('endDate', {
                      required: 'End Date is required',
                      validate: (v) => {
                        const start = getValues('startDate');
                        if (start && v && v < start) return 'End date must be on or after start date';
                        return true;
                      },
                    })}
                    type="date"
                    className={`input ${errors.endDate ? 'input-error' : ''}`}
                  />
                  {errors.endDate && <p className="mt-1 text-xs text-red-500">{errors.endDate.message}</p>}
                </div>

                <div>
                  <label className="label">Mode <span className="text-red-500">*</span></label>
                  <select {...register('mode', { required: 'Mode is required' })} className={`input ${errors.mode ? 'input-error' : ''}`}>
                    <option value="">Select mode</option>
                    {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.mode && <p className="mt-1 text-xs text-red-500">{errors.mode.message}</p>}
                </div>
                <InputRow label="Time" name="time" placeholder="e.g. 8:00 AM - 5:00 PM" />
                <InputRow label="Online Campaign Dates" name="onlineCampaignDates" className="sm:col-span-2" />
                <DateOrTBDField label="Assessment Date" name="assessmentDate" />
                <DateOrTBDField label="Graduation Date" name="graduationDate" />
              </div>
            )}

            {/* Tab 3: Graduates & Outcomes */}
            {activeTab === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Male Graduates</label>
                  <input
                    {...register('maleGraduates', { valueAsNumber: true, min: 0 })}
                    type="number" min="0" className="input"
                    onChange={e => setMaleG(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Female Graduates</label>
                  <input
                    {...register('femaleGraduates', { valueAsNumber: true, min: 0 })}
                    type="number" min="0" className="input"
                    onChange={e => setFemaleG(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
                    Total Graduates (auto-computed): <strong>{maleG + femaleG}</strong>
                    {(maleE + femaleE) > 0 && (
                      <span className="ml-3">
                        Completion Rate: <strong>{Math.round((maleG + femaleG) / (maleE + femaleE) * 100)}%</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">Number of Medalists</label>
                  <input {...register('numberOfMedalists', { valueAsNumber: true, min: 0 })} type="number" min="0" className="input" />
                </div>
                <div>
                  <label className="label">With Online Jobs</label>
                  <input {...register('withOnlineJobs', { valueAsNumber: true, min: 0 })} type="number" min="0" className="input" />
                </div>
                <div>
                  <label className="label">Freelance Sales (₱)</label>
                  <input {...register('freelanceSales', { valueAsNumber: true, min: 0 })} type="number" min="0" className="input" />
                </div>
                <div>
                  <label className="label">Training Status</label>
                  <select {...register('trainingStatus')} className="input">
                    {TRAINING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Tab 4: Document Links */}
            {activeTab === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Provide Google Drive or other document links. Fields marked with * are required for submission.</p>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { name: 'certificateOfCompletionLink', label: 'Certificate of Completion', req: true },
                    { name: 'certificateOfParticipationLink', label: 'Certificate of Participation' },
                    { name: 'attendanceFormLink', label: 'Attendance Form', req: true },
                    { name: 'terminalReportLink', label: 'Terminal Report', req: true },
                    { name: 'evaluationFeedbackReportLink', label: 'Evaluation/Feedback Report', req: true },
                    { name: 'scholarsAgreementLink', label: "Scholars Agreement", req: true },
                    { name: 'assessmentScoresheetLink', label: 'Assessment Scoresheet', req: true },
                    { name: 'rawPhotoVideoDocumentationLink', label: 'Raw Photo/Video Documentation' },
                    { name: 'monitoringTrackerLink', label: 'Monitoring Tracker' },
                    { name: 'afterTrainingReportLink', label: 'After Training Report' },
                    { name: 'testimonialDriveLink', label: 'Testimonial Drive Link' },
                  ].map(({ name, label, req }) => (
                    <div key={name}>
                      <label className="label">
                        {label}
                        {req && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input {...register(name)} type="url" placeholder="https://drive.google.com/…" className="input" />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="label">Remarks</label>
                  <textarea {...register('remarks')} rows={3} placeholder="Any additional remarks…" className="input resize-none" />
                </div>
              </div>
            )}
          </div>

          {/* Tab navigation */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab(t => Math.max(0, t - 1))}
              disabled={activeTab === 0}
              className="btn-secondary btn-sm"
            >
              <HiChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex gap-2">
              <button type="submit" disabled={isSubmitting} className="btn-secondary">
                <HiSave className="h-4 w-4" />
                Save Draft
              </button>
              {user.role === 'province_focal' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitForReview}
                  className="btn-primary"
                >
                  <HiPaperAirplane className="h-4 w-4" />
                  Submit for Review
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab(t => Math.min(TABS.length - 1, t + 1))}
              disabled={activeTab === TABS.length - 1}
              className="btn-secondary btn-sm"
            >
              Next
              <HiChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
