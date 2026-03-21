"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # families
    op.create_table(
        "families",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # family_members
    op.create_table(
        "family_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("role", sa.Enum("owner", "member", name="memberrole"), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_family_members_family_id", "family_members", ["family_id"])
    op.create_index("ix_family_members_user_id", "family_members", ["user_id"])

    # family_invites
    op.create_table(
        "family_invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_family_invites_token", "family_invites", ["token"])

    # categories
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6366f1"),
        sa.Column("is_default", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_categories_family_id", "categories", ["family_id"])

    # cards
    op.create_table(
        "cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_cards_family_id", "cards", ["family_id"])

    # spendings
    op.create_table(
        "spendings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_email", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("payment_method", sa.Enum("cash", "card", name="paymentmethod"), nullable=False, server_default="cash"),
        sa.Column("card_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cards.id"), nullable=True),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_spendings_family_id", "spendings", ["family_id"])
    op.create_index("ix_spendings_date", "spendings", ["date"])
    op.create_index("ix_spendings_category_id", "spendings", ["category_id"])
    op.create_index("ix_spendings_user_id", "spendings", ["user_id"])

    # budget_goals
    op.create_table(
        "budget_goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("families.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("month", sa.Integer, nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("limit_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_budget_goals_family_month_year", "budget_goals", ["family_id", "month", "year"])

    # Seed default Hebrew categories
    op.execute("""
        INSERT INTO categories (name, color, is_default) VALUES
        ('מזון', '#ef4444', true),
        ('תחבורה', '#f97316', true),
        ('ביגוד', '#eab308', true),
        ('בריאות', '#22c55e', true),
        ('בידור', '#3b82f6', true),
        ('חשבונות', '#8b5cf6', true),
        ('חינוך', '#ec4899', true),
        ('מסעדות', '#f59e0b', true),
        ('טיולים', '#06b6d4', true),
        ('ריהוט', '#84cc16', true),
        ('מתנות', '#e879f9', true),
        ('אחר', '#6b7280', true)
    """)


def downgrade() -> None:
    op.drop_table("budget_goals")
    op.drop_table("spendings")
    op.drop_table("cards")
    op.drop_table("categories")
    op.drop_table("family_invites")
    op.drop_table("family_members")
    op.drop_table("families")
    op.execute("DROP TYPE IF EXISTS memberrole")
    op.execute("DROP TYPE IF EXISTS paymentmethod")
