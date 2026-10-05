'use client';

import React from 'react';
import { SupportedLanguage } from '@/types/scanner';
import { DBScanStatus } from '@/lib/database/repository';
import { Loader2, CheckCircle2, Circle, AlertCircle, RefreshCw } from 'lucide-react';

export interface RealScanStatusData {
  id: string;
  url: string;
  business_name?: string;
  industry?: string;
  city?: string;
  status: DBScanStatus;
  progress: number;
  error?: string | null;
  checks: {
    total: number;
    completed: number;
    message: string;
  };
}

interface RealProgressViewProps {
  scan: RealScanStatusData;
  language: SupportedLanguage;
  onRetry: () => void;
}

export function RealProgressView({ scan, language, onRetry }: RealProgressViewProps) {
  const isEt = language === 'et';

  // Real database steps
  // 1. Website analyzed (crawling)
  // 2. Business identified (analyzing)
  // 3. Questions generated (generating_questions)
  // 4. Checking AI visibility (checking_ai)
  // 5. Building report (building_report)
  // 6. Sending email & completed (completed)
  const stepsOrder: DBScanStatus[] = [
    'crawling',
    'analyzing',
    'generating_questions',
    'checking_ai',
    'building_report',
    'completed',
  ];

  const currentIdx = stepsOrder.indexOf(scan.status);

  const getStepState = (targetStep: DBScanStatus) => {
    if (scan.status === 'completed') return 'done';
    if (scan.status === 'failed') {
      const stepIdx = stepsOrder.indexOf(targetStep);
      return stepIdx <= currentIdx ? 'failed' : 'pending';
    }

    const stepIdx = stepsOrder.indexOf(targetStep);
    if (currentIdx > stepIdx) return 'done';
    if (currentIdx === stepIdx) return 'active';
    return 'pending';
  };

  const stepsList = [
    {
      step: 'crawling' as DBScanStatus,
      title: isEt ? 'Veebisait analüüsitud' : 'Website analyzed',
      subtitle: isEt ? 'Crawl4AI lehtede kraapimine (/, /about, /services)' : 'Crawl4AI multi-page extraction (/, /about, /services)',
    },
    {
      step: 'analyzing' as DBScanStatus,
      title: isEt ? 'Ettevõte tuvastatud' : 'Business identified',
      subtitle: scan.business_name
        ? `${scan.business_name} • ${scan.city || ''} (${scan.industry || ''})`
        : isEt ? 'Tegevusala, asukoha ja teenuste eraldamine' : 'Industry, location & core services profiled',
    },
    {
      step: 'generating_questions' as DBScanStatus,
      title: isEt ? 'Kliendipäringud genereeritud' : 'Questions generated',
      subtitle: isEt ? '10 realistlikku ostukavatsusega päringut' : '10 high-value customer buyer prompts',
    },
    {
      step: 'checking_ai' as DBScanStatus,
      title: isEt ? 'AI nähtavuse kontroll' : 'Checking AI visibility',
      subtitle: `${scan.checks.completed} / ${scan.checks.total} ${isEt ? 'kontrolli teostatud' : 'checks'}`,
      isCheckingStep: true,
    },
    {
      step: 'building_report' as DBScanStatus,
      title: isEt ? 'Raporti koostamine' : 'Building report',
      subtitle: isEt ? 'Nähtavusskoor, konkurendid ja viited' : 'Visibility score, competitor SOV & citations',
    },
    {
      step: 'completed' as DBScanStatus,
      title: isEt ? 'Raporti e-kirja saatmine' : 'Sending email',
      subtitle: isEt ? 'Täismahus raport saadetud e-postile' : 'Executive report delivered to user email',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="text-center space-y-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            {scan.status === 'failed' ? (
              <AlertCircle className="w-6 h-6 text-rose-400" />
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
            )}
          </div>

          <h2 className="text-2xl font-black text-white">
            {scan.status === 'failed'
              ? isEt ? 'Skannimisel tekkis tõrge' : 'Scan Encountered an Issue'
              : isEt ? 'Tehisintellekti nähtavuse audit käib' : 'AI Visibility Scan in Progress'}
          </h2>

          <p className="text-sm text-slate-400 font-medium">
            {scan.checks.message || (isEt ? 'Töödeldakse...' : 'Processing...')}
          </p>
        </div>

        {/* Real Progress Bar */}
        <div className="space-y-2 mb-8">
          <div className="flex justify-between text-xs font-bold text-slate-300">
            <span className="truncate pr-4 text-slate-400">{scan.url}</span>
            <span className="text-amber-400 font-mono">{scan.progress}%</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                scan.status === 'failed'
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500'
              }`}
              style={{ width: `${Math.max(5, scan.progress)}%` }}
            />
          </div>
        </div>

        {/* Real Step Statuses */}
        <div className="space-y-3 border-t border-slate-800/80 pt-6">
          {stepsList.map((st, i) => {
            const state = getStepState(st.step);

            return (
              <div
                key={i}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm transition-all ${
                  state === 'active'
                    ? 'bg-amber-400/5 border-amber-400/40 text-white font-semibold'
                    : state === 'done'
                    ? 'bg-slate-950/40 border-slate-800/70 text-slate-300 font-medium'
                    : 'bg-slate-950/20 border-transparent text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                    {state === 'done' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    )}
                    {state === 'active' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    )}
                    {state === 'pending' && (
                      <Circle className="w-4 h-4 text-slate-700" />
                    )}
                    {state === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{st.title}</span>
                      {state === 'active' && st.isCheckingStep && (
                        <span className="text-[11px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                          {scan.checks.completed} / {scan.checks.total}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{st.subtitle}</div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {state === 'active' && (
                    <span className="text-[11px] font-bold text-amber-400 animate-pulse">
                      In progress...
                    </span>
                  )}
                  {state === 'done' && (
                    <span className="text-[11px] font-bold text-emerald-400">
                      ✓ Done
                    </span>
                  )}
                  {state === 'pending' && (
                    <span className="text-[11px] font-bold text-slate-700">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Failed Error Message & Retry */}
        {scan.status === 'failed' && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3">
            <p className="font-medium">
              {isEt
                ? 'Me ei saanud seda skannimist lõpule viia. Palun proovige uuesti.'
                : "We couldn't complete this scan. Please try again."}
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isEt ? 'Proovi uuesti' : 'Try Again'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
