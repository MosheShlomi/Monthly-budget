"""cards per user

Revision ID: 005
Revises: 004
Create Date: 2026-03-20
"""
from alembic import op
import sqlalchemy as sa

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade():
    # Add user_id column to cards
    op.add_column("cards", sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True))

    # Assign existing cards to their family's owner
    op.execute("""
        UPDATE cards
        SET user_id = families.owner_id
        FROM families
        WHERE cards.family_id = families.id
          AND cards.user_id IS NULL
    """)

    op.create_index("ix_cards_user_id", "cards", ["user_id"])


def downgrade():
    op.drop_index("ix_cards_user_id", table_name="cards")
    op.drop_column("cards", "user_id")
