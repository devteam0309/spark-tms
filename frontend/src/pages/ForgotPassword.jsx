import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { HiLightningBolt, HiCheckCircle } from 'react-icons/hi';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    await api.post('/auth/forgot-password', { email });
    setSent(true);
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
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <HiCheckCircle className="h-14 w-14 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Check Your Email</h2>
              <p className="text-sm text-gray-500">
                If that email address is registered, we've sent a password reset link. Check your inbox (and spam folder).
              </p>
              <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
              <Link to="/login" className="btn-primary w-full mt-4 inline-flex justify-center">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Forgot Password</h2>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email address and we'll send you a reset link.
              </p>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                    })}
                    type="email"
                    placeholder="your@email.com"
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    autoFocus
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <button type="submit" disabled={isSubmitting} className="btn-primary w-full btn-lg mt-2">
                  {isSubmitting ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
              <div className="mt-5 text-center">
                <Link to="/login" className="text-sm text-primary-600 hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
