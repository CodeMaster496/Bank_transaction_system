import { eq, or, desc, sql, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  accounts,
  transactions,
  auditLogs,
  recipients,
} from './schema.ts';
import {
  generateReferenceId,
  validateTransferRules,
  TransferInput,
} from '../utils/banking-logic.ts';

export interface TransferResult {
  success: boolean;
  transaction?: any;
  fromAccount?: any;
  toAccount?: any;
  recipientUser?: any;
  error?: string;
}

// Ensure demo users exist so the app is immediately interactive
export async function seedInitialDataIfEmpty() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      return;
    }

    console.log('Seeding initial banking demo accounts in PostgreSQL...');

    // 1. Elena Rostova (Main Customer)
    const [elena] = await db
      .insert(users)
      .values({
        uid: 'demo-user-elena',
        email: 'elena.rostova@apexvault.io',
        fullName: 'Elena Rostova',
        accountNumber: 'APX-7829-1044',
        routingNumber: '021000021',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'customer',
      })
      .returning();

    // 2. Marcus Vance
    const [marcus] = await db
      .insert(users)
      .values({
        uid: 'demo-user-marcus',
        email: 'marcus.vance@apexvault.io',
        fullName: 'Marcus Vance',
        accountNumber: 'APX-4912-3810',
        routingNumber: '021000021',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'customer',
      })
      .returning();

    // 3. Sophia Lin
    const [sophia] = await db
      .insert(users)
      .values({
        uid: 'demo-user-sophia',
        email: 'sophia.lin@apexvault.io',
        fullName: 'Sophia Lin',
        accountNumber: 'APX-6103-9255',
        routingNumber: '021000021',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        role: 'customer',
      })
      .returning();

    // Create Elena's Accounts
    const [elenaChecking] = await db
      .insert(accounts)
      .values({
        userId: elena.id,
        accountType: 'checking',
        accountNumber: 'CHK-78291044-01',
        balance: '8450.00',
        currency: 'USD',
        status: 'active',
        dailyLimit: '15000.00',
      })
      .returning();

    const [elenaSavings] = await db
      .insert(accounts)
      .values({
        userId: elena.id,
        accountType: 'savings',
        accountNumber: 'SAV-78291044-02',
        balance: '24300.00',
        currency: 'USD',
        status: 'active',
        dailyLimit: '25000.00',
      })
      .returning();

    const [elenaInvestment] = await db
      .insert(accounts)
      .values({
        userId: elena.id,
        accountType: 'investment',
        accountNumber: 'INV-78291044-03',
        balance: '45000.00',
        currency: 'USD',
        status: 'active',
        dailyLimit: '50000.00',
      })
      .returning();

    // Create Marcus's Accounts
    const [marcusChecking] = await db
      .insert(accounts)
      .values({
        userId: marcus.id,
        accountType: 'checking',
        accountNumber: 'CHK-49123810-01',
        balance: '4250.00',
        currency: 'USD',
        status: 'active',
        dailyLimit: '10000.00',
      })
      .returning();

    // Create Sophia's Accounts
    const [sophiaChecking] = await db
      .insert(accounts)
      .values({
        userId: sophia.id,
        accountType: 'checking',
        accountNumber: 'CHK-61039255-01',
        balance: '12800.00',
        currency: 'USD',
        status: 'active',
        dailyLimit: '20000.00',
      })
      .returning();

    // Seed Initial Ledger Transactions
    await db.insert(transactions).values([
      {
        referenceId: generateReferenceId('DEP'),
        fromAccountId: null,
        toAccountId: elenaChecking.id,
        amount: '5000.00',
        fee: '0.00',
        type: 'deposit',
        category: 'Salary',
        description: 'Bi-weekly Direct Deposit - Apex Global Corp',
        status: 'completed',
        balanceAfterFrom: null,
        balanceAfterTo: '8450.00',
        createdAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        referenceId: generateReferenceId('TXN'),
        fromAccountId: elenaChecking.id,
        toAccountId: marcusChecking.id,
        amount: '350.00',
        fee: '0.00',
        type: 'transfer',
        category: 'Transfer',
        description: 'Design consultation invoice #841',
        status: 'completed',
        balanceAfterFrom: '8100.00',
        balanceAfterTo: '4250.00',
        createdAt: new Date(Date.now() - 86400000 * 1),
      },
      {
        referenceId: generateReferenceId('TXN'),
        fromAccountId: elenaChecking.id,
        toAccountId: elenaSavings.id,
        amount: '1500.00',
        fee: '0.00',
        type: 'transfer',
        category: 'Investment',
        description: 'Automated recurring savings stash',
        status: 'completed',
        balanceAfterFrom: '8450.00',
        balanceAfterTo: '24300.00',
        createdAt: new Date(Date.now() - 3600000 * 5),
      },
    ]);

    // Seed Saved Recipients for Elena
    await db.insert(recipients).values([
      {
        userId: elena.id,
        name: 'Marcus Vance',
        email: 'marcus.vance@apexvault.io',
        accountNumber: marcusChecking.accountNumber,
        bankName: 'ApexVault',
      },
      {
        userId: elena.id,
        name: 'Sophia Lin',
        email: 'sophia.lin@apexvault.io',
        accountNumber: sophiaChecking.accountNumber,
        bankName: 'ApexVault',
      },
    ]);

    // Seed Audit Log
    await db.insert(auditLogs).values([
      {
        userId: elena.id,
        action: 'SYSTEM_BOOTSTRAP',
        ipAddress: '127.0.0.1',
        userAgent: 'ApexVault Core Engine',
        status: 'SUCCESS',
        details: JSON.stringify({ message: 'Primary customer vault initialized with 3 accounts.' }),
      },
    ]);

    console.log('PostgreSQL demo seed completed successfully.');
  } catch (err) {
    console.error('Error seeding initial bank data:', err);
  }
}

