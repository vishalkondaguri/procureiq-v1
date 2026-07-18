"""Phase 2: risk scores, savings opportunities

Revision ID: 002_phase2_intelligence
Revises: 001_initial
Create Date: 2025-01-02 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '002_phase2_intelligence'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── supplier_risk_scores ──────────────────────────────────────────────────
    op.create_table('supplier_risk_scores',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('supplier_id', sa.String(36), nullable=False, index=True),
        sa.Column('supplier_name', sa.String(255), nullable=True),
        sa.Column('score_date', sa.Date, nullable=False),
        sa.Column('financial_score', sa.Float, nullable=False),
        sa.Column('geo_score', sa.Float, nullable=False),
        sa.Column('esg_score', sa.Float, nullable=False),
        sa.Column('operational_score', sa.Float, nullable=False),
        sa.Column('compliance_score', sa.Float, nullable=True),
        sa.Column('composite_score', sa.Float, nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=True),
        sa.Column('risk_factors', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ── savings_opportunities ─────────────────────────────────────────────────
    op.create_table('savings_opportunities',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tenant_id', sa.String(36), nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('supplier_id', sa.String(36), nullable=True),
        sa.Column('supplier_name', sa.String(255), nullable=True),
        sa.Column('estimated_value_usd', sa.Numeric(20, 2), nullable=False),
        sa.Column('confidence', sa.Float, nullable=False),
        sa.Column('effort', sa.String(20), nullable=False),
        sa.Column('impact', sa.String(20), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, server_default='identified'),
        sa.Column('ignite_rationale', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('action_items', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('savings_opportunities')
    op.drop_table('supplier_risk_scores')
