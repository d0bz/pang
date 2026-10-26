'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Euro,
  AlertCircle,
  CheckCircle2,
  Users,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialMode?: AuthMode;
  initialResetToken?: string;
  initialGroupName?: string;
  onLoginSuccess: (user: any) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  initialEmail = '',
  initialMode = 'login',
  initialResetToken = '',
  initialGroupName,
  onLoginSuccess,
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [iban, setIban] = useState('');
  const [resetToken, setResetToken] = useState(initialResetToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
    if (initialMode) setMode(initialMode);
    if (initialResetToken) {
      setResetToken(initialResetToken);
      setMode('reset');
    }
  }, [initialEmail, initialMode, initialResetToken]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login' || mode === 'register') {
        const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const body = mode === 'register' ? { name, email, password, iban } : { email, password };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        onLoginSuccess(data.user);
        onClose();
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send reset link');
        }

        setForgotSuccess(true);
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, newPassword: password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to reset password');
        }

        setResetSuccess(true);
        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } catch {
          // ignore
        }

        setTimeout(() => {
          onLoginSuccess(data.user);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHeaderTitle = () => {
    switch (mode) {
      case 'register':
        return 'Create an Account';
      case 'forgot':
        return 'Reset Password';
      case 'reset':
        return 'Set New Password';
      case 'login':
      default:
        return 'Welcome to Pang';
    }
  };

  const getHeaderSubtitle = () => {
    switch (mode) {
      case 'register':
        return 'Join Pang to split expenses with friends';
      case 'forgot':
        return "We'll send a password recovery link to your inbox";
      case 'reset':
        return 'Choose a strong new password for your account';
      case 'login':
      default:
        return 'Share bills with friends and roommates';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden max-h-[92vh] flex flex-col my-0 sm:my-8 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200">
        {/* Header */}
        <div className="bg-splitwise-dark text-white px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-splitwise-teal flex items-center justify-center text-white font-bold">
              {mode === 'forgot' || mode === 'reset' ? (
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Euro className="w-5 h-5 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{getHeaderTitle()}</h2>
              <p className="text-xs text-gray-400">{getHeaderSubtitle()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Invitation Banner if invited */}
          {initialGroupName && mode !== 'forgot' && mode !== 'reset' && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-splitwise-darkTeal">
              <Users className="w-4 h-4 text-splitwise-teal flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">You were invited to "{initialGroupName}"</p>
                <p className="text-[11px] text-teal-700 mt-0.5">
                  {mode === 'register'
                    ? 'Enter your name and choose a password to activate your account.'
                    : 'Sign in to access your shared group expenses.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* FORGOT PASSWORD SUCCESS MESSAGE */}
          {mode === 'forgot' && forgotSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Check your email</h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  If an account exists for <strong className="text-gray-900">{email}</strong>, we've
                  sent a link to reset your password. The link expires in 1 hour.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotSuccess(false);
                    setError(null);
                  }}
                  className="w-full py-2.5 bg-splitwise-teal hover:bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          ) : mode === 'reset' && resetSuccess ? (
            /* RESET PASSWORD SUCCESS */
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Password reset successful!</h3>
                <p className="text-xs text-gray-600 mt-1">Logging you in to Pang now...</p>
              </div>
            </div>
          ) : (
            /* STANDARD FORM */
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-splitwise-teal"
                    />
                  </div>
                </div>
              )}

              {mode !== 'reset' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-splitwise-teal"
                    />
                  </div>
                </div>
              )}

              {mode === 'reset' && !initialResetToken && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Reset Token
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Paste your reset token from email"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-splitwise-teal"
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    IBAN <span className="normal-case font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="EE12 3456 7890 1234 5678"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-splitwise-teal"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Shown to group members so they can pay you</p>
                </div>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                      {mode === 'reset' ? 'New Password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setError(null);
                        }}
                        className="text-[11px] font-semibold text-splitwise-teal hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-splitwise-teal"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Must be at least 6 characters</p>
                </div>
              )}

              {mode === 'reset' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-splitwise-teal"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-splitwise-teal hover:bg-teal-600 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50 mt-2"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'register'
                  ? 'Create Account'
                  : mode === 'forgot'
                  ? 'Send Reset Link'
                  : mode === 'reset'
                  ? 'Update Password'
                  : 'Log In'}
              </button>
            </form>
          )}

          {/* Footer Navigation */}
          {(!forgotSuccess || mode !== 'forgot') && !resetSuccess && (
            <div className="pt-2 text-center border-t border-gray-100 flex flex-col gap-1.5">
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-xs text-splitwise-teal hover:underline font-semibold"
                >
                  Don't have an account? Sign up
                </button>
              )}

              {mode === 'register' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-splitwise-teal hover:underline font-semibold"
                >
                  Already have an account? Log in
                </button>
              )}

              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-splitwise-teal hover:underline font-semibold inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}

              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-splitwise-teal hover:underline font-semibold inline-flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