// Get or register user
export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName?: string,
  avatarUrl?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      return existing[0];
    }

    const safeName = fullName || email.split('@')[0] || 'Apex Client';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const accountNumber = `APX-${randomSuffix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [newUser] = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: safeName,
        accountNumber,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(safeName)}`,
        role: 'customer',
      })
      .returning();

    // Create default Primary Checking account with welcome deposit
    const [chk] = await db
      .insert(accounts)
      .values({
        userId: newUser.id,
        accountType: 'checking',
        accountNumber: `CHK-${randomSuffix}-01`,
        balance: '5000.00',
        currency: 'USD',
        status: 'active',
        dailyLimit: '10000.00',
      })
      .returning();

    // Create default Savings account
    await db.insert(accounts).values({
      userId: newUser.id,
      accountType: 'savings',
      accountNumber: `SAV-${randomSuffix}-02`,
      balance: '15000.00',
      currency: 'USD',
      status: 'active',
      dailyLimit: '25000.00',
    });

    // Record welcome deposit transaction
    await db.insert(transactions).values({
      referenceId: generateReferenceId('DEP'),
      fromAccountId: null,
      toAccountId: chk.id,
      amount: '5000.00',
      fee: '0.00',
      type: 'deposit',
      category: 'Welcome Credit',
      description: 'Account Activation Balance Credit',
      status: 'completed',
      balanceAfterFrom: null,
      balanceAfterTo: '5000.00',
    });

    // Audit log
    await db.insert(auditLogs).values({
      userId: newUser.id,
      action: 'ACCOUNT_OPENED',
      ipAddress: '127.0.0.1',
      userAgent: 'ApexVault Security',
      status: 'SUCCESS',
      details: JSON.stringify({ message: 'New customer account created with Checking and Savings.' }),
    });

    return newUser;
  } catch (err) {
    console.error('getOrCreateUser error:', err);
    throw new Error('Failed to resolve user account.', { cause: err });
  }
}

export async function getUserById(id: number) {
  try {
    const res = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return res[0] || null;
  } catch (err) {
    console.error('getUserById failed:', err);
    throw new Error('Failed to fetch user.', { cause: err });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return res[0] || null;
  } catch (err) {
    console.error('getUserByUid failed:', err);
    throw new Error('Failed to fetch user by UID.', { cause: err });
  }
}

