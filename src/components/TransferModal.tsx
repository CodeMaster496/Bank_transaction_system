import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Zap,
  Building,
  UserCheck,
  CheckCircle2,
  Copy,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { BankAccount, Recipient } from '../types/banking.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  formatCurrency,
  validateTransferRules,
  TransferInputSchema,
} from '../utils/banking-logic.ts';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  initialFromAccountId?: number;
  onTransferSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  accounts,
  initialFromAccountId,
  onTransferSuccess,
}) => {
  const { currentUser, getAuthHeaders } = useAuth();

  const [fromAccountId, setFromAccountId] = useState<number>(() => {
    return initialFromAccountId || accounts[0]?.id || 1;
  });

  const [destinationMode, setDestinationMode] = useState<'payee' | 'internal' | 'manual'>('payee');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [selectedPayeeName, setSelectedPayeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('Transfer');
  const [description, setDescription] = useState('');
  const [isInstant, setIsInstant] = useState(false);

  const [directory, setDirectory] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTxn, setCompletedTxn] = useState<any | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Sync initial account when opened
  useEffect(() => {
    if (initialFromAccountId) {
      setFromAccountId(initialFromAccountId);
    } else if (accounts.length > 0 && !fromAccountId) {
      setFromAccountId(accounts[0].id);
    }
  }, [initialFromAccountId, accounts, fromAccountId]);

  // Load directory and saved recipients
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setErrorMessage(null);
      setCompletedTxn(null);

      const fetchDirectory = async () => {
        try {
          setLoadingDirectory(true);
          const headers = getAuthHeaders();
          const [dirRes, recRes] = await Promise.all([
            fetch('/api/users/directory', { headers }),
            fetch('/api/recipients', { headers }),
          ]);

          if (dirRes.ok) {
            const d = await dirRes.json();
            // Filter out current user from external payee suggestions
            setDirectory((d.directory || []).filter((u: any) => u.id !== currentUser?.id));
          }
          if (recRes.ok) {
            const r = await recRes.json();
            setRecipients(r.recipients || []);
          }
        } catch (e) {
          console.error('Failed to load transfer directory:', e);
        } finally {
          setLoadingDirectory(false);
        }
      };

      fetchDirectory();
    }
  }, [isOpen, currentUser, getAuthHeaders]);

  if (!isOpen) return null;

  const currentSourceAccount = accounts.find((a) => a.id === fromAccountId) || accounts[0];
  const sourceBalance = currentSourceAccount ? parseFloat(currentSourceAccount.balance) : 0;
  const numAmount = parseFloat(amount) || 0;
  const fee = isInstant ? 1.5 : 0.0;
  const totalDeduction = numAmount + fee;
  const remainingBalance = Math.max(0, sourceBalance - totalDeduction);

  const handleSelectPayee = (payee: { name: string; accountNumber: string }) => {
    setToAccountNumber(payee.accountNumber);
    setSelectedPayeeName(payee.name);
  };

  const handleSelectInternal = (targetAcc: BankAccount) => {
    setToAccountNumber(targetAcc.accountNumber);
    setSelectedPayeeName(`${targetAcc.accountType.toUpperCase()} (${targetAcc.accountNumber.slice(-4)})`);
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleValidateAndReview = () => {
    setErrorMessage(null);

    // Zod schema check
    const validationResult = TransferInputSchema.safeParse({
      fromAccountId,
      toAccountNumber: toAccountNumber.trim(),
      amount: numAmount,
      category: category as any,
      description: description.trim() || 'Direct Account Transfer',
      isInstant,
    });

    if (!validationResult.success) {
      const issues = (validationResult.error as any).issues || (validationResult.error as any).errors || [];
      const err = issues[0]?.message || 'Invalid transfer input.';
      setErrorMessage(err);
      return;
    }

    // Business rules validation
    const rules = validateTransferRules({
      fromAccountBalance: sourceBalance,
      fromAccountStatus: currentSourceAccount?.status || 'active',
      toAccountExists: true,
      fromAccountId,
      dailyLimit: parseFloat(currentSourceAccount?.dailyLimit || '10000'),
      transferredToday: 0,
      amount: numAmount,
      isInstant,
    });

    if (!rules.valid) {
      setErrorMessage(rules.error || 'Transfer validation failed.');
      return;
    }

    setStep('confirm');
  };

  const handleExecuteTransfer = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const headers = getAuthHeaders();
      const payload = {
        fromAccountId,
        toAccountNumber: toAccountNumber.trim(),
        amount: numAmount,
        category,
        description: description.trim() || 'Fund Transfer',
        isInstant,
      };

      const res = await fetch('/api/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transfer failed. Transaction rolled back.');
      }

      setCompletedTxn(data.transaction);
      setStep('success');
      onTransferSuccess();

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Confetti non-fatal
      }
    } catch (err: any) {
      console.error('Execute transfer failed:', err);
      setErrorMessage(err.message || 'Transfer failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRef = () => {
    if (completedTxn?.referenceId) {
      navigator.clipboard.writeText(completedTxn.referenceId);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 transition-all my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {step === 'success' ? 'Transfer Complete' : 'Secure Fund Transfer'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PostgreSQL ACID Protected &bull; Instant Settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close transfer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start space-x-2.5 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: TRANSFER INPUT FORM */}
        {step === 'input' && (
          <div className="mt-4 space-y-4">
            
            {/* 1. Source Account */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                From Account
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.status === 'frozen'}>
                    {a.accountType.toUpperCase()} - {a.accountNumber} ({formatCurrency(a.balance)}){' '}
                    {a.status === 'frozen' ? '[FROZEN]' : ''}
                  </option>
                ))}
              </select>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Available: {formatCurrency(sourceBalance)}</span>
                <span>Daily Limit: {formatCurrency(currentSourceAccount?.dailyLimit || 10000)}</span>
              </div>
            </div>

            {/* 2. Destination Selection Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Destination Recipient
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
                <button
                  type="button"
                  onClick={() => setDestinationMode('payee')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    destinationMode === 'payee'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Beneficiaries
                </button>
                <button
                  type="button"
                  onClick={() => setDestinationMode('internal')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    destinationMode === 'internal'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  My Accounts
                </button>
                <button
                  type="button"
                  onClick={() => setDestinationMode('manual')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    destinationMode === 'manual'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Account #
                </button>
              </div>

              {/* Payee Selection Carousel */}
              {destinationMode === 'payee' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                    {/* Combine Directory & Saved Recipients */}
                    {directory.map((u) => {
                      const isSelected = toAccountNumber === u.accountNumber;
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleSelectPayee({ name: u.fullName, accountNumber: u.accountNumber })}
                          className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {u.fullName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{u.accountNumber}</div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedPayeeName && (
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                      <span>Selected: <strong>{selectedPayeeName}</strong></span>
                      <span className="font-mono text-[11px]">{toAccountNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Internal Accounts (move between Checking <-> Savings) */}
              {destinationMode === 'internal' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {accounts
                      .filter((a) => a.id !== fromAccountId)
                      .map((target) => {
                        const isSelected = toAccountNumber === target.accountNumber;
                        return (
                          <div
                            key={target.id}
                            onClick={() => handleSelectInternal(target)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                                {target.accountType}
                              </span>
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                            <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1">
                              {formatCurrency(target.balance)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {target.accountNumber}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Manual Account Number */}
              {destinationMode === 'manual' && (
                <div>
                  <input
                    type="text"
                    value={toAccountNumber}
                    onChange={(e) => {
                      setToAccountNumber(e.target.value);
                      setSelectedPayeeName('Direct Account');
                    }}
                    placeholder="e.g. CHK-49123810-01 or APX-..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter any valid ApexVault account number.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Amount Input with Quick Pills */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Transfer Amount ($)
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Remaining after transfer: {formatCurrency(remainingBalance)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-lg font-bold text-slate-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-extrabold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-['Plus_Jakarta_Sans']"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[50, 100, 250, 500, 1000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    +${val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickAmount(Math.floor(sourceBalance))}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  Max Balance
                </button>
              </div>
            </div>

            {/* 4. Speed & Fee Option */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Zap className={`w-4 h-4 ${isInstant ? 'text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {isInstant ? 'Instant Real-Time Settlement' : 'Standard ACH Transfer'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isInstant ? 'Direct wire (+$1.50 network fee)' : 'No fee ($0.00)'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstant(!isInstant)}
                className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                  isInstant
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                {isInstant ? 'Instant Enabled' : 'Enable Instant'}
              </button>
            </div>

            {/* 5. Category & Purpose Memo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Transfer">General Transfer</option>
                  <option value="Payment">Invoice / Payment</option>
                  <option value="Bill Pay">Utilities & Bills</option>
                  <option value="Investment">Investment / Stash</option>
                  <option value="Wire">International Wire</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Memo / Note
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Rent share or Dinner"
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Proceed to Review Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleValidateAndReview}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Review Transfer</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* STEP 2: CONFIRMATION REVIEW */}
        {step === 'confirm' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs uppercase font-bold text-slate-400">Total Deduction</span>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(totalDeduction)}
                </div>
                <div className="text-xs text-slate-500">
                  Transfer amount {formatCurrency(numAmount)} + Fee {formatCurrency(fee)}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500">From Account:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {currentSourceAccount?.accountType.toUpperCase()} ({currentSourceAccount?.accountNumber})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500">To Beneficiary:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedPayeeName || 'Apex Recipient'} ({toAccountNumber})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500">Execution Speed:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {isInstant ? 'Instant Real-Time Wire' : 'Standard Transfer'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{category}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Description:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {description || 'Direct Transfer'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Authorizing Ledger...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Authorize & Send Funds</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS STATE */}
        {step === 'success' && (
          <div className="mt-4 text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Transfer Authorized & Cleared!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Amount of {formatCurrency(numAmount)} has been credited to {selectedPayeeName || toAccountNumber}.
              </p>
            </div>

            {/* Reference ID receipt box */}
            {completedTxn && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reference ID:</span>
                  <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-900 dark:text-white">
                    <span>{completedTxn.referenceId}</span>
                    <button
                      onClick={handleCopyRef}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                      title="Copy Reference ID"
                    >
                      {copiedRef ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    SETTLED (ACID COMPLETE)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">New Source Balance:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(completedTxn.balanceAfterFrom)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setAmount('');
                  setDescription('');
                }}
                className="w-1/2 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Make Another</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
