"""add user_name to spendings, incomes, family_members

Revision ID: 004
Revises: 003
Create Date: 2026-03-20 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("spendings", sa.Column("user_name", sa.String(255), nullable=True))
    op.add_column("incomes", sa.Column("user_name", sa.String(255), nullable=True))
    op.add_column("family_members", sa.Column("user_name", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("family_members", "user_name")
    op.drop_column("incomes", "user_name")
    op.drop_column("spendings", "user_name")
