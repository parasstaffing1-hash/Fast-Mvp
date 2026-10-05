'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mail,
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  TrendingUp,
  Link2,
  FileText,
  Lightbulb,
  ShieldCheck,
  Share2,
  Printer,
  Copy,
  Check,
  X,
  Bot,
} from 'lucide-react';

export interface FullReportData {
  scanId: string;
  userEmail?: string;
  business: {
    name: string;
    url: string;
    domain: string;
    industry: string;
    city: string;
    language: string;
    services: string[];
    description: string;
  };
  scores: {
    overall_score: number;
    openai_score: number;
    gemini_score: number;
    google_score: number;
    questions_checked: number;
    questions_mentioned: number;
    mention_rate: number;
    competitor_count: number;
    citation_count: number;
    grade: string;
    methodology: {
      description: string;
      engineWeights: Record<string, string>;
      scoringRules: string[];
    };
  };
  questionResults: Array<{
    orderIndex: number;
    question: string;
    intent: string;
    openai: {
      mentioned: boolean;
      position: number | null;
      evidence: string;
      competitors?: Array<{ name: string; position?: number }>;
      sources?: Array<{ title?: string; url: string; domain?: string }>;
      rawResponse?: string;
    } | null;
    gemini: {
      mentioned: boolean;
      position: number | null;
      evidence: string;
      competitors?: Array<{ name: string; position?: number }>;
      sources?: Array<{ title?: string; url: string; domain?: string }>;
      rawResponse?: string;
    } | null;
    google: {
      visible: boolean;
      position: number | null;
      snippet: string;
      sources?: Array<{ title?: string; url: string; domain?: string }>;
      rawResponse?: string;
    } | null;
  }>;
  topCompetitors: Array<{
    name: string;
    appearances: number;
    averagePosition: number | null;
  }>;
  topSources: Array<{
    domain: string;
    title: string;
    url: string;
    occurrences: number;
  }>;
  recommendations: string[];
  createdAt: string;
  scanDurationSeconds?: number;
}

interface FullReportPageProps {
  report: FullReportData;
}

