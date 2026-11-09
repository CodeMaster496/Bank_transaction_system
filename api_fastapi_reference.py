"""
ApexVault - FastAPI & PostgreSQL Banking Backend Reference
============================================================
This module demonstrates the Python FastAPI implementation for the ApexVault
secure transaction engine, utilizing SQLAlchemy AsyncEngine, Pydantic v2 schemas,
and WebSocket broadcast channels.

To run with Python:
    pip install fastapi uvicorn sqlalchemy asyncpg pydantic websockets
    uvicorn api_fastapi_reference:app --reload --port 8000
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
import os
import uuid

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime, ForeignKey, Boolean, select
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://user:password@localhost/apexvault")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# --- Database Models ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    account_number = Column(String, unique=True, nullable=False)
    routing_number = Column(String, default="021000021")
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    accounts = relationship("Account", back_populates="owner")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_type = Column(String, nullable=False)  # checking, savings, investment
    account_number = Column(String, unique=True, index=True, nullable=False)
    balance = Column(Numeric(14, 2), default=0.00, nullable=False)
    currency = Column(String, default="USD")
    status = Column(String, default="active")
    daily_limit = Column(Numeric(14, 2), default=10000.00)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="accounts")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String, unique=True, index=True, nullable=False)
    from_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    to_account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    fee = Column(Numeric(14, 2), default=0.00)
    type = Column(String, default="transfer")
    category = Column(String, default="Transfer")
    description = Column(String, nullable=False)
    status = Column(String, default="completed")
    balance_after_from = Column(Numeric(14, 2), nullable=True)
    balance_after_to = Column(Numeric(14, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    status = Column(String, nullable=False)
    details = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# --- Pydantic Schemas ---

class TransferRequest(BaseModel):
    from_account_id: int = Field(..., gt=0, description="Source account ID")
    to_account_number: str = Field(..., min_length=5, max_length=34, description="Target account number")
    amount: Decimal = Field(..., gt=0, le=50000, description="Amount to transfer")
    category: str = Field("Transfer", description="Category of transaction")
    description: str = Field(..., min_length=2, max_length=120)
    is_instant: bool = Field(False, description="Apply instant wire transfer")

    @field_validator("amount")
    def validate_two_decimals(cls, v: Decimal):
        if v.as_tuple().exponent < -2:
            raise ValueError("Amount cannot have more than 2 decimal places")
        return v

class AccountResponse(BaseModel):
    id: int
    account_type: str
    account_number: str
    balance: Decimal
    currency: str
    status: str

    class Config:
        from_attributes = True

# --- WebSocket Connection Manager ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

# --- FastAPI App ---

app = FastAPI(
    title="ApexVault Bank API",
    description="Secure Bank Transaction Engine with Real-Time WebSockets and PostgreSQL",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# --- Endpoints ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client heartbeats
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/transfer")
async def execute_transfer_endpoint(
    payload: TransferRequest,
    db: AsyncSession = Depends(get_db)
):
    async with db.begin():
        # 1. Fetch and Lock Source Account (FOR UPDATE)
        res_from = await db.execute(
            select(Account).where(Account.id == payload.from_account_id).with_for_update()
        )
        from_acc = res_from.scalar_one_or_none()
        if not from_acc:
            raise HTTPException(status_code=404, detail="Source account not found")
        if from_acc.status != "active":
            raise HTTPException(status_code=400, detail=f"Source account is {from_acc.status}")

        # 2. Fetch Destination Account
        res_to = await db.execute(
            select(Account).where(Account.account_number == payload.to_account_number).with_for_update()
        )
        to_acc = res_to.scalar_one_or_none()
        if not to_acc:
            raise HTTPException(status_code=404, detail="Target account does not exist")
        if from_acc.id == to_acc.id:
            raise HTTPException(status_code=400, detail="Cannot transfer funds to identical account")

        # 3. Validation & Fee Calculation
        fee = Decimal("1.50") if payload.is_instant else Decimal("0.00")
        total_deduction = payload.amount + fee

        if from_acc.balance < total_deduction:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient balance: ${from_acc.balance} available, ${total_deduction} required"
            )

        # 4. Atomic Balance Update
        from_acc.balance -= total_deduction
        to_acc.balance += payload.amount

        ref_id = f"TXN-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        txn = Transaction(
            reference_id=ref_id,
            from_account_id=from_acc.id,
            to_account_id=to_acc.id,
            amount=payload.amount,
            fee=fee,
            type="transfer",
            category=payload.category,
            description=payload.description,
            status="completed",
            balance_after_from=from_acc.balance,
            balance_after_to=to_acc.balance,
        )
        db.add(txn)

        audit = AuditLog(
            user_id=from_acc.user_id,
            action="TRANSFER_COMPLETED",
            status="SUCCESS",
            details=f'{{"reference_id":"{ref_id}","amount":{payload.amount}}}'
        )
        db.add(audit)

    # 5. Live WebSocket Broadcast
    await manager.broadcast({
        "type": "BALANCE_UPDATED",
        "payload": {
            "accountId": from_acc.id,
            "newBalance": str(from_acc.balance),
            "referenceId": ref_id,
        }
    })

    return {
        "success": True,
        "referenceId": ref_id,
        "newBalance": str(from_acc.balance)
    }
