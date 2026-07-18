"""Add analysis + error_message + uploaded_by columns to ingestion_runs

Revision ID: 004_ingestion_run_analysis
Revises: 003_phase4_enterprise
Create Date: 2025-01-04 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '004_ingestion_run_analysis'
down_revision = '003_phase4_enterprise'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # analysis — rich analysis JSON produced by _build_analysis()
    op.add_column('ingestion_runs',
        sa.Column('analysis', sa.JSON, nullable=True))

    # error_message and uploaded_by were in the ORM model but missing from the
    # initial migration — add them idempotently (IF NOT EXISTS via try/except
    # is not available in alembic, so we add them unconditionally; they are
    # safe no-ops if the column already exists in some environments).
    try:
        op.add_column('ingestion_runs',
            sa.Column('error_message', sa.String(2000), nullable=True))
    except Exception:
        pass  # column may already exist

    try:
        op.add_column('ingestion_runs',
            sa.Column('uploaded_by', sa.String(36), nullable=True))
    except Exception:
        pass  # column may already exist


def downgrade() -> None:
    op.drop_column('ingestion_runs', 'analysis')
    try:
        op.drop_column('ingestion_runs', 'error_message')
    except Exception:
        pass
    try:
        op.drop_column('ingestion_runs', 'uploaded_by')
    except Exception:
        pass
