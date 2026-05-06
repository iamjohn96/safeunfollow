'use client';

import { useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { t, detectLang, type Lang } from '@/utils/i18n';
import { parseFile, type ParsedData } from '@/utils/parser';
import { Dashboard } from '@/components/Dashboard';
import { Suspense } from 'react';

function UploadContent() {
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Lang>('en');
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [errorKey, setErrorKey] = useState<'upload.error.invalid' | 'upload.error.missing'>('upload.error.invalid');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLang(detectLang(searchParams));
    // Restore from localStorage if available
    try {
      const raw = localStorage.getItem('lastParsedData');
      if (raw) setParsedData(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [searchParams]);

  const processFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.zip') && !name.endsWith('.json')) {
      setErrorKey('upload.error.invalid');
      setStatus('error');
      return;
    }

    setStatus('processing');
    try {
      const data = await parseFile(file);
      if (data.followers.length === 0 && data.following.length === 0) {
        setErrorKey('upload.error.missing');
        setStatus('error');
        return;
      }
      localStorage.setItem('lastParsedData', JSON.stringify(data));
      setParsedData(data);
      setStatus('idle');
    } catch {
      setErrorKey('upload.error.missing');
      setStatus('error');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  if (parsedData) {
    return (
      <div>
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
          <button
            onClick={() => setParsedData(null)}
            className="text-sm text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.back', lang)} / Upload new file
          </button>
        </div>
        <Dashboard data={parsedData} lang={lang} onReset={() => setParsedData(null)} />
      </div>
    );
  }

  return (
    <section className="flex-1 flex flex-col items-center justify-center py-16 px-4" aria-labelledby="upload-heading">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 id="upload-heading" className="text-2xl font-bold text-zinc-900 mb-2">
            {t('upload.title', lang)}
          </h1>
          <p className="text-sm text-zinc-500">{t('upload.subtitle', lang)}</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          aria-label="Upload Instagram data file"
          className={`
            relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center
            ${isDragging
              ? 'border-pink-400 bg-pink-50 scale-[1.01]'
              : 'border-zinc-200 bg-white hover:border-pink-300 hover:bg-pink-50/40'
            }
            ${status === 'error' ? 'border-red-300 bg-red-50/40' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,.json"
            onChange={handleChange}
            className="sr-only"
            aria-hidden="true"
          />

          {status === 'processing' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
              <p className="text-sm font-medium text-zinc-600">{t('upload.processing', lang)}</p>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-zinc-700 mb-1">{t('upload.drag', lang)}</p>
              <p className="text-xs text-zinc-400 mb-4">{t('upload.or', lang)}</p>
              <span className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors">
                {t('upload.browse', lang)}
              </span>
            </>
          )}
        </div>

        {/* Format hint */}
        <p className="text-center text-xs text-zinc-400 mt-3">{t('upload.formats', lang)}</p>

        {/* Error */}
        {status === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 text-center">
            {t(errorKey, lang)}
          </div>
        )}

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="text-green-500">✓</span> No Instagram login
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-green-500">✓</span> No server upload
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-green-500">✓</span> 100% private
          </span>
        </div>
      </div>
    </section>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadContent />
    </Suspense>
  );
}
