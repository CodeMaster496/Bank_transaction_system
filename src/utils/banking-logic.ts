import { z } from 'zod';

// Currency and financial formatting utilities
export function formatCurrency(
  amount: number | string,
  currency = 'USD'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '••••';
  const clean = accountNumber.replace(/\s+/g, '');
  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

export function generateReferenceId(prefix = 'TXN'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

// Zod Transfer Schema for robust input validation
export const TransferInputSchema = z.object({
  fromAccountId: z.number().int().positive('Source account is required'),
  toAccountNumber: z
    .string()
    .trim()
    .min(5, 'Destination account must be at least 5 characters')
    .max(34, 'Destination account number is too long'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(50000, 'Single transfer limit is $50,000.00')
    .refine((val) => {
      // Must not have more than 2 decimal places
      return Math.round(val * 100) === val * 100;
    }, 'Amount cannot have more than 2 decimal places'),
  category: z
    .enum(['Transfer', 'Payment', 'Bill Pay', 'Investment', 'Wire', 'Other'])
    .default('Transfer'),
  description: z
    .string()
    .trim()
    .min(2, 'Description must be at least 2 characters')
    .max(120, 'Description cannot exceed 120 characters'),
  isInstant: z.boolean().default(false),
});

export type TransferInput = z.infer<typeof TransferInputSchema>;

export interface TransferValidationContext {
  fromAccountBalance: number;
  fromAccountStatus: 'active' | 'frozen' | 'closed';
  toAccountExists: boolean;
  toAccountStatus?: 'active' | 'frozen' | 'closed';
  toAccountId?: number;
  fromAccountId: number;
  dailyLimit: number;
  transferredToday: number;
  amount: number;
  isInstant?: boolean;
}

export interface TransferValidationResult {
  valid: boolean;
  error?: string;
  fee: number;
  totalDeduction: number;
  remainingDailyLimit: number;
}

export function validateTransferRules(
  context: TransferValidationContext
): TransferValidationResult {
  const {
    fromAccountBalance,
    fromAccountStatus,
    toAccountExists,
    toAccountStatus,
    toAccountId,
    fromAccountId,
    dailyLimit,
    transferredToday,
    amount,
    isInstant = false,
  } = context;

  // 1. Account status validation
  if (fromAccountStatus !== 'active') {
    return {
      valid: false,
      error: `Source account is ${fromAccountStatus}. Transfers are prohibited.`,
      fee: 0,
      totalDeduction: 0,
      remainingDailyLimit: Math.max(0, dailyLimit - transferredToday),
    };
  }

  // 2. Destination existence and status
  if (!toAccountExists) {
    return {
      valid: false,
      error: 'Destination account number not found.',
      fee: 0,
      totalDeduction: 0,
      remainingDailyLimit: Math.max(0, dailyLimit - transferredToday),
    };
  }

  if (toAccountStatus && toAccountStatus !== 'active') {
    return {
      valid: false,
      error: `Destination account is ${toAccountStatus}. Unable to accept funds.`,
      fee: 0,
      totalDeduction: 0,
      remainingDailyLimit: Math.max(0, dailyLimit - transferredToday),
    };
  }

  // 3. Self-transfer to same account check
  if (toAccountId && toAccountId === fromAccountId) {
    return {
      valid: false,
      error: 'Cannot transfer funds to the identical account.',
      fee: 0,
      totalDeduction: 0,
      remainingDailyLimit: Math.max(0, dailyLimit - transferredToday),
    };
  }

  // 4. Amount validation
  if (amount <= 0) {
    return {
      valid: false,
      error: 'Transfer amount must be greater than $0.00.',
      fee: 0,
      totalDeduction: 0,
      remainingDailyLimit: Math.max(0, dailyLimit - transferredToday),
    };
  }

  // Fee calculation (instant wire has $1.50 fee, standard transfer is $0.00)
  const fee = isInstant ? 1.5 : 0.0;
  const totalDeduction = Number((amount + fee).toFixed(2));

  // 5. Sufficient funds check
  if (totalDeduction > fromAccountBalance) {
    return {
      valid: false,
      error: `Insufficient funds. Available: ${formatCurrency(fromAccountBalance)}, required: ${formatCurrency(totalDeduction)} (incl. fee ${formatCurrency(fee)}).`,
      fee,
      totalDeduction,
      remainingDailyLimit: Math.max(0, dailyLimit - transferredToday),
    };
  }

  // 6. Daily limit check
  const availableDaily = Math.max(0, Number((dailyLimit - transferredToday).toFixed(2)));
  if (amount > availableDaily) {
    return {
      valid: false,
      error: `Transfer exceeds remaining daily limit of ${formatCurrency(availableDaily)}.`,
      fee,
      totalDeduction,
      remainingDailyLimit: availableDaily,
    };
  }

  return {
    valid: true,
    fee,
    totalDeduction,
    remainingDailyLimit: Number((availableDaily - amount).toFixed(2)),
  };
}

export function calculateSummaryMetrics(
  accountsList: Array<{ balance: string | number; accountType: string }>,
  transactionsList: Array<{
    amount: string | number;
    type: string;
    fromAccountId: number | null;
    toAccountId: number | null;
    userAccountIds: number[];
  }>
) {
  let totalBalance = 0;
  let checkingBalance = 0;
  let savingsBalance = 0;
  let investmentBalance = 0;

  for (const acc of accountsList) {
    const bal = typeof acc.balance === 'string' ? parseFloat(acc.balance) : acc.balance;
    const num = isNaN(bal) ? 0 : bal;
    totalBalance += num;
    if (acc.accountType === 'checking') checkingBalance += num;
    else if (acc.accountType === 'savings') savingsBalance += num;
    else if (acc.accountType === 'investment') investmentBalance += num;
  }

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const txn of transactionsList) {
    const amt = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
    const num = isNaN(amt) ? 0 : amt;
    const isOut = txn.fromAccountId && txn.userAccountIds.includes(txn.fromAccountId);
    const isIn = txn.toAccountId && txn.userAccountIds.includes(txn.toAccountId);

    if (isOut && !isIn) {
      totalOutflow += num;
    } else if (isIn && !isOut) {
      totalInflow += num;
    }
  }

  return {
    totalBalance: Number(totalBalance.toFixed(2)),
    checkingBalance: Number(checkingBalance.toFixed(2)),
    savingsBalance: Number(savingsBalance.toFixed(2)),
    investmentBalance: Number(investmentBalance.toFixed(2)),
    totalInflow: Number(totalInflow.toFixed(2)),
    totalOutflow: Number(totalOutflow.toFixed(2)),
  };
}
