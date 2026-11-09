import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  seedInitialDataIfEmpty,
  getUserAccounts,
  getUserTransactions,
  executeTransfer,
  depositFunds,
  toggleAccountFreeze,
  getUserRecipients,
  addRecipient,
  getUserAuditLogs,
  getAllUsersDirectory,
} from './src/db/banking.ts';
import { TransferInputSchema } from './src/utils/banking-logic.ts';
import { setupWebSocketServer } from './src/server/websocket.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wsBroadcaster = setupWebSocketServer(server);

  // Initialize demo accounts if database is fresh
  await seedInitialDataIfEmpty().catch((err) => {
    console.error('Initial data seed error:', err);
  });

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'ApexVault Core Banking Engine',
      database: 'PostgreSQL (Cloud SQL)',
      timestamp: new Date().toISOString(),
    });
  });

  // Current authenticated user profile
  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // User bank accounts
  app.get('/api/accounts', requireAuth, async (req: AuthRequest, res) => {
    try {
      const accounts = await getUserAccounts(req.user!.id);
      res.json({ accounts });
    } catch (err: any) {
      console.error('Error fetching accounts:', err);
      res.status(500).json({ error: 'Failed to fetch account portfolios.' });
    }
  });

  // Transaction history
  app.get('/api/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const transactions = await getUserTransactions(req.user!.id, limit);
      res.json({ transactions });
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      res.status(500).json({ error: 'Failed to retrieve transaction history.' });
    }
  });

  // Directory of accounts (for easy payee lookup and instant transfer targeting)
  app.get('/api/users/directory', requireAuth, async (req: AuthRequest, res) => {
    try {
      const directory = await getAllUsersDirectory();
      res.json({ directory });
    } catch (err: any) {
      console.error('Error querying directory:', err);
      res.status(500).json({ error: 'Failed to fetch directory.' });
    }
  });

  // Perform secure fund transfer (ACID transaction)
  app.post('/api/transfer', requireAuth, async (req: AuthRequest, res) => {
    const parseResult = TransferInputSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    try {
      const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'ApexVault Web';

      const result = await executeTransfer(req.user!.id, parseResult.data, {
        ipAddress,
        userAgent,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Live WebSocket Balance and Transaction Broadcasts
      // 1. Notify Sender
      wsBroadcaster.broadcastUser(req.user!.id, 'BALANCE_UPDATED', {
        accountId: result.fromAccount.id,
        newBalance: result.fromAccount.balance,
        transaction: result.transaction,
      });
      wsBroadcaster.broadcastUser(req.user!.id, 'TRANSFER_SENT', {
        transaction: result.transaction,
        toName: result.recipientUser?.fullName || 'Beneficiary',
      });

      // 2. Notify Receiver if registered in system
      if (result.recipientUser?.id) {
        wsBroadcaster.broadcastUser(result.recipientUser.id, 'BALANCE_UPDATED', {
          accountId: result.toAccount.id,
          newBalance: result.toAccount.balance,
          transaction: result.transaction,
        });
        wsBroadcaster.broadcastUser(result.recipientUser.id, 'TRANSFER_RECEIVED', {
          transaction: result.transaction,
          fromName: req.user!.fullName,
        });
      }

      // 3. Broadcast to global activity feed
      wsBroadcaster.broadcastAll('TRANSACTION_LOGGED', {
        referenceId: result.transaction.referenceId,
        amount: result.transaction.amount,
        type: result.transaction.type,
        category: result.transaction.category,
        timestamp: result.transaction.createdAt,
      });

      return res.json({
        success: true,
        message: 'Fund transfer executed successfully.',
        transaction: result.transaction,
        updatedFromAccount: result.fromAccount,
      });
    } catch (err: any) {
      console.error('Transfer execution route error:', err);
      return res.status(500).json({ error: err.message || 'Transfer failed.' });
    }
  });

  // Quick Deposit Simulator (to easily top up and test multiple transfers)
  app.post('/api/deposit', requireAuth, async (req: AuthRequest, res) => {
    const { accountId, amount, description } = req.body;
    const numAmount = parseFloat(amount);
    const numAccountId = parseInt(accountId, 10);

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive deposit amount required.' });
    }
    if (isNaN(numAccountId)) {
      return res.status(400).json({ error: 'Valid accountId required.' });
    }

    try {
      const result = await depositFunds(
        req.user!.id,
        numAccountId,
        numAmount,
        description || 'Instant Check Deposit'
      );

      // WebSocket notification
      wsBroadcaster.broadcastUser(req.user!.id, 'BALANCE_UPDATED', {
        accountId: result.account.id,
        newBalance: result.account.balance,
        transaction: result.transaction,
      });

      res.json({
        success: true,
        message: 'Deposit credited successfully.',
        account: result.account,
        transaction: result.transaction,
      });
    } catch (err: any) {
      console.error('Deposit error:', err);
      res.status(500).json({ error: err.message || 'Deposit failed.' });
    }
  });

  // Freeze/unfreeze account
  app.post('/api/accounts/:id/toggle-freeze', requireAuth, async (req: AuthRequest, res) => {
    const accountId = parseInt(req.params.id, 10);
    if (isNaN(accountId)) return res.status(400).json({ error: 'Invalid account ID.' });

    try {
      const updated = await toggleAccountFreeze(req.user!.id, accountId);
      res.json({ success: true, account: updated });
    } catch (err: any) {
      console.error('Toggle freeze error:', err);
      res.status(500).json({ error: err.message || 'Failed to update account security status.' });
    }
  });

  // Saved Payees / Recipients
  app.get('/api/recipients', requireAuth, async (req: AuthRequest, res) => {
    try {
      const recipientsList = await getUserRecipients(req.user!.id);
      res.json({ recipients: recipientsList });
    } catch (err: any) {
      console.error('Recipients error:', err);
      res.status(500).json({ error: 'Failed to fetch recipients.' });
    }
  });

  app.post('/api/recipients', requireAuth, async (req: AuthRequest, res) => {
    const { name, email, accountNumber, bankName } = req.body;
    if (!name || !email || !accountNumber) {
      return res.status(400).json({ error: 'Name, email, and account number are required.' });
    }

    try {
      const rec = await addRecipient(req.user!.id, { name, email, accountNumber, bankName });
      res.json({ success: true, recipient: rec });
    } catch (err: any) {
      console.error('Add recipient error:', err);
      res.status(500).json({ error: 'Failed to save recipient.' });
    }
  });

  // Audit Logs (security & compliance)
  app.get('/api/audit-logs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const logs = await getUserAuditLogs(req.user!.id, 50);
      res.json({ logs });
    } catch (err: any) {
      console.error('Audit logs error:', err);
      res.status(500).json({ error: 'Failed to retrieve audit logs.' });
    }
  });

  // Vite dev server middleware or static production serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ApexVault Core Banking Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('FATAL: Server bootstrap failed:', err);
  process.exit(1);
});
