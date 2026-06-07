import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/helpers';
import { HiUser, HiLockClosed, HiOfficeBuilding } from 'react-icons/hi';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('info');

  const {
    register: regProfile, handleSubmit: handleProfile,
    formState: { errors: profileErrors, isSubmitting: profileSaving },
  } = useForm({
    defaultValues: {
      firstName: user?.firstName, lastName: user?.lastName, email: user?.email,
    },
  });

  const {
    register: regPw, handleSubmit: handlePw, reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwSaving },
    watch,
  } = useForm();

  const onProfileSave = async (data) => {
    try {
      await api.put('/auth/profile', data);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const onPasswordChange = async (data) => {
    try {
      await api.put('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully');
      resetPw();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account settings</p>
      </div>

      {/* Profile header */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 bg-primary-700 rounded-2xl flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h2>
          <p className="text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`badge ${user?.role === 'spark_focal' ? 'bg-primary-100 text-primary-700' : 'bg-teal-100 text-teal-700'}`}>
              {user?.role === 'spark_focal' ? 'Regional SPARK Focal' : 'Province Focal'}
            </span>
            {user?.assignedProvince && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <HiOfficeBuilding className="h-3.5 w-3.5" />
                {user.assignedProvince.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Last login: {user?.lastLogin ? formatDate(user.lastLogin, 'MMM d, yyyy h:mm a') : 'N/A'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'info', icon: HiUser, label: 'Personal Info' },
          { key: 'password', icon: HiLockClosed, label: 'Change Password' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Personal Info */}
      {activeTab === 'info' && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
          </div>
          <form onSubmit={handleProfile(onProfileSave)} className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input {...regProfile('firstName', { required: true })} className="input" />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input {...regProfile('lastName', { required: true })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Email Address</label>
              <input {...regProfile('email', { required: true })} type="email" className="input" />
            </div>
            <div>
              <label className="label">Username</label>
              <input value={user?.username} readOnly className="input bg-gray-50 text-gray-500" />
              <p className="text-xs text-gray-400 mt-1">Username cannot be changed</p>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={profileSaving} className="btn-primary">
                {profileSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Change Password */}
      {activeTab === 'password' && (
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Change Password</h3>
          </div>
          <form onSubmit={handlePw(onPasswordChange)} className="card-body space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                {...regPw('currentPassword', { required: 'Current password required' })}
                type="password"
                className={`input ${pwErrors.currentPassword ? 'input-error' : ''}`}
              />
              {pwErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                {...regPw('newPassword', { required: 'New password required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                type="password"
                className={`input ${pwErrors.newPassword ? 'input-error' : ''}`}
              />
              {pwErrors.newPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.newPassword.message}</p>}
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                {...regPw('confirmPassword', {
                  required: 'Please confirm password',
                  validate: v => v === watch('newPassword') || 'Passwords do not match',
                })}
                type="password"
                className={`input ${pwErrors.confirmPassword ? 'input-error' : ''}`}
              />
              {pwErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.confirmPassword.message}</p>}
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={pwSaving} className="btn-primary">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
