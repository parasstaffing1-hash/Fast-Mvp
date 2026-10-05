'use client';

import React, { useState } from 'react';
import { SupportedLanguage } from '@/types/scanner';
import { Search, Mail, Globe, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, Zap } from 'lucide-react';

interface DarkHeroFormProps {
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onSubmit: (url: string, email: string) => void;
  isLoading: boolean;
}

export function DarkHeroForm({
  language,
  onLanguageChange,
  onSubmit,
  isLoading,
}: DarkHeroFormProps) {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEt = language === 'et';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setError(isEt ? 'Palun sisestage veebisaidi aadress.' : 'Please enter your website URL.');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError(isEt ? 'Palun sisestage kehtiv e-posti aadress.' : 'Please enter a valid work email address.');
      return;
    }

    onSubmit(cleanUrl, cleanEmail);
  };

  const sampleBusinesses = [
    { name: 'Veriff', url: 'https://veriff.com', email: 'audit@veriff.com', lang: 'en' as const },
    { name: 'Pipedrive', url: 'https://pipedrive.com', email: 'audit@pipedrive.com', lang: 'en' as const },
    { name: 'Sorainen', url: 'https://sorainen.com', email: 'audit@sorainen.com', lang: 'et' as const },
  ];

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-16">
      {/* Language Switcher Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 rounded-full p-1 shadow-lg backdrop-blur-md">
          <Globe className="w-3.5 h-3.5 text-amber-400 ml-2 mr-1.5" />
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('et')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              language === 'et'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Eesti keel
          </button>
        </div>
      </div>

      {/* Hero Headline & Subhead */}
      <div className="text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold tracking-wide uppercase">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{isEt ? '14-Päeva MVP • AI Nähtavuse Skanner' : '14-Day MVP • AI Visibility Scanner'}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
          {isEt ? 'Vaata, kuidas AI soovitab Sinu ettevõtet' : 'See How AI Recommends Your Business'}
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {isEt
            ? 'Uuri välja, kas ChatGPT, Gemini ja otsingupõhised AI lahendused soovitavad Sinu ettevõtet — või millised konkurendid ilmuvad Sinu asemel.'
            : 'Find out whether ChatGPT, Gemini and search-driven AI experiences mention your business — and which competitors appear instead.'}
        </p>
      </div>

      {/* Main Submission Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent pointer-events-none rounded-tr-2xl" />

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Website URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isEt ? 'Ettevõtte veebisait' : 'Website URL'}
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={isEt ? 'nt. minu-ettevote.ee' : 'e.g. yourcompany.com'}
                  disabled={isLoading}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl text-white text-sm transition-all outline-hidden font-medium placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isEt ? 'Tööalane e-post raporti saamiseks' : 'Email address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isEt ? 'nimi@ettevote.ee' : 'name@company.com'}
                  disabled={isLoading}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-700/80 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl text-white text-sm transition-all outline-hidden font-medium placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Large Gold CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/30 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                {isEt ? 'Skannimine algab...' : 'Initiating Scan...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {isEt ? 'Skanni minu ettevõtet' : 'Scan My Business'}
                <ArrowRight className="w-5 h-5 text-slate-950" />
              </span>
            )}
          </button>
        </form>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-800">
          <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isEt ? '10 kliendipäringut' : '10 customer questions'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isEt ? '3 AI/otsingu kontrolli' : '3 AI/search visibility checks'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isEt ? 'Reaalsed vastused ja viited' : 'Real responses and citations'}</span>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">
            {isEt ? 'Kiirtestid:' : 'Quick Presets:'}
          </span>
          {sampleBusinesses.map((b, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setUrl(b.url);
                setEmail(b.email);
                onLanguageChange(b.lang);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transparency Guarantee Note */}
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-500 max-w-xl mx-auto flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span>
            {isEt
              ? 'Läbipaistvusgarantii: Google otsingu nähtavust mõõdetakse orgaanilise indeksi kaudu ilma Google reegleid rikkumata.'
              : 'Transparency Guarantee: Google Search visibility is measured via legitimate search indexing without fabricating AI Overview rankings.'}
          </span>
        </p>
      </div>
    </div>
  );
}
