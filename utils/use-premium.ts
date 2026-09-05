'use client';

import { useEffect, useState } from 'react';

export function usePremium() {
  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    let disposed = false;
    let pending = false;
    let lastCheck = 0;
    async function verify() {
      if (pending || Date.now() - lastCheck < 5000) return;
      pending = true;
      lastCheck = Date.now();
      let active = false;
      try {
        const email = localStorage.getItem('premiumEmail');
        const session = localStorage.getItem('premiumSession');
        if (email && session) {
          const response = await fetch('/api/premium/check', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, session }), cache: 'no-store', signal: AbortSignal.timeout(8000),
          });
          active = response.ok && (await response.json()).isPremium === true;
        }
      } catch { /* Unavailable verification must not grant access. */ }
      if (!disposed) {
        setIsPremium(active);
        try { localStorage.setItem('isPremium', String(active)); } catch { /* Storage may be disabled. */ }
      }
      pending = false;
    }
    void verify();
    const onFocus = () => { void verify(); };
    const timer = window.setInterval(onFocus, 60000);
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return [isPremium, setIsPremium] as const;
}
