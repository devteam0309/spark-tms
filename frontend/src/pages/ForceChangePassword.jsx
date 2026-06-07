import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiLightningBolt, HiEye, HiEyeOff, HiExclamation } from 'react-icons/hi';

export default function ForceChangePassword() {
  const { updateAuth } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ newPassword }) => {
    try {
      const { data } = await api.put('/auth/force-change-password', { newPassword });
      updateAuth(data.token, data.user);
      toast.success('Password updated. Welcome!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-700/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-700/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-2xl mb-4 shadow-lg">
            <HiLightningBolt className="h-8 w-8 text-primary-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">SPARK TMS</h1>
          <p className="text-primary-300 text-sm mt-1">Training Monitoring System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
            <HiExclamation className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Your account requires a password change before you can continue. Please set a new password now.
            </p>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-1">Set Your Password</h2>
          <p className="text-sm text-gray-500 mb-6">Choose a strong password (minimum 8 characters).</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.newPassword ? 'input-error' : ''}`}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="mt-1 text-xs text-red-500">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: v => v === watch('newPassword') || 'Passwords do not match',
                  })}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <HiEyeOff className="h-4 w-4" /> : <HiEye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full btn-lg mt-2">
              {isSubmitting ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>
        </div>

        <p className="text-center text-primary-400 text-xs mt-6">
          Department of Information and Communications Technology<br />
          MIMAROPA Region (Region IV-B) — SPARK Program
        </p>
      </div>
    </div>
  );
}
