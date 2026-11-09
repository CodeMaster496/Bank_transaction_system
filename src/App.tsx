import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  PlusCircle,
  Shield,
  FileCode2,
  Users,
  Building2,
  TrendingUp,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AccountCards } from './components/AccountCards.tsx';
import { TransferModal } from './components/TransferModal.tsx';
import { DepositModal } from './components/DepositModal.tsx';
import { TransactionHistory } from './components/TransactionHistory.tsx';
import { AuditLogModal } from './components/AuditLogModal.tsx';
import { BankAccount, TransactionRecord } from './types/banking.ts';

function BankingDashboard() {
  const { currentUser, getAuthHeaders } = useAuth();
  const { onBalanceUpdateCallbacks } = useWebSocket();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Modals
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferInitialAccountId, setTransferInitialAccountId] = useState<number | undefined>(undefined);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositTargetAccount, setDepositTargetAccount] = useState<BankAccount | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [showFastApiModal, setShowFastApiModal] = useState(false);

  // Fetch Accounts
  const fetchAccounts = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingAccounts(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/accounts', { headers });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        if (data.accounts?.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [currentUser, getAuthHeaders, selectedAccountId]);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoadingTransactions(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/transactions?limit=50', { headers });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [currentUser, getAuthHeaders]);

  // Initial load
  useEffect(() => {
    fetchAccounts();
    fetchTransactions();
  }, [currentUser, fetchAccounts, fetchTransactions]);

  // Register live WebSocket balance update callback
  useEffect(() => {
    const handleWsUpdate = () => {
      fetchAccounts();
      fetchTransactions();
    };

    onBalanceUpdateCallbacks.current.push(handleWsUpdate);
    return () => {
      onBalanceUpdateCallbacks.current = onBalanceUpdateCallbacks.current.filter((cb) => cb !== handleWsUpdate);
    };
  }, [fetchAccounts, fetchTransactions, onBalanceUpdateCallbacks]);

  const handleToggleFreeze = async (accountId: number) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/accounts/${accountId}/toggle-freeze`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error('Toggle freeze error:', err);
    }
  };

  const handleOpenTransfer = (acc?: BankAccount) => {
    setTransferInitialAccountId(acc?.id || accounts[0]?.id);
    setIsTransferOpen(true);
  };

  const handleOpenDeposit = (acc?: BankAccount) => {
    setDepositTargetAccount(acc || accounts[0] || null);
    setIsDepositOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenAuditLogs={() => setIsAuditOpen(true)}
        onOpenNewTransfer={() => handleOpenTransfer()}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Welcome Header & Quick Action Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white border border-emerald-900/40 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Verified Banking Client
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                Routing: {currentUser?.routingNumber || '021000021'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 font-['Plus_Jakarta_Sans']">
              Welcome, {currentUser?.fullName || 'Client'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              PostgreSQL Cloud SQL ledger active. Real-time balance synchronization and ACID fund transfers enabled.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleOpenTransfer()}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Transfer Funds</span>
            </button>

            <button
              onClick={() => handleOpenDeposit()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/10 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Instant Deposit</span>
            </button>

            <button
              onClick={() => setShowFastApiModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              title="View FastAPI & PostgreSQL backend source reference"
            >
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>FastAPI Spec</span>
            </button>
          </div>

          {/* Decorative ambient gradient */}
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        </div>

        {/* Account Cards Section */}
        <section aria-label="Account Portfolios">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Your Accounts</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Click any card to select)
              </span>
            </h2>
            <button
              onClick={fetchAccounts}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAccounts ? 'animate-spin' : ''}`} />
              <span>Refresh Balances</span>
            </button>
          </div>

          <AccountCards
            accounts={accounts}
            onDepositClick={(acc) => handleOpenDeposit(acc)}
            onTransferClick={(acc) => handleOpenTransfer(acc)}
            onToggleFreeze={handleToggleFreeze}
            selectedAccountId={selectedAccountId}
            onSelectAccount={(id) => setSelectedAccountId(id)}
          />
        </section>

        {/* Transaction History Ledger */}
        <section aria-label="Transaction Ledger">
          <TransactionHistory
            transactions={transactions}
            isLoading={loadingTransactions}
            onRefresh={fetchTransactions}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>ApexVault Financial Technologies &bull; Cloud SQL PostgreSQL 16</span>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <button onClick={() => setIsAuditOpen(true)} className="hover:underline">
              Security Audit Trail
            </button>
            <span>&bull;</span>
            <button onClick={() => setShowFastApiModal(true)} className="hover:underline">
              FastAPI Spec
            </button>
            <span>&bull;</span>
            <span>Live WebSockets</span>
          </div>
        </div>
      </footer>

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={accounts}
        initialFromAccountId={transferInitialAccountId}
        onTransferSuccess={() => {
          fetchAccounts();
          fetchTransactions();
        }}
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => {
          setIsDepositOpen(false);
          setDepositTargetAccount(null);
        }}
        account={depositTargetAccount}
        onDepositSuccess={() => {
          fetchAccounts();
          fetchTransactions();
        }}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* FastAPI Reference Viewer Modal */}
      {showFastApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 text-slate-100 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <FileCode2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold">FastAPI & PostgreSQL Backend Reference</h3>
              </div>
              <button
                onClick={() => setShowFastApiModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-300">
              The full Python FastAPI backend implementation is stored in{' '}
              <code className="text-cyan-400 font-mono">api_fastapi_reference.py</code> with
              SQLAlchemy AsyncEngine, Pydantic v2 schemas, and WebSockets.
            </div>

            <div className="mt-3 flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 border border-slate-800">
              <pre>{`from fastapi import FastAPI, Depends, HTTPException, WebSocket
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from pydantic import BaseModel, Field

# Full ACID Transaction Execution
@app.post("/api/transfer")
async def execute_transfer(payload: TransferRequest, db: AsyncSession = Depends(get_db)):
    async with db.begin():
        # 1. Lock and validate source account
        from_acc = await db.execute(select(Account).where(Account.id == payload.from_account_id).with_for_update())
        # 2. Lock destination account
        to_acc = await db.execute(select(Account).where(Account.account_number == payload.to_account_number).with_for_update())
        # 3. Enforce balance & daily limits
        from_acc.balance -= total_deduction
        to_acc.balance += payload.amount
        # 4. Insert transaction ledger & audit log
        db.add(Transaction(reference_id=ref_id, ...))
    
    # 5. Broadcast to connected WebSockets
    await manager.broadcast({"type": "BALANCE_UPDATED", ...})`}</pre>
            </div>

            <div className="mt-3 text-right">
              <button
                onClick={() => setShowFastApiModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <BankingDashboard />
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
