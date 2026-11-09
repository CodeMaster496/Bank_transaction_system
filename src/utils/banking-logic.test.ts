import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  maskAccountNumber,
  generateReferenceId,
  validateTransferRules,
  calculateSummaryMetrics,
  TransferInputSchema,
} from './banking-logic.ts';

test('formatCurrency formats USD correctly', () => {
  assert.equal(formatCurrency(1250.5), '$1,250.50');
  assert.equal(formatCurrency('3000'), '$3,000.00');
  assert.equal(formatCurrency(0), '$0.00');
});

test('maskAccountNumber obscures all but last 4 digits', () => {
  assert.equal(maskAccountNumber('1234567890'), '•••• •••• 7890');
  assert.equal(maskAccountNumber('APX-9944'), '•••• •••• 9944');
});

test('generateReferenceId outputs structured prefix and timestamp', () => {
  const ref = generateReferenceId('TXN');
  assert.match(ref, /^TXN-\d{8}-[A-Z0-9]{6}$/);
});

test('validateTransferRules rejects insufficient balance', () => {
  const res = validateTransferRules({
    fromAccountBalance: 50.0,
    fromAccountStatus: 'active',
    toAccountExists: true,
    toAccountId: 2,
    fromAccountId: 1,
    dailyLimit: 5000,
    transferredToday: 0,
    amount: 100.0,
  });
  assert.equal(res.valid, false);
  assert.match(res.error || '', /Insufficient funds/);
});

test('validateTransferRules rejects frozen source accounts', () => {
  const res = validateTransferRules({
    fromAccountBalance: 5000.0,
    fromAccountStatus: 'frozen',
    toAccountExists: true,
    toAccountId: 2,
    fromAccountId: 1,
    dailyLimit: 5000,
    transferredToday: 0,
    amount: 50.0,
  });
  assert.equal(res.valid, false);
  assert.match(res.error || '', /Source account is frozen/);
});

test('validateTransferRules rejects transfer to identical account', () => {
  const res = validateTransferRules({
    fromAccountBalance: 5000.0,
    fromAccountStatus: 'active',
    toAccountExists: true,
    toAccountId: 1,
    fromAccountId: 1,
    dailyLimit: 5000,
    transferredToday: 0,
    amount: 50.0,
  });
  assert.equal(res.valid, false);
  assert.match(res.error || '', /identical account/);
});

test('validateTransferRules rejects exceeding daily limits', () => {
  const res = validateTransferRules({
    fromAccountBalance: 10000.0,
    fromAccountStatus: 'active',
    toAccountExists: true,
    toAccountId: 2,
    fromAccountId: 1,
    dailyLimit: 1000,
    transferredToday: 800,
    amount: 300,
  });
  assert.equal(res.valid, false);
  assert.match(res.error || '', /daily limit/);
});

test('validateTransferRules approves valid transfer and applies instant wire fee', () => {
  const res = validateTransferRules({
    fromAccountBalance: 1000.0,
    fromAccountStatus: 'active',
    toAccountExists: true,
    toAccountId: 2,
    fromAccountId: 1,
    dailyLimit: 5000,
    transferredToday: 0,
    amount: 250.0,
    isInstant: true,
  });
  assert.equal(res.valid, true);
  assert.equal(res.fee, 1.5);
  assert.equal(res.totalDeduction, 251.5);
  assert.equal(res.remainingDailyLimit, 4750.0);
});

test('TransferInputSchema validates input fields strictly', () => {
  const validData = {
    fromAccountId: 1,
    toAccountNumber: 'APX-4819-2091',
    amount: 145.25,
    category: 'Transfer',
    description: 'Rent split',
    isInstant: false,
  };
  const parsed = TransferInputSchema.safeParse(validData);
  assert.equal(parsed.success, true);

  const invalidDecimal = {
    ...validData,
    amount: 100.999, // 3 decimal places prohibited
  };
  const invalidParsed = TransferInputSchema.safeParse(invalidDecimal);
  assert.equal(invalidParsed.success, false);
});

test('calculateSummaryMetrics aggregates balances and flows', () => {
  const accounts = [
    { balance: '1200.50', accountType: 'checking' },
    { balance: '5000.00', accountType: 'savings' },
    { balance: '3000.00', accountType: 'investment' },
  ];
  const txns = [
    { amount: '200.00', type: 'transfer', fromAccountId: 1, toAccountId: 99, userAccountIds: [1, 2, 3] },
    { amount: '500.00', type: 'deposit', fromAccountId: null, toAccountId: 1, userAccountIds: [1, 2, 3] },
  ];
  const metrics = calculateSummaryMetrics(accounts, txns);
  assert.equal(metrics.totalBalance, 9200.50);
  assert.equal(metrics.checkingBalance, 1200.50);
  assert.equal(metrics.savingsBalance, 5000.00);
  assert.equal(metrics.investmentBalance, 3000.00);
  assert.equal(metrics.totalOutflow, 200.00);
  assert.equal(metrics.totalInflow, 500.00);
});
