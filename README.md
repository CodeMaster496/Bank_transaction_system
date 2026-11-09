# ApexVault - Secure Banking & Real-Time Fund Transfer Engine

ApexVault is a full-stack financial transaction platform built to demonstrate secure fund transfers, relational ledger integrity with ACID transactions, live WebSocket balance updates, and compliance audit logging.

Built with **React 19**, **Tailwind CSS**, **PostgreSQL (Cloud SQL)**, **Drizzle ORM / Express**, and a **Python FastAPI** backend architecture specification.

---

## 🌟 Key Features

- **ACID Transaction Isolation**: Transfers execute inside PostgreSQL database transactions with row-level locks, ensuring zero race conditions or double-spending.
- **Real-Time Account Balance Synchronization**: WebSocket broadcasts (`/ws`) push balance changes instantly to all active devices upon transaction settlement.
- **Double-Entry Transaction Ledger**: Immutable records tracking sender, recipient, amounts, fees, timestamps, categories, and post-transaction balances.
- **Biometric-Grade Security & Audit Trail**: Real-time event logging in PostgreSQL (`audit_logs`) capturing timestamps, IP addresses, user agents, and authorization outcomes.
- **Input Validation & Financial Rules**: Dual-layer verification via Zod schemas and business logic enforcing limits, 2-decimal precision, and card freeze checks.
- **Account Controls**: Instant account/card freezing & unfreezing, deposit simulation, and saved beneficiary directories.
- **Modern Responsive UI**: Dark & Light mode support, metallic debit card designs with EMV chips, and mobile-optimized layouts.
- **Dual-Backend Parity**: Includes both the active Node.js server (`server.ts`) and a Python FastAPI reference (`api_fastapi_reference.py`) with async SQLAlchemy.

---

## 🏗️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (React)                        │
│          Tailwind CSS • Context API • Live WebSockets        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST & WebSocket (ws://)
┌──────────────────────────────▼──────────────────────────────┐
│                    Banking Core Server                      │
│        Express / Vite (or Python FastAPI asyncpg)           │
│        Zod Input Validation • Auth Middleware               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Drizzle ORM (Connection Pool)
┌──────────────────────────────▼──────────────────────────────┐
│               PostgreSQL Relational Database                │
│    Users • Accounts • Transactions • Audit Logs • Payees    │
└─────────────────────────────────────────────────────────────┘
```

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti |
| **Active Server** | Node.js, Express, TypeScript (`server.ts`), Vite Middleware |
| **Python Backend** | FastAPI, SQLAlchemy AsyncEngine, Pydantic v2, WebSockets (`api_fastapi_reference.py`) |
| **Database** | PostgreSQL (Google Cloud SQL), Drizzle ORM, `pg.Pool` |
| **Authentication** | Firebase Authentication / Google OAuth + Multi-Account Simulation |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert/strict`) via `tsx` |

---

## 🗄️ Database Schema

1. **`users`**: Customer profiles, account numbers (`APX-XXXX-XXXX`), routing number, authentication identifiers, and role.
2. **`accounts`**: Portfolios (Checking, Savings, Investment), decimal balances, currencies, status (`active` / `frozen`), and daily limits.
3. **`transactions`**: Reference IDs (`TXN-YYYYMMDD-XXXXXX`), source and destination accounts, transfer types, categories, amounts, network fees, and settlement status.
4. **`audit_logs`**: Compliance logs recording actions (`TRANSFER_EXECUTED`, `DEPOSIT_CREDITED`, `ACCOUNT_FROZEN`), IP addresses, user agents, and metadata.
5. **`recipients`**: Saved payees and beneficiaries for one-click transfers.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v20+ recommended)
- **npm** or **bun**
- (Optional) **Python 3.10+** for running the FastAPI backend reference

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   cd YOUR_REPOSITORY
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Run the Application**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Unit Testing

Unit tests for pure financial business logic, fees, account masking, and input validation are located in `src/utils/banking-logic.test.ts`.

Run the test suite:
```bash
npm test
```

---

## 🐍 Running the Python FastAPI Backend

To run the Python FastAPI alternative implementation:

```bash
# 1. Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install Python requirements
pip install fastapi uvicorn sqlalchemy asyncpg pydantic websockets

# 3. Start the FastAPI server
uvicorn api_fastapi_reference:app --reload --port 8000
```
API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 📄 License

This project is licensed under the Apache 2.0 License.
