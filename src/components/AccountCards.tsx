import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Unlock,
  Copy,
  Check,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { BankAccount } from '../types/banking.ts';
import { formatCurrency, maskAccountNumber } from '../utils/banking-logic.ts';

interface AccountCardsProps {
  accounts: BankAccount[];
  onDepositClick: (account: BankAccount) => void;
  onTransferClick: (account: BankAccount) => void;
  onToggleFreeze: (accountId: number) => Promise<void>;
  selectedAccountId: number | null;
  onSelectAccount: (accountId: number) => void;
}

export const AccountCards: React.FC<AccountCardsProps> = ({
  accounts,
  onDepositClick,
  onTransferClick,
  onToggleFreeze,
  selectedAccountId,
  onSelectAccount,
}) => {
  const [copiedAccNum, setCopiedAccNum] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<number | null>(null);

  const handleCopy = (accNum: string) => {
    navigator.clipboard.writeText(accNum);
    setCopiedAccNum(accNum);
    setTimeout(() => setCopiedAccNum(null), 2000);
  };

  const handleFreezeToggle = async (e: React.MouseEvent, accId: number) => {
    e.stopPropagation();
    try {
      setFreezingId(accId);
      await onToggleFreeze(accId);
    } finally {
      setFreezingId(null);
    }
  };

  const totalBalance = accounts.reduce((acc, a) => acc + parseFloat(a.balance || '0'), 0);

  return (
    <div className="space-y-4">
      {/* Overview Balance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Total Liquidity</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalBalance)}
          </div>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Real-time PostgreSQL synced</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Active Portfolios</span>
            <CreditCard className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {accounts.length} Accounts
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Checking &bull; Savings &bull; Wealth
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Security Status</span>
            <Lock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <span>Encrypted</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            ACID Transaction Locks Active
          </p>
        </div>
      </div>

      {/* Account Cards Carousel / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          const isFrozen = acc.status === 'frozen';
          const isChecking = acc.accountType === 'checking';
          const isSavings = acc.accountType === 'savings';

          const cardGradient = isChecking
            ? 'from-slate-900 via-slate-800 to-emerald-950 text-white'
            : isSavings
            ? 'from-emerald-900 via-teal-900 to-slate-900 text-white'
            : 'from-indigo-950 via-slate-900 to-cyan-950 text-white';

          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className={`relative group rounded-2xl p-5 sm:p-6 transition-all duration-200 cursor-pointer overflow-hidden border shadow-xl bg-gradient-to-br ${cardGradient} ${
                isSelected
                  ? 'ring-2 ring-emerald-500 border-transparent shadow-emerald-500/20'
                  : 'border-slate-200/20 hover:scale-[1.01]'
              } ${isFrozen ? 'opacity-80 saturate-50' : ''}`}
            >
              {/* Metallic sheen decorative overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />

              {/* Card Header: Type and Status */}
              <div className="relative flex items-center justify-between z-10">
                <div className="flex items-center space-x-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                    {acc.accountType}
                  </span>
                  {isFrozen && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/80 text-white tracking-wider">
                      <ShieldAlert className="w-3 h-3 mr-1" /> FROZEN
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono font-bold tracking-widest text-slate-300">
                    APEX
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* EMV Chip & Contactless Icon */}
              <div className="relative mt-4 flex items-center justify-between z-10">
                <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/50 shadow-inner flex items-center justify-center">
                  <div className="w-7 h-4 border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5">
                    <div className="border-r border-amber-800/40"></div>
                    <div></div>
                  </div>
                </div>

                {/* Account Number with Copy */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(acc.accountNumber);
                  }}
                  className="flex items-center space-x-1.5 px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-[11px] font-mono text-slate-300 transition-colors"
                  title="Click to copy full account number"
                >
                  <span>{maskAccountNumber(acc.accountNumber)}</span>
                  {copiedAccNum === acc.accountNumber ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Balance Amount */}
              <div className="relative mt-5 z-10">
                <div className="text-[11px] font-medium text-slate-400">Available Balance</div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 font-['Plus_Jakarta_Sans']">
                  {formatCurrency(acc.balance, acc.currency)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Daily Transfer Limit: {formatCurrency(acc.dailyLimit)}
                </div>
              </div>

              {/* Card Quick Actions */}
              <div className="relative mt-5 pt-3 border-t border-white/10 flex items-center justify-between z-10">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDepositClick(acc);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Deposit</span>
                  </button>

                  <button
                    type="button"
                    disabled={isFrozen}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTransferClick(acc);
                    }}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Transfer</span>
                  </button>
                </div>

                {/* Freeze / Unfreeze toggle */}
                <button
                  type="button"
                  disabled={freezingId === acc.id}
                  onClick={(e) => handleFreezeToggle(e, acc.id)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isFrozen
                      ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/40'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                  title={isFrozen ? 'Unlock account' : 'Lock/Freeze account'}
                >
                  {isFrozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
