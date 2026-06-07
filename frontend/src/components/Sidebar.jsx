import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiHome, HiClipboardList, HiCheckCircle, HiUsers,
  HiOfficeBuilding, HiChartBar, HiUser, HiLightningBolt, HiTag,
} from 'react-icons/hi';

const SparkNavItems = [
  { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
  { to: '/trainings', icon: HiClipboardList, label: 'Training Activities' },
  { to: '/review', icon: HiCheckCircle, label: 'Review Submissions' },
  { to: '/reports', icon: HiChartBar, label: 'Reports & Exports' },
  { to: '/users', icon: HiUsers, label: 'User Management' },
  { to: '/provinces', icon: HiOfficeBuilding, label: 'Province Management' },
  { to: '/target-sectors', icon: HiTag, label: 'Target Sector Management' },
  { to: '/profile', icon: HiUser, label: 'My Profile' },
];

const ProvinceNavItems = [
  { to: '/dashboard', icon: HiHome, label: 'Dashboard' },
  { to: '/trainings', icon: HiClipboardList, label: 'My Trainings' },
  { to: '/reports', icon: HiChartBar, label: 'Reports & Exports' },
  { to: '/profile', icon: HiUser, label: 'My Profile' },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const items = user?.role === 'spark_focal' ? SparkNavItems : ProvinceNavItems;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-primary-900 transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-primary-800">
          <div className="flex-shrink-0 w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
            <HiLightningBolt className="h-5 w-5 text-yellow-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">SPARK TMS</p>
            <p className="text-xs text-primary-300 leading-tight">Training Monitor</p>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-primary-800">
          <p className="text-xs text-primary-400 uppercase tracking-wider">Logged in as</p>
          <p className="text-sm font-semibold text-white mt-0.5">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-primary-300">
            {user?.role === 'spark_focal' ? 'Regional SPARK Focal' : `${user?.assignedProvince?.name || 'Province'} Focal`}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary-800">
          <p className="text-xs text-primary-500 text-center">
            SPARK TMS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  );
}
