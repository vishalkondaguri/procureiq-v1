"""Phase 1: initial schema — users, suppliers, spend, contracts, ingestion_runs

Revision ID: 001_initial
Revises: 
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table('users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False, server_default='analyst'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('mfa_secret', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── suppliers ─────────────────────────────────────────────────────────────
    op.create_table('suppliers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('canonical_name', sa.String(255), nullable=False),
        sa.Column('aliases', sa.JSON, nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('tier', sa.Integer, nullable=True),
        sa.Column('risk_score', sa.Float, nullable=True),
        sa.Column('risk_level', sa.String(20), nullable=True),
        sa.Column('total_spend_usd', sa.Numeric(20, 2), nullable=True),
        sa.Column('active_contracts', sa.Integer, nullable=True),
        sa.Column('onboarding_date', sa.Date, nullable=True),
        sa.Column('is_active', sa.Boolean, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── spend_transactions ─────────────────────────────────────────────────────
    op.create_table('spend_transactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('supplier_id', sa.String(36), nullable=True),
        sa.Column('supplier_name', sa.String(255), nullable=True),
        sa.Column('po_number', sa.String(100), nullable=True),
        sa.Column('po_date', sa.Date, nullable=True),
        sa.Column('invoice_number', sa.String(100), nullable=True),
        sa.Column('invoice_date', sa.Date, nullable=True),
        sa.Column('amount_usd', sa.Numeric(20, 2), nullable=False),
        sa.Column('cost_center', sa.String(100), nullable=True),
        sa.Column('gl_account', sa.String(50), nullable=True),
        sa.Column('commodity_code', sa.String(50), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('payment_terms', sa.String(50), nullable=True),
        sa.Column('ingestion_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── contracts ─────────────────────────────────────────────────────────────
    op.create_table('contracts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('supplier_id', sa.String(36), nullable=True),
        sa.Column('supplier_name', sa.String(255), nullable=True),
        sa.Column('title', sa.String(512), nullable=False),
        sa.Column('start_date', sa.Date, nullable=True),
        sa.Column('end_date', sa.Date, nullable=True),
        sa.Column('value_usd', sa.Numeric(20, 2), nullable=True),
        sa.Column('status', sa.String(30), nullable=True),
        sa.Column('document_path', sa.String(512), nullable=True),
        sa.Column('extracted_clauses', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── ingestion_runs ─────────────────────────────────────────────────────────
    op.create_table('ingestion_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('filename', sa.String(512), nullable=True),
        sa.Column('file_type', sa.String(20), nullable=True),
        sa.Column('status', sa.String(30), nullable=True),
        sa.Column('health_score', sa.Float, nullable=True),
        sa.Column('rows_total', sa.Integer, nullable=True),
        sa.Column('rows_clean', sa.Integer, nullable=True),
        sa.Column('rows_quarantined', sa.Integer, nullable=True),
        sa.Column('correction_report', sa.JSON, nullable=True),
        sa.Column('pipeline_stages', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('ingestion_runs')
    op.drop_table('contracts')
    op.drop_table('spend_transactions')
    op.drop_table('suppliers')
    op.drop_table('users')
