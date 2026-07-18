"""Add status column to users table for approval workflow

Revision ID: 005_user_status
Revises: 004_ingestion_run_analysis
Create Date: 2025-01-05 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = '005_user_status'
down_revision = '004_ingestion_run_analysis'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add status column: 'active' | 'pending' | 'rejected'
    # Default 'active' so all existing users are unaffected.
    op.add_column(
        'users',
        sa.Column(
            'status',
            sa.String(20),
            nullable=False,
            server_default='active',
        )
    )
    # Backfill: active users → 'active', inactive → keep 'active' (is_active handles that separately)
    op.execute("UPDATE users SET status = 'active' WHERE status IS NULL")

    # rejection_reason — stored when an admin rejects a request
    op.add_column(
        'users',
        sa.Column('rejection_reason', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('users', 'rejection_reason')
    op.drop_column('users', 'status')
