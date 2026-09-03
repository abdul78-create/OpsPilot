'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders, Sun, Moon, Monitor, Code,
  Volume2, Eye, Check, Save
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/components/ui/ThemeProvider';

export const PreferencesSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [codeFont, setCodeFont] = useState<'jetbrains' | 'geist' | 'fira'>('jetbrains');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [streamRate, setStreamRate] = useState<'realtime' | 'batched'>('realtime');
  const [saved, setSaved] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedFont = localStorage.getItem('opspilot_code_font');
      if (storedFont) setCodeFont(storedFont as any);

      const storedSound = localStorage.getItem('opspilot_sound_enabled');
      if (storedSound) setSoundEnabled(storedSound === 'true');
    }
  }, []);

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('opspilot_code_font', codeFont);
      localStorage.setItem('opspilot_sound_enabled', soundEnabled.toString());
      localStorage.setItem('opspilot_stream_rate', streamRate);
    }
    setSaved(true);
    toast({
      kind: 'success',
      title: 'Preferences Saved',
      message: 'Workspace display and editor preferences applied.',
    });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 text-xs">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Platform Preferences</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Customize interface appearance, typography, and execution log streaming options.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl p-6 shadow-sm space-y-6">
        {/* ── Theme Selection ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="font-semibold text-[var(--text-primary)]">Interface Theme</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Select between light substrate and deep obsidian dark mode.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                theme === 'light'
                  ? 'bg-[var(--surface-primary)] text-amber-500 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-[var(--surface-primary)] text-indigo-400 shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Dark
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange('system')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors ${
                theme === 'system'
                  ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              System
            </button>
          </div>
        </div>

        {/* ── Code Typography ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="font-semibold text-[var(--text-primary)]">Console Code Font</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Monospace font used across pipeline log viewers and DAG inspector.
            </p>
          </div>

          <div className="sm:w-64">
            <select
              value={codeFont}
              onChange={(e) => setCodeFont(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="jetbrains">JetBrains Mono</option>
              <option value="geist">Geist Mono</option>
              <option value="fira">Fira Code</option>
            </select>
          </div>
        </div>

        {/* ── Log Telemetry Streaming ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="font-semibold text-[var(--text-primary)]">Log Stream Buffering</div>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Choose between raw SSE frame stream or 250ms batched rendering.
            </p>
          </div>

          <div className="sm:w-64">
            <select
              value={streamRate}
              onChange={(e) => setStreamRate(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="realtime">Immediate SSE (Lowest Latency)</option>
              <option value="batched">Batched 250ms (CPU Optimized)</option>
            </select>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm"
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
