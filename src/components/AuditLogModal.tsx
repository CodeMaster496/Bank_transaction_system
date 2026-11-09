import React, { useState, useEffect } from 'react';
import { X, Shield, Lock, FileText, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { AuditLogItem } from '../types/banking.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const { getAuthHeaders } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/audit-logs', { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Compliance & Security Audit Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PostgreSQL immutable event logs &bull; Tamper-evident transaction trail
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              title="Refresh logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audit List */}
        <div className="overflow-y-auto mt-4 space-y-2 pr-1 flex-1">
          {loading && logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading audit records...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No audit logs recorded yet.</div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'SUCCESS';
              const isWarning = log.status === 'WARNING';

              let parsedDetails: any = null;
              try {
                parsedDetails = JSON.parse(log.details);
              } catch (e) {
                parsedDetails = log.details;
              }

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {log.action}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                      <span>{log.ipAddress || '127.0.0.1'}</span>
                      <span>&bull;</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {parsedDetails && (
                    <div className="mt-2 p-2 rounded-lg bg-black/5 dark:bg-black/30 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all">
                      {typeof parsedDetails === 'object'
                        ? JSON.stringify(parsedDetails, null, 2)
                        : parsedDetails}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700"
          >
            Close Logs
          </button>
        </div>
      </div>
    </div>
  );
};
