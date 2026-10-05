'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SupportedLanguage } from '@/types/scanner';
import { DarkHeroForm } from '@/components/scanner/DarkHeroForm';
import { RealProgressView, RealScanStatusData } from '@/components/scanner/RealProgressView';
import { FullReportPage, FullReportData } from '@/components/report/FullReportPage';
import { LeadsModal } from '@/components/scanner/LeadsModal';
import { Sparkles, Users, Globe, ExternalLink, Zap, AlertCircle, X } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [activeScan, setActiveScan] = useState<RealScanStatusData | null>(null);
  const [completedReport, setCompletedReport] = useState<FullReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeadsModalOpen, setIsLeadsModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll for scan status when a scan is active
  useEffect(() => {
    if (!activeScan || activeScan.status === 'completed' || activeScan.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${activeScan.id}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.scan) {
          setActiveScan(data.scan);

          if (data.scan.status === 'completed' && data.report) {
            setCompletedReport(data.report);
            setIsLoading(false);
          } else if (data.scan.status === 'failed') {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeScan]);

  const handleStartScan = async (url: string, email: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setCompletedReport(null);

    try {
      localStorage.setItem('picked_ai_last_email', email);

      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email, language }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate scan.');
      }

      setActiveScan({
        id: data.scanId,
        url,
        status: 'queued',
        progress: 5,
        checks: {
          total: 30,
          completed: 0,
          message: language === 'et' ? 'Töö lisati järjekorda...' : 'Scan queued in background runner...',
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while starting the scan.');
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setActiveScan(null);
    setCompletedReport(null);
    setIsLoading(false);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#070b14]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-md shadow-amber-400/20 font-black">
              <Zap className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white tracking-tight text-lg">Picked AI</span>
                <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-bold px-2 py-0.5 rounded">
                  Visibility Scanner
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                14-Day MVP • Multi-Model GEO Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLeadsModalOpen(true)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View captured leads"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{language === 'et' ? 'Liidid' : 'Leads'}</span>
            </button>

            <span className="text-xs text-slate-400 hidden md:inline">
              {language === 'et' ? 'Tulemused alla 3 min' : 'Target < 3 min parallel scan'}
            </span>

            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'en' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('et')}
                className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                  language === 'et' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                ET
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Global Inline Error Banner */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 w-full">
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col justify-center">
        {completedReport ? (
          <FullReportPage report={completedReport} />
        ) : activeScan && activeScan.status !== 'completed' ? (
          <RealProgressView
            scan={activeScan}
            language={language}
            onRetry={handleReset}
          />
        ) : (
          <DarkHeroForm
            language={language}
            onLanguageChange={setLanguage}
            onSubmit={handleStartScan}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Leads Modal */}
      <LeadsModal
        isOpen={isLeadsModalOpen}
        onClose={() => setIsLeadsModalOpen(false)}
        language={language}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/70 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Picked AI Visibility Scanner</span>
            <span>•</span>
            <span>PostgreSQL & Trigger.dev & Crawl4AI Architecture</span>
          </div>
          <div>
            {language === 'et'
              ? 'Toetatud mudelid: OpenAI (ChatGPT), Google Gemini & orgaaniline otsing'
              : 'Audits ChatGPT, Gemini and search-driven visibility across customer intents'}
          </div>
        </div>
      </footer>
    </div>
  );
}
