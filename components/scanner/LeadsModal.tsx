'use client';

import React, { useEffect, useState } from 'react';
import { SupportedLanguage } from '@/types/scanner';
import { X, Users, Mail, Calendar, ExternalLink, ShieldAlert, RefreshCw } from 'lucide-react';

interface LeadItem {
  id: string;
  email: string;
  created_at: string;
}

interface LeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguage;
}

export function LeadsModal({ isOpen, onClose, language }: LeadsModalProps) {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEt = language === 'et';

  const fetchLeads = () => {
    setLoading(true);
    setError(null);
    fetch('/api/leads')
      .then((res) => res.json())
      .then((data) => {
        setLeads(data.leads || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error loading leads.');
        setLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      fetch('/api/leads')
        .then((res) => res.json())
        .then((data) => {
          if (!ignore) {
            setLeads(data.leads || []);
          }
        })
        .catch((err) => {
          if (!ignore) {
            setError(err.message || 'Error loading leads.');
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isEt ? 'Salvestatud kontaktid ja liidid' : 'Captured Leads & Scans'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEt ? 'Kõik veebilehe kaudu esitatud skaneerimiste e-postid' : 'All user leads captured from audit submissions'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
            {isEt ? 'Laen liide...' : 'Loading captured leads...'}
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        ) : leads.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            {isEt ? 'Liide ei ole veel salvestatud. Käivitage skann avalehel!' : 'No leads captured yet. Run a scan from the homepage!'}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl">
            {leads.map((lead) => (
              <div key={lead.id} className="p-3 text-xs flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-white">{lead.email}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {new Date(lead.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-between items-center text-xs text-slate-500 pt-4 border-t border-slate-800">
          <span>{leads.length} {isEt ? 'liidi salvestatud' : 'total captured'}</span>
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isEt ? 'Värskenda' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
