export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  accountNumber: string;
  routingNumber?: string;
  avatarUrl?: string;
  role: string;
}

export interface BankAccount {
  id: number;
  userId: number;
  accountType: 'checking' | 'savings' | 'investment';
  accountNumber: string;
  balance: string; // e.g. "8450.00"
  currency: string;
  status: 'active' | 'frozen' | 'closed';
  dailyLimit: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRecord {
  id: number;
  referenceId: string;
  fromAccountId: number | null;
  toAccountId: number | null;
  amount: string;
  fee: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'bill_pay';
  category: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  balanceAfterFrom: string | null;
  balanceAfterTo: string | null;
  createdAt: string;
  direction?: 'incoming' | 'outgoing' | 'internal';
  fromAccountNumber?: string;
  toAccountNumber?: string;
  fromUserName?: string;
  toUserName?: string;
}

export interface Recipient {
  id: number;
  userId: number;
  name: string;
  email: string;
  accountNumber: string;
  bankName: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: number;
  userId: number;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
  createdAt: string;
}

export interface LiveNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  amount?: string;
  timestamp: string;
  read: boolean;
}
