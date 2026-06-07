import { format, parseISO, isValid } from 'date-fns';

// assessmentDate/graduationDate were migrated from Date to String (to allow "TBD").
// Records saved before that migration still hold real Date values, which Mongoose
// now serializes via Date.prototype.toString() (e.g. "Mon Jun 15 2026 08:00:00
// GMT+0800 (...)") rather than ISO — parseISO rejects that, so fall back to `new Date`.
const parseFlexibleDate = (date) => {
  const iso = parseISO(date);
  return isValid(iso) ? iso : new Date(date);
};

export const formatDate = (date, fmt = 'MMM d, yyyy') => {
  if (!date) return '—';
  if (date === 'TBD') return 'TBD';
  try {
    const d = typeof date === 'string' ? parseFlexibleDate(date) : date;
    return isValid(d) ? format(d, fmt) : '—';
  } catch {
    return '—';
  }
};

export const formatDateInput = (date) => {
  if (!date) return '';
  if (date === 'TBD') return 'TBD';
  try {
    const d = typeof date === 'string' ? parseFlexibleDate(date) : date;
    return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
  } catch {
    return '';
  }
};

export const STATUS_CONFIG = {
  draft:        { label: 'Draft',           color: 'bg-gray-100 text-gray-700' },
  submitted:    { label: 'Submitted',        color: 'bg-blue-100 text-blue-700' },
  under_review: { label: 'Under Review',     color: 'bg-purple-100 text-purple-700' },
  for_revision: { label: 'For Revision',     color: 'bg-amber-100 text-amber-700' },
  approved:     { label: 'Approved',         color: 'bg-green-100 text-green-700' },
  ongoing:      { label: 'Ongoing',          color: 'bg-teal-100 text-teal-700' },
  completed:    { label: 'Completed',        color: 'bg-emerald-100 text-emerald-700' },
  consolidated: { label: 'Consolidated',     color: 'bg-primary-100 text-primary-700' },
};

export const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
export const MODES = ['Face-to-Face', 'Online', 'Hybrid'];
export const TRAINING_STATUSES = ['Ongoing', 'Done'];

const _currentYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 6 }, (_, i) => _currentYear - 2 + i);

export const SPARK_STATUSES = [
  'submitted', 'under_review', 'for_revision', 'approved', 'ongoing', 'completed', 'consolidated',
];

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const truncate = (str, n = 40) =>
  str && str.length > n ? str.slice(0, n) + '…' : str || '—';