export function FullReportPage({ report }: FullReportPageProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [showRawResponses, setShowRawResponses] = useState<Record<number, boolean>>({});
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(report.userEmail || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const { business, scores, questionResults, topCompetitors, topSources, recommendations } = report;
  const isEt = business.language === 'et';

  const openEmailModal = () => {
    if (!recipientEmail && typeof window !== 'undefined') {
      const saved = localStorage.getItem('picked_ai_last_email');
      if (saved) setRecipientEmail(saved);
    }
    setIsEmailModalOpen(true);
  };

  const toggleExpand = (idx: number) => {
    setExpandedQuestion((prev) => (prev === idx ? null : idx));
  };

  const toggleRaw = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRawResponses((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setEmailStatus({
        type: 'error',
        message: isEt ? 'Palun sisestage kehtiv e-posti aadress.' : 'Please enter a valid email address.',
      });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const res = await fetch('/api/email-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.scanId,
          email: recipientEmail.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || 'Failed to send email.');
      }

      setEmailStatus({
        type: 'success',
        message: isEt
          ? `Auditiraport saadeti edukalt aadressile ${recipientEmail}!`
          : `Executive report successfully delivered to ${recipientEmail}!`,
      });

      localStorage.setItem('picked_ai_last_email', recipientEmail.trim());

      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailStatus(null);
      }, 3000);
    } catch (err: any) {
      setEmailStatus({
        type: 'error',
        message: err.message || (isEt ? 'Viga kirja saatmisel.' : 'Failed to deliver email. Check RESEND_API_KEY configuration.'),
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEt ? 'Tagasi avalehele' : 'Back to Scanner'}</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy public link to share"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{copiedLink ? (isEt ? 'Kopeeritud!' : 'Copied!') : (isEt ? 'Jaga linki' : 'Share Link')}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{isEt ? 'Prindi / PDF' : 'Print PDF'}</span>
            </button>

            <button
              onClick={openEmailModal}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEt ? 'Saada e-postile' : 'Email Report'}</span>
            </button>

            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-colors cursor-pointer"
            >
              {isEt ? 'Uus audit' : 'New Scan'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        {/* Header Block */}
        <div className="border-b border-slate-800 pb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>AI VISIBILITY REPORT</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {business.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-400 mt-2">
                <a
                  href={business.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <span>{business.domain}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>•</span>
                <span>{business.industry}</span>
                <span>•</span>
                <span>{business.city}</span>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500 font-mono">
              <div>Scan Date: {new Date(report.createdAt).toLocaleDateString()}</div>
              <div>ID: {report.scanId}</div>
            </div>
          </div>
        </div>

        {/* Overall Score & Engine Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Overall Score Box */}
          <div className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-400/30 rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                Overall AI Visibility
              </div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className="text-6xl font-black text-white tracking-tight">
                  {scores.overall_score}
                </span>
                <span className="text-2xl text-slate-500 font-bold">/ 100</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span>GEO Grade:</span>
                <span className="font-extrabold text-amber-400 text-sm">{scores.grade}</span>
              </div>
              <div className="flex justify-between">
                <span>{isEt ? 'Mainimismäär:' : 'Mention Rate:'}</span>
                <span className="font-bold text-white">
                  {scores.questions_mentioned} / {scores.questions_checked} ({scores.mention_rate}%)
                </span>
              </div>
            </div>
          </div>

          {/* Engine Breakdown Box */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* OpenAI */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    OpenAI (ChatGPT)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="text-4xl font-black text-white mt-3">
                  {scores.openai_score} <span className="text-sm text-slate-500 font-normal">/ 100</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isEt ? 'Soovituste skoor mudelis GPT-4o' : 'Recommendation score in GPT-4o'}
                </p>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full"
                  style={{ width: `${Math.max(5, scores.openai_score)}%` }}
                />
              </div>
            </div>

            {/* Gemini */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Google Gemini
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                </div>
                <div className="text-4xl font-black text-white mt-3">
                  {scores.gemini_score} <span className="text-sm text-slate-500 font-normal">/ 100</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isEt ? 'Gemini 3.8 vastuste skoor' : 'Gemini 3.8 response score'}
                </p>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-sky-400 h-full rounded-full"
                  style={{ width: `${Math.max(5, scores.gemini_score)}%` }}
                />
              </div>
            </div>

            {/* Google Search Visibility */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Google Search
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                </div>
                <div className="text-4xl font-black text-white mt-3">
                  {scores.google_score} <span className="text-sm text-slate-500 font-normal">/ 100</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isEt ? 'Orgaanilise indeksi nähtavus' : 'Organic search indexing'}
                </p>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full mt-4 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${Math.max(5, scores.google_score)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Business Entity Profile */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>{isEt ? 'Analüüsitud ettevõtte profiil' : 'Extracted Business Profile'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="text-slate-500 uppercase font-bold text-[10px]">Location</div>
              <div className="text-white font-bold mt-1">{business.city}</div>
              <div className="text-slate-400 text-[11px] mt-0.5">{business.industry}</div>
            </div>

            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 sm:col-span-2">
              <div className="text-slate-500 uppercase font-bold text-[10px]">Identified Core Services</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {business.services.map((srv, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Question Results (10 buyer prompts x 3 models) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {isEt ? '10 kliendipäringu tulemused' : '10 Customer Questions Results'}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              30 {isEt ? 'kontrolli' : 'observations'}
            </span>
          </div>

          <div className="space-y-3">
            {questionResults.map((qr, idx) => {
              const isExpanded = expandedQuestion === idx;
              const isRawOpen = showRawResponses[idx] || false;

              return (
                <div
                  key={idx}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden transition-all"
                >
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/90 transition-colors"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          #{qr.orderIndex}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          {qr.intent}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">
                        &ldquo;{qr.question}&rdquo;
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* OpenAI Result */}
                      <div
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                          qr.openai?.mentioned
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>OpenAI</span>
                        {qr.openai?.mentioned ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            {qr.openai.position && (
                              <span className="text-[10px] bg-emerald-500/20 px-1 rounded">
                                #{qr.openai.position}
                              </span>
                            )}
                          </>
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>

                      {/* Gemini Result */}
                      <div
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                          qr.gemini?.mentioned
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Gemini</span>
                        {qr.gemini?.mentioned ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                            {qr.gemini.position && (
                              <span className="text-[10px] bg-sky-500/20 px-1 rounded">
                                #{qr.gemini.position}
                              </span>
                            )}
                          </>
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>

                      {/* Google Search Result */}
                      <div
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                          qr.google?.visible
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <span>Google</span>
                        {qr.google?.visible ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </div>

                      <button className="text-slate-500 hover:text-white p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800 bg-slate-950/70 text-xs space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* OpenAI Evidence */}
                        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                          <div className="font-bold text-slate-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-emerald-400" />
                              <span>OpenAI Observation</span>
                            </span>
                            <span className="text-slate-500 font-mono">
                              {qr.openai?.mentioned ? `Position #${qr.openai.position || '—'}` : 'Not Mentioned'}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed italic">
                            &ldquo;{qr.openai?.evidence || 'No direct mention detected.'}&rdquo;
                          </p>

                          {/* Cited sources */}
                          {qr.openai?.sources && qr.openai.sources.length > 0 && (
                            <div className="pt-2 border-t border-slate-800/60">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                                {isEt ? 'Tsiteeritud allikad:' : 'Cited Sources:'}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {qr.openai.sources.map((s, si) => (
                                  <a
                                    key={si}
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-400 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                  >
                                    <span>{s.domain || s.title}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Gemini Evidence */}
                        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                          <div className="font-bold text-slate-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-sky-400" />
                              <span>Gemini Observation</span>
                            </span>
                            <span className="text-slate-500 font-mono">
                              {qr.gemini?.mentioned ? `Position #${qr.gemini.position || '—'}` : 'Not Mentioned'}
                            </span>
                          </div>
                          <p className="text-slate-400 leading-relaxed italic">
                            &ldquo;{qr.gemini?.evidence || 'No direct mention detected.'}&rdquo;
                          </p>

                          {/* Cited sources */}
                          {qr.gemini?.sources && qr.gemini.sources.length > 0 && (
                            <div className="pt-2 border-t border-slate-800/60">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
                                {isEt ? 'Tsiteeritud allikad:' : 'Cited Sources:'}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {qr.gemini.sources.map((s, si) => (
                                  <a
                                    key={si}
                                    href={s.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-amber-400 text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                  >
                                    <span>{s.domain || s.title}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Google Search Observation Note */}
                      {qr.google && (
                        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 flex items-start gap-2">
                          <span className="font-bold text-slate-300 shrink-0">Google Search:</span>
                          <span className="text-[11px] leading-relaxed">{qr.google.snippet}</span>
                        </div>
                      )}

                      {/* Full Raw Output Toggle */}
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => toggleRaw(idx, e)}
                          className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>
                            {isRawOpen
                              ? isEt ? 'Peida täielik AI vastus' : 'Hide Full AI Responses'
                              : isEt ? 'Vaata täielikke AI vastuseid' : 'View Full Stored AI Responses'}
                          </span>
                        </button>
                      </div>

                      {isRawOpen && (
                        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3 font-mono text-[11px]">
                          {qr.openai?.rawResponse && (
                            <div className="space-y-1">
                              <span className="text-emerald-400 font-bold block">--- OpenAI Stored Response ---</span>
                              <pre className="whitespace-pre-wrap font-sans text-slate-300 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed">
                                {qr.openai.rawResponse}
                              </pre>
                            </div>
                          )}

                          {qr.gemini?.rawResponse && (
                            <div className="space-y-1">
                              <span className="text-sky-400 font-bold block">--- Gemini Stored Response ---</span>
                              <pre className="whitespace-pre-wrap font-sans text-slate-300 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800 leading-relaxed">
                                {qr.gemini.rawResponse}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Competitors & Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Competitors Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{isEt ? 'Konkurentide esinemine vastustes' : 'Competitors Mentioned'}</span>
            </h2>

            {topCompetitors.length > 0 ? (
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider grid grid-cols-12">
                  <div className="col-span-6">{isEt ? 'Konkurent' : 'Competitor'}</div>
                  <div className="col-span-3 text-center">{isEt ? 'Mainimised' : 'Appearances'}</div>
                  <div className="col-span-3 text-right">{isEt ? 'Kesk. koht' : 'Avg Position'}</div>
                </div>

                {topCompetitors.map((comp, i) => (
                  <div key={i} className="p-3 text-xs grid grid-cols-12 items-center text-slate-300">
                    <div className="col-span-6 font-bold text-white">{comp.name}</div>
                    <div className="col-span-3 text-center font-mono text-amber-400">
                      {comp.appearances}
                    </div>
                    <div className="col-span-3 text-right font-mono text-slate-400">
                      {comp.averagePosition ? `#${comp.averagePosition}` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {isEt ? 'Konkurente ei tuvastatud vastustes.' : 'No major competitors mentioned across answers.'}
              </p>
            )}
          </div>

          {/* Sources Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Link2 className="w-4 h-4 text-amber-400" />
              <span>{isEt ? 'Enim tsiteeritud allikad & lingid' : 'Top Cited Sources & Domains'}</span>
            </h2>

            {topSources.length > 0 ? (
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-950 p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider grid grid-cols-12">
                  <div className="col-span-8">{isEt ? 'Allikas ja domeen' : 'Title & Domain'}</div>
                  <div className="col-span-4 text-right">{isEt ? 'Viiteid' : 'Citations'}</div>
                </div>

                {topSources.map((src, i) => (
                  <div key={i} className="p-3 text-xs grid grid-cols-12 items-center text-slate-300">
                    <div className="col-span-8 truncate pr-2">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-white hover:text-amber-400 font-semibold hover:underline flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{src.title || src.domain}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-500" />
                      </a>
                      <div className="text-[10px] text-slate-500">{src.domain}</div>
                    </div>
                    <div className="col-span-4 text-right font-mono text-amber-400">
                      {src.occurrences}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {isEt ? 'Väliseid viitelinke ei eraldatud.' : 'No external source citations recorded.'}
              </p>
            )}
          </div>
        </div>

        {/* Actionable Recommendations */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <span>{isEt ? 'Strateegilised soovitused nähtavuse tõstmiseks' : 'Actionable GEO Recommendations'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isEt
              ? 'Konkreetsed soovitused, mis põhinevad Sinu auditi tulemustel ja konkurentide eelistel:'
              : 'Data-driven recommendations tailored specifically to your scan results and competitor strengths:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transparency Statement */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-500 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            {isEt
              ? 'Läbipaistvuse põhimõte: Google Search visibility näitab orgaanilise otsingu andmeid. Me ei fabritseeri Google AI Overview andmeid ilma ametliku API toeta.'
              : 'Methodology Transparency: Google Search visibility reflects verified organic search grounding without scraping Google or fabricating AI Overview data.'}
          </span>
        </div>
      </div>

      {/* Email Report Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => {
                setIsEmailModalOpen(false);
                setEmailStatus(null);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {isEt ? 'Saada auditiraport e-postile' : 'Email Executive Audit Report'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEt
                  ? `Saadame ${business.name} täismahus tehisintellekti nähtavuse raporti Sinu postkasti.`
                  : `Send the complete executive AI visibility audit for ${business.name} directly to your inbox.`}
              </p>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  {isEt ? 'E-posti aadress' : 'Recipient Email'}
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  disabled={isSendingEmail}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-white text-sm outline-hidden font-medium"
                />
              </div>

              {emailStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium ${
                    emailStatus.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  {emailStatus.message}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  {isEt ? 'Tühista' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSendingEmail ? (isEt ? 'Saadan...' : 'Sending...') : (isEt ? 'Saada raport' : 'Send Report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
