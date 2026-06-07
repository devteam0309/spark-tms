import { STATUS_CONFIG } from '../utils/helpers';

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`badge ${cfg.color}`}>{cfg.label}</span>;
}
