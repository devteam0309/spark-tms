import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { HiLightningBolt, HiEye, HiEyeOff, HiCheckCircle } from 'react-icons/hi';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ newPassword }) => {
    try {
      await api.post(`/auth/reset-password/${token}`, { newPassword });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
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
          {done ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <HiCheckCircle className="h-14 w-14 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Password Reset!</h2>
              <p className="text-sm text-gray-500">Your password has been updated. You can now sign in with your new password.</p>
              <button onClick={() => navigate('/login')} className="btn-primary w-full mt-4">
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Set New Password</h2>
              <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
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
                  {isSubmitting ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:underline">Back to Sign In</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
