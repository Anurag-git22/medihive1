import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  ShieldCheck,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import {
  getSupabaseConfig,
  saveCustomSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
  SupabaseConfigInfo,
} from "../../lib/supabase";
import { useToast } from "./Toast";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: () => void;
}

export const SupabaseConnectionModal: React.FC<
  SupabaseConnectionModalProps
> = ({ isOpen, onClose, onConnectionSuccess }) => {
  const { showToast } = useToast();
  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
  const [config, setConfig] = useState<SupabaseConfigInfo>(() =>
    getSupabaseConfig(),
  );
  const [urlInput, setUrlInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getSupabaseConfig();
      setConfig(active);
      setUrlInput(active.url);
      setKeyInput(active.key);
      setTestResult(null);

      // Auto run probe check
      setIsTesting(true);
      testSupabaseConnection(active.url, active.key).then((res) => {
        setIsTesting(false);
        setTestResult({
          tested: true,
          success: res.success,
          message: res.message,
          details: res.details,
        });
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(urlInput, keyInput);
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        details: res.details,
      });
      if (res.success) {
        showToast("Connection test passed! Database is reachable.", "success");
      } else {
        showToast(res.message, "error");
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const trimmedUrl = urlInput.trim();
    const trimmedKey = keyInput.trim();

    if (!trimmedUrl || !trimmedKey) {
      showToast(
        "Please enter both Supabase Project URL and Anon Key.",
        "error",
      );
      return;
    }

    setIsTesting(true);
    const probe = await testSupabaseConnection(trimmedUrl, trimmedKey);
    setIsTesting(false);

    if (!probe.success && probe.status !== "tables_missing") {
      setTestResult({
        tested: true,
        success: false,
        message: probe.message,
        details: probe.details,
      });
      showToast(probe.message, "error");
      return;
    }

    saveCustomSupabaseConfig(trimmedUrl, trimmedKey);
    const updated = getSupabaseConfig();
    setConfig(updated);
    showToast(
      "Supabase credentials saved successfully! Reloading clinic data...",
      "success",
    );

    if (onConnectionSuccess) {
      onConnectionSuccess();
    }

    setTimeout(() => {
      onClose();
      // Reload page to re-hydrate state and attach realtime channel cleanly
      window.location.reload();
    }, 1200);
  };

  const handleResetToEnv = () => {
    clearCustomSupabaseConfig();
    const updated = getSupabaseConfig();
    setConfig(updated);
    setUrlInput(updated.url);
    setKeyInput(updated.key);
    showToast("Reset to default .env configuration.", "info");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="supabase-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[96dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-[#194358] via-[#205570] to-[#2c7295] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Database className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <h2
                id="supabase-modal-title"
                className="text-base font-bold text-white flex items-center gap-2"
              >
                <span>Supabase Cloud Database Connection</span>
              </h2>
              <p className="text-xs text-sky-100/90">
                Connect your MediHive clinic to PostgreSQL cloud storage &
                multi-device sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-slate-700 touch-scroll">
          {/* Status Alert Banner */}
          {testResult && testResult.tested ? (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <p className="font-bold">{testResult.message}</p>
                {testResult.details && (
                  <p
                    className={`text-[11px] ${testResult.success ? "text-emerald-700" : "text-amber-800"}`}
                  >
                    {testResult.details}
                  </p>
                )}
              </div>
            </div>
          ) : isTesting ? (
            <div className="p-3.5 rounded-xl border bg-sky-50 border-sky-200 text-sky-900 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
              <span className="font-medium text-xs">
                Testing connection to Supabase...
              </span>
            </div>
          ) : null}

          {/* Explanation if placeholder */}
          {config.isPlaceholder && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Why Supabase is not connected right now:</span>
              </p>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                Your configuration currently has the template placeholder{" "}
                <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-rose-950 font-bold">
                  https://your-project-id.supabase.co
                </code>
                . To sync your patients and prescriptions to the cloud, paste
                your real <strong>Project URL</strong> and{" "}
                <strong>Anon Key</strong> below.
              </p>
            </div>
          )}

          {/* Form Inputs */}
          <div className="space-y-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-actual-id.supabase.co"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#194358]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Found in: Supabase Dashboard &gt; Project Settings &gt; API &gt;
                Project URL
              </p>
            </div>

            <div>
              <label className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Supabase Anon Public API Key</span>
              </label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#194358]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Found in: Supabase Dashboard &gt; Project Settings &gt; API &gt;
                Project API keys &gt; <strong>anon public</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !urlInput.trim() || !keyInput.trim()}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isTesting ? "animate-spin" : ""}`}
                />
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                {config.source === "custom" && (
                  <button
                    type="button"
                    onClick={handleResetToEnv}
                    className="px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg text-xs flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Revert to .env</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isTesting || !urlInput.trim() || !keyInput.trim()}
                  className="px-4 py-1.5 bg-[#2ba4c7] hover:bg-[#228da8] text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Connect</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Step-by-Step Guide */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-sky-600" />
              <span>How to get your credentials in 30 seconds:</span>
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 leading-relaxed pl-1">
              <li>
                Open your project on{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-600 font-semibold underline hover:text-sky-800 inline-flex items-center gap-0.5"
                >
                  supabase.com/dashboard
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                In the bottom-left sidebar, click{" "}
                <strong>⚙️ Project Settings &gt; API</strong> (or{" "}
                <strong>Data API</strong>).
              </li>
              <li>
                Under <strong>Project URL</strong>, copy the URL (e.g.{" "}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                  https://xyz.supabase.co
                </code>
                ).
              </li>
              <li>
                Under <strong>Project API keys</strong>, copy the key labeled{" "}
                <strong>anon public</strong> (starts with{" "}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                  eyJ...
                </code>
                ).
              </li>
              <li>
                Paste them into the fields above and click{" "}
                <strong>Save & Connect</strong> (or update your{" "}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                  .env
                </code>{" "}
                file).
              </li>
              <li>
                Ensure you executed the SQL script from{" "}
                <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                  supabase_schema.sql
                </code>{" "}
                in the Supabase <strong>SQL Editor</strong> to create all
                tables!
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Current source:{" "}
            <strong className="uppercase font-mono">{config.source}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
