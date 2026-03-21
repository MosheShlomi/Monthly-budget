"""add incomes table and income categories

Revision ID: 002
Revises: 001
Create Date: 2026-03-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incomes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_incomes_family_id", "incomes", ["family_id"])
    op.create_index("ix_incomes_date", "incomes", ["date"])
    op.create_index("ix_incomes_user_id", "incomes", ["user_id"])

    # Seed default income categories
    op.execute("""
        INSERT INTO categories (name, color, is_default) VALUES
        ('משכורת', '#10b981', true),
        ('עסק עצמאי', '#0ea5e9', true),
        ('קצבאות', '#8b5cf6', true),
        ('מתנות התקבלו', '#f59e0b', true),
        ('החזרים', '#06b6d4', true),
        ('הכנסה שונות', '#6b7280', true)
    """)


def downgrade() -> None:
    op.drop_index("ix_incomes_user_id", "incomes")
    op.drop_index("ix_incomes_date", "incomes")
    op.drop_index("ix_incomes_family_id", "incomes")
    op.drop_table("incomes")