export async function getAllUsersDirectory() {
  try {
    return await db
      .select({
        id: users.id,
        uid: users.uid,
        email: users.email,
        fullName: users.fullName,
        accountNumber: users.accountNumber,
        avatarUrl: users.avatarUrl,
        role: users.role,
      })
      .from(users);
  } catch (err) {
    console.error('getAllUsersDirectory failed:', err);
    throw new Error('Failed to query users directory.', { cause: err });
  }
}

export async function getUserAccounts(userId: number) {
  try {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(accounts.id);
  } catch (err) {
    console.error('getUserAccounts failed:', err);
    throw new Error('Failed to fetch user accounts.', { cause: err });
  }
}

export async function getUserTransactions(userId: number, limit = 50) {
  try {
    // Get user's account IDs first
    const userAccs = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    const accIds = userAccs.map((a) => a.id);
    if (accIds.length === 0) return [];

    // Query transactions where either fromAccountId or toAccountId belongs to user
    const list = await db
      .select({
        id: transactions.id,
        referenceId: transactions.referenceId,
        fromAccountId: transactions.fromAccountId,
        toAccountId: transactions.toAccountId,
        amount: transactions.amount,
        fee: transactions.fee,
        type: transactions.type,
        category: transactions.category,
        description: transactions.description,
        status: transactions.status,
        balanceAfterFrom: transactions.balanceAfterFrom,
        balanceAfterTo: transactions.balanceAfterTo,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(
        or(
          sql`${transactions.fromAccountId} IN ${accIds}`,
          sql`${transactions.toAccountId} IN ${accIds}`
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(limit);

    // Enrich with counterparty account numbers and user names
    const allAccounts = await db.select().from(accounts);
    const allUsers = await db.select().from(users);

    const accountMap = new Map(allAccounts.map((a) => [a.id, a]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return list.map((t) => {
      const fromAcc = t.fromAccountId ? accountMap.get(t.fromAccountId) : null;
      const toAcc = t.toAccountId ? accountMap.get(t.toAccountId) : null;

      const fromUser = fromAcc ? userMap.get(fromAcc.userId) : null;
      const toUser = toAcc ? userMap.get(toAcc.userId) : null;

      const isDebit = t.fromAccountId ? accIds.includes(t.fromAccountId) : false;
      const isCredit = t.toAccountId ? accIds.includes(t.toAccountId) : false;

      let direction: 'outgoing' | 'incoming' | 'internal' = 'outgoing';
      if (isDebit && isCredit) {
        direction = 'internal';
      } else if (isCredit) {
        direction = 'incoming';
      }

      return {
        ...t,
        direction,
        fromAccountNumber: fromAcc?.accountNumber || 'External / System',
        toAccountNumber: toAcc?.accountNumber || 'External / System',
        fromUserName: fromUser?.fullName || 'System Deposit',
        toUserName: toUser?.fullName || 'External Payee',
      };
    });
  } catch (err) {
    console.error('getUserTransactions failed:', err);
    throw new Error('Failed to fetch transactions.', { cause: err });
  }
}

export async function getUserRecipients(userId: number) {
  try {
    return await db
      .select()
      .from(recipients)
      .where(eq(recipients.userId, userId))
      .orderBy(desc(recipients.createdAt));
  } catch (err) {
    console.error('getUserRecipients failed:', err);
    throw new Error('Failed to fetch recipients.', { cause: err });
  }
}

export async function addRecipient(
  userId: number,
  data: { name: string; email: string; accountNumber: string; bankName?: string }
) {
  try {
    const [rec] = await db
      .insert(recipients)
      .values({
        userId,
        name: data.name,
        email: data.email,
        accountNumber: data.accountNumber,
        bankName: data.bankName || 'ApexVault',
      })
      .returning();
    return rec;
  } catch (err) {
    console.error('addRecipient failed:', err);
    throw new Error('Failed to add recipient.', { cause: err });
  }
}

export async function getUserAuditLogs(userId: number, limit = 50) {
  try {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (err) {
    console.error('getUserAuditLogs failed:', err);
    throw new Error('Failed to fetch audit logs.', { cause: err });
  }
}

export async function toggleAccountFreeze(userId: number, accountId: number) {
  try {
    const [acc] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1);

    if (!acc) throw new Error('Account not found or access denied.');

    const newStatus = acc.status === 'active' ? 'frozen' : 'active';
    const [updated] = await db
      .update(accounts)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(accounts.id, accountId))
      .returning();

    await db.insert(auditLogs).values({
      userId,
      action: newStatus === 'frozen' ? 'ACCOUNT_FROZEN' : 'ACCOUNT_UNFROZEN',
      ipAddress: '127.0.0.1',
      userAgent: 'ApexVault Security',
      status: 'WARNING',
      details: JSON.stringify({ accountId, accountNumber: acc.accountNumber, newStatus }),
    });

    return updated;
  } catch (err) {
    console.error('toggleAccountFreeze error:', err);
    throw new Error('Failed to toggle account security status.', { cause: err });
  }
}

export async function depositFunds(
  userId: number,
  accountId: number,
  amount: number,
  description = 'Quick Deposit Credit'
) {
  try {
    return await db.transaction(async (tx) => {
      const [acc] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .limit(1);

      if (!acc) throw new Error('Account not found.');
      if (acc.status !== 'active') throw new Error(`Account is ${acc.status}.`);

      const currentBal = parseFloat(acc.balance);
      const newBalance = (currentBal + amount).toFixed(2);

      const [updatedAcc] = await tx
        .update(accounts)
        .set({ balance: newBalance, updatedAt: new Date() })
        .where(eq(accounts.id, accountId))
        .returning();

      const [txn] = await tx
        .insert(transactions)
        .values({
          referenceId: generateReferenceId('DEP'),
          fromAccountId: null,
          toAccountId: accountId,
          amount: amount.toFixed(2),
          fee: '0.00',
          type: 'deposit',
          category: 'Deposit',
          description,
          status: 'completed',
          balanceAfterFrom: null,
          balanceAfterTo: newBalance,
        })
        .returning();

      await tx.insert(auditLogs).values({
        userId,
        action: 'DEPOSIT_CREDITED',
        ipAddress: '127.0.0.1',
        userAgent: 'ApexVault Core',
        status: 'SUCCESS',
        details: JSON.stringify({ accountId, amount, newBalance }),
      });

      return { account: updatedAcc, transaction: txn };
    });
  } catch (err: any) {
    console.error('depositFunds failed:', err);
    throw new Error(err.message || 'Deposit failed.', { cause: err });
  }
}

// ACID Transfer Execution with Database Transaction
export async function executeTransfer(
  currentUserId: number,
  payload: TransferInput,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<TransferResult> {
  const ipAddress = meta?.ipAddress || '127.0.0.1';
  const userAgent = meta?.userAgent || 'ApexVault Web';

  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch Source Account
      const [fromAcc] = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, payload.fromAccountId), eq(accounts.userId, currentUserId)))
        .limit(1);

      if (!fromAcc) {
        return { success: false, error: 'Source account not found or access denied.' };
      }

      // 2. Fetch Destination Account by accountNumber (or user identifier fallback)
      const cleanToNumber = payload.toAccountNumber.trim();
      let [toAcc] = await tx
        .select()
        .from(accounts)
        .where(eq(accounts.accountNumber, cleanToNumber))
        .limit(1);

      if (!toAcc) {
        // Fallback: check if cleanToNumber matches a user client number or email
        const [targetUser] = await tx
          .select()
          .from(users)
          .where(or(eq(users.accountNumber, cleanToNumber), eq(users.email, cleanToNumber)))
          .limit(1);

        if (targetUser) {
          const userAccounts = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.userId, targetUser.id))
            .orderBy(accounts.id);
          toAcc = userAccounts.find((a) => a.accountType === 'checking') || userAccounts[0];
        }
      }

      if (!toAcc) {
        return { success: false, error: `Destination account "${cleanToNumber}" does not exist.` };
      }

      // Calculate transferred today for daily limit
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayOutgoing = await tx
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.fromAccountId, fromAcc.id),
            sql`${transactions.createdAt} >= ${startOfDay}`
          )
        );

      const transferredToday = todayOutgoing.reduce(
        (sum, item) => sum + parseFloat(item.amount),
        0
      );

      // Validate business rules
      const fromBalance = parseFloat(fromAcc.balance);
      const dailyLimit = parseFloat(fromAcc.dailyLimit);

      const validation = validateTransferRules({
        fromAccountBalance: fromBalance,
        fromAccountStatus: fromAcc.status as any,
        toAccountExists: true,
        toAccountStatus: toAcc.status as any,
        toAccountId: toAcc.id,
        fromAccountId: fromAcc.id,
        dailyLimit,
        transferredToday,
        amount: payload.amount,
        isInstant: payload.isInstant,
      });

      if (!validation.valid) {
        await tx.insert(auditLogs).values({
          userId: currentUserId,
          action: 'TRANSFER_REJECTED',
          ipAddress,
          userAgent,
          status: 'FAILED',
          details: JSON.stringify({
            reason: validation.error,
            fromAccountId: fromAcc.id,
            toAccountNumber: cleanToNumber,
            amount: payload.amount,
          }),
        });
        return { success: false, error: validation.error };
      }

      const totalDeduction = validation.totalDeduction;
      const fee = validation.fee;

      const newFromBalance = (fromBalance - totalDeduction).toFixed(2);
      const newToBalance = (parseFloat(toAcc.balance) + payload.amount).toFixed(2);

      // 3. Update balances atomically
      const [updatedFromAcc] = await tx
        .update(accounts)
        .set({ balance: newFromBalance, updatedAt: new Date() })
        .where(eq(accounts.id, fromAcc.id))
        .returning();

      const [updatedToAcc] = await tx
        .update(accounts)
        .set({ balance: newToBalance, updatedAt: new Date() })
        .where(eq(accounts.id, toAcc.id))
        .returning();

      // 4. Create Ledger Transaction
      const refId = generateReferenceId('TXN');
      const [txn] = await tx
        .insert(transactions)
        .values({
          referenceId: refId,
          fromAccountId: fromAcc.id,
          toAccountId: toAcc.id,
          amount: payload.amount.toFixed(2),
          fee: fee.toFixed(2),
          type: 'transfer',
          category: payload.category,
          description: payload.description,
          status: 'completed',
          balanceAfterFrom: newFromBalance,
          balanceAfterTo: newToBalance,
        })
        .returning();

      // 5. Fetch Recipient User details
      const [toUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, toAcc.userId))
        .limit(1);

      // 6. Record Audit Logs for both parties
      await tx.insert(auditLogs).values([
        {
          userId: currentUserId,
          action: 'TRANSFER_EXECUTED',
          ipAddress,
          userAgent,
          status: 'SUCCESS',
          details: JSON.stringify({
            referenceId: refId,
            fromAccountId: fromAcc.id,
            toAccountId: toAcc.id,
            amount: payload.amount,
            fee,
            totalDeduction,
            newBalance: newFromBalance,
          }),
        },
        {
          userId: toAcc.userId,
          action: 'FUNDS_RECEIVED',
          ipAddress,
          userAgent,
          status: 'SUCCESS',
          details: JSON.stringify({
            referenceId: refId,
            fromAccountId: fromAcc.id,
            amount: payload.amount,
            newBalance: newToBalance,
          }),
        },
      ]);

      return {
        success: true,
        transaction: txn,
        fromAccount: updatedFromAcc,
        toAccount: updatedToAcc,
        recipientUser: toUser,
      };
    });
  } catch (err: any) {
    console.error('executeTransfer transaction failure:', err);
    return {
      success: false,
      error: err.message || 'Transaction could not be completed. Rolled back.',
    };
  }
}
