'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 'form' | 'token' | 'confirm' | 'success' | 'error';

export default function CancelPage() {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 — request the OTP
  async function handleRequestCode() {
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      setStep('error');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/premium/cancel/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStep('error');
        return;
      }

      setStep('token');
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  // Step 3 — submit cancellation with token
  async function handleCancel() {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/premium/cancel', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), token: token.trim() }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.');
        setStep('error');
        return;
      }

      setStep('success');
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">

        {/* ---------------------------------------------------------------- */}
        {/* Step 1 — Email input                                             */}
        {/* ---------------------------------------------------------------- */}
        {step === 'form' && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">
              Cancel subscription
            </h1>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              Enter the email address you used to purchase SafeUnfollow Premium.
              We&apos;ll email you a confirmation code before cancelling.
            </p>

            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRequestCode(); }}
              placeholder="you@example.com"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent mb-6"
            />

            {/* What cancellation means */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Before you cancel</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>Unlimited snapshots will no longer be available</li>
                <li>CSV export will be disabled</li>
                <li>Changes tracking will be locked</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            <button
              onClick={handleRequestCode}
              disabled={loading}
              className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 text-white font-semibold py-3 rounded-full text-sm transition-colors"
            >
              {loading ? 'Sending code…' : 'Send confirmation code'}
            </button>

            <p className="mt-4 text-center text-xs text-zinc-400">
              Changed your mind?{' '}
              <Link href="/" className="text-pink-600 hover:underline">
                Go back home
              </Link>
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 2 — Token input                                             */}
        {/* ---------------------------------------------------------------- */}
        {step === 'token' && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-zinc-900 mb-2">
              Check your email
            </h2>
            <p className="text-sm text-zinc-500 mb-1">
              We sent a 6-digit confirmation code to:
            </p>
            <p className="text-sm font-semibold text-zinc-900 mb-6 break-all">
              {email}
            </p>

            <label htmlFor="token" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Confirmation code
            </label>
            <input
              id="token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && token.length === 6) setStep('confirm');
              }}
              placeholder="123456"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent mb-6"
            />

            <p className="text-xs text-zinc-400 mb-6 text-center">
              Code expires in 15 minutes.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep('confirm')}
                disabled={token.length !== 6}
                className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-semibold py-3 rounded-full text-sm transition-colors"
              >
                Next
              </button>
              <button
                onClick={() => { setToken(''); setStep('form'); }}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-semibold py-3 rounded-full text-sm transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 3 — Confirmation                                            */}
        {/* ---------------------------------------------------------------- */}
        {step === 'confirm' && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-zinc-900 mb-2">
              Are you sure?
            </h2>
            <p className="text-sm text-zinc-500 mb-1">
              You are about to cancel the subscription for:
            </p>
            <p className="text-sm font-semibold text-zinc-900 mb-6 break-all">
              {email}
            </p>
            <p className="text-sm text-zinc-500 mb-8">
              Premium access will be removed immediately. You will not receive
              a refund for the current billing period.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-3 rounded-full text-sm transition-colors"
              >
                {loading ? 'Cancelling…' : 'Yes, cancel my subscription'}
              </button>
              <button
                onClick={() => setStep('token')}
                disabled={loading}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-3 rounded-full text-sm transition-colors"
              >
                Keep my subscription
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Step 4 — Success                                                 */}
        {/* ---------------------------------------------------------------- */}
        {step === 'success' && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">
              Subscription cancelled
            </h2>
            <p className="text-sm text-zinc-500 mb-1">
              Your premium access has been removed for:
            </p>
            <p className="text-sm font-semibold text-zinc-900 mb-6 break-all">
              {email}
            </p>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              You can still use SafeUnfollow for free. If you change your mind,
              you can resubscribe at any time.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors"
            >
              Back to SafeUnfollow
            </Link>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Error state                                                      */}
        {/* ---------------------------------------------------------------- */}
        {step === 'error' && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">
              {errorMsg}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStep('form')}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-3 rounded-full text-sm transition-colors"
              >
                Try again
              </button>
              <Link
                href="/"
                className="w-full text-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold py-3 rounded-full text-sm transition-colors"
              >
                Go home
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
