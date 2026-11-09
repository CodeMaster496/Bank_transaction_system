import React, { useState } from 'react';
import { X, PlusCircle, ArrowDownLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { BankAccount } from '../types/banking.ts';
import { formatCurrency } from '../utils/banking-logic.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  onDepositSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  account,
  onDepositSuccess,
}) => {
  const { getAuthHeaders } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Direct Check Deposit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !account) return null;

  const handleDeposit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid deposit amount greater than $0.00.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const headers = getAuthHeaders();
      const res = await fetch('/api/deposit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          accountId: account.id,
          amount: num,
          description: description.trim() || 'Direct Account Deposit',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Deposit failed.');
      }

      setSuccess(true);
      onDepositSuccess();
      setTimeout(() => {
        setSuccess(false);
        setAmount('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Deposit failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <PlusCircle className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Instant Deposit Credit
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Funds Deposited!</h4>
            <p className="text-xs text-slate-500">Live balance updated via WebSocket.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <span className="text-xs text-slate-500">Target Account:</span>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {account.accountType.toUpperCase()} ({account.accountNumber})
              </div>
              <div className="text-[11px] text-slate-400">
                Current: {formatCurrency(account.balance)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deposit Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                max="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000.00"
                className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick Amount presets */}
            <div className="flex gap-1.5">
              {[500, 1000, 2500, 5000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v.toString())}
                  className="flex-1 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  ${v}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Payroll or Treasury Transfer"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDeposit}
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>{isSubmitting ? 'Processing Deposit...' : 'Confirm Deposit'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
