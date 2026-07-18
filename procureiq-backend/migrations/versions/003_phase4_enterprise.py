"""Phase 4: audit logs, tenant settings

Revision ID: 003_phase4_enterprise
Revises: 002_phase2_intelligence
Create Date: 2025-01-03 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '003_phase4_enterprise'
down_revision = '002_phase2_intelligence'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── audit_logs ─────────────────────────────────────────────────────────────
    op.create_table('audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=True, index=True),
        sa.Column('user_email', sa.String(255), nullable=True),
        sa.Column('method', sa.String(10), nullable=False),
        sa.Column('path', sa.String(512), nullable=False),
        sa.Column('status_code', sa.Integer, nullable=False),
        sa.Column('duration_ms', sa.Integer, nullable=False),
        sa.Column('ip_address', sa.String(64), nullable=True),
        sa.Column('user_agent', sa.String(512), nullable=True),
        sa.Column('request_body_summary', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── tenant_settings ────────────────────────────────────────────────────────
    op.create_table('tenant_settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text, nullable=False),
        sa.Column('updated_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    # Unique constraint: one value per (tenant, category, key)
    op.create_unique_constraint(
        'uq_tenant_settings_key',
        'tenant_settings',
        ['tenant_id', 'category', 'key'],
    )


def downgrade() -> None:
    op.drop_table('tenant_settings')
    op.drop_table('audit_logs')
