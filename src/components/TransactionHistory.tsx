import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  FileSpreadsheet,
  Info,
  X,
  Copy,
} from 'lucide-react';
import { TransactionRecord } from '../types/banking.ts';
import { formatCurrency } from '../utils/banking-logic.ts';

interface TransactionHistoryProps {
  transactions: TransactionRecord[];
  isLoading: boolean;
  onRefresh: () => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [inspectTxn, setInspectTxn] = useState<TransactionRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Filter transactions
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (selectedType === 'incoming' && t.direction !== 'incoming') return false;
      if (selectedType === 'outgoing' && t.direction !== 'outgoing') return false;
      if (selectedType === 'internal' && t.direction !== 'internal') return false;

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchRef = t.referenceId?.toLowerCase().includes(q);
        const matchFrom = t.fromUserName?.toLowerCase().includes(q);
        const matchTo = t.toUserName?.toLowerCase().includes(q);
        const matchAmount = t.amount?.toString().includes(q);
        if (!matchDesc && !matchRef && !matchFrom && !matchTo && !matchAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedType, selectedCategory, searchQuery]);

  // Unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [transactions]);

  // Export CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Reference ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Fee', 'Counterparty', 'Status'];
    const rows = filtered.map((t) => [
      t.referenceId,
      new Date(t.createdAt).toISOString(),
      t.direction || t.type,
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.fee,
      `"${(t.direction === 'incoming' ? t.fromUserName : t.toUserName) || 'System'}"`,
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `apexvault-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      
      {/* Table Header and Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Transaction Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Immutable audit history &bull; PostgreSQL Double-Entry Records
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Refresh ledger"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
          
          {/* Search Input */}
          <div className="relative sm:col-span-6">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, counterparty, description..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Flow Types</option>
              <option value="outgoing">Outgoing (Debit -)</option>
              <option value="incoming">Incoming (Credit +)</option>
              <option value="internal">Internal Transfers</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Querying PostgreSQL ledger...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-1">
            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No transactions match your criteria.</p>
            <p className="text-[11px]">Make a fund transfer or change your filters to see entries.</p>
          </div>
        ) : (
          filtered.map((txn) => {
            const isIncoming = txn.direction === 'incoming';
            const isInternal = txn.direction === 'internal';

            const sign = isIncoming ? '+' : isInternal ? '⇄' : '-';
            const amountColor = isIncoming
              ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
              : isInternal
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-900 dark:text-white font-bold';

            return (
              <div
                key={txn.id}
                onClick={() => setInspectTxn(txn)}
                className="p-4 sm:px-6 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                {/* Left: Icon and Details */}
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncoming
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : isInternal
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                        : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                    }`}
                  >
                    {isIncoming ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : isInternal ? (
                      <Layers className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {txn.description}
                      </span>
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {txn.category}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>
                        {isIncoming
                          ? `From ${txn.fromUserName || 'System'}`
                          : isInternal
                          ? 'Between User Accounts'
                          : `To ${txn.toUserName || 'Payee'}`}
                      </span>
                      <span>&bull;</span>
                      <span className="font-mono text-[10px]">
                        {new Date(txn.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(txn.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Status Badge */}
                <div className="text-right shrink-0">
                  <div className={`text-sm sm:text-base ${amountColor} font-mono tracking-tight`}>
                    {sign}
                    {formatCurrency(txn.amount)}
                  </div>
                  <div className="flex items-center justify-end space-x-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {txn.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transaction Details Modal */}
      {inspectTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Transaction Receipt Details
                </h3>
              </div>
              <button
                onClick={() => setInspectTxn(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="text-center py-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <span className="text-[11px] text-slate-500 uppercase font-bold">Amount Transferred</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(inspectTxn.amount)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Network Processing Fee: {formatCurrency(inspectTxn.fee || '0.00')}
                </div>
              </div>

              <div className="space-y-2 py-1">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Reference ID:</span>
                  <div className="flex items-center space-x-1 font-mono font-bold text-slate-900 dark:text-white">
                    <span>{inspectTxn.referenceId}</span>
                    <button
                      onClick={() => handleCopyRef(inspectTxn.referenceId)}
                      className="p-0.5 text-slate-400 hover:text-slate-200"
                    >
                      {copiedId ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {new Date(inspectTxn.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{inspectTxn.category}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Sender:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {inspectTxn.fromUserName || 'System Deposit'} ({inspectTxn.fromAccountNumber || 'N/A'})
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {inspectTxn.toUserName || 'Payee'} ({inspectTxn.toAccountNumber || 'N/A'})
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Settlement Protocol:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    PostgreSQL ACID (Committed)
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Purpose / Note:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{inspectTxn.description}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2">
              <button
                onClick={() => setInspectTxn(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
