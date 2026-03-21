"""category type and per-user categories

Revision ID: 003
Revises: 002
Create Date: 2026-03-20 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the enum type
    op.execute("CREATE TYPE categorytype AS ENUM ('expense', 'income')")

    # 2. Add new columns to categories
    op.add_column("categories", sa.Column("type", sa.Enum("expense", "income", name="categorytype"), nullable=False, server_default="expense"))
    op.add_column("categories", sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True))

    # 3. Create user_hidden_categories table
    op.create_table(
        "user_hidden_categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id", "category_id", name="uq_user_hidden_category"),
    )
    op.create_index("ix_user_hidden_categories_user_id", "user_hidden_categories", ["user_id"])

    # 4. Mark income categories (seeded in migration 002) as type='income'
    op.execute("""
        UPDATE categories
        SET type = 'income'
        WHERE name IN ('משכורת', 'עסק עצמאי', 'קצבאות', 'מתנות התקבלו', 'החזרים', 'הכנסה שונות')
          AND is_default = true
    """)

    # 5. Rename and recolor existing expense defaults to match new list
    op.execute("UPDATE categories SET name = 'אוכל',       color = '#ef4444' WHERE name = 'מזון'      AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET name = 'נסיעות',     color = '#06b6d4' WHERE name = 'תחבורה'    AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET name = 'בגדים',      color = '#eab308' WHERE name = 'ביגוד'     AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET name = 'הוראת קבע',  color = '#3b82f6' WHERE name = 'חשבונות'   AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET name = 'מסעדה',      color = '#f97316' WHERE name = 'מסעדות'    AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET name = 'דברים לבית', color = '#84cc16' WHERE name = 'ריהוט'     AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET name = 'שונות',      color = '#6b7280' WHERE name = 'אחר'       AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET color = '#22c55e'                       WHERE name = 'בריאות'    AND is_default = true AND type = 'expense'")
    op.execute("UPDATE categories SET color = '#e879f9'                       WHERE name = 'מתנות'     AND is_default = true AND type = 'expense'")

    # 6. Migrate spendings referencing about-to-be-deleted categories → 'שונות'
    op.execute("""
        UPDATE spendings
        SET category_id = (
            SELECT id FROM categories
            WHERE name = 'שונות' AND is_default = true AND type = 'expense'
            LIMIT 1
        )
        WHERE category_id IN (
            SELECT id FROM categories
            WHERE name IN ('בידור', 'חינוך', 'טיולים') AND is_default = true AND type = 'expense'
        )
    """)

    # 7. Delete old defaults not in new list
    op.execute("""
        DELETE FROM categories
        WHERE name IN ('בידור', 'חינוך', 'טיולים') AND is_default = true AND type = 'expense'
    """)

    # 8. Add new expense defaults from the Excel template
    op.execute("""
        INSERT INTO categories (name, color, is_default, type) VALUES
        ('שכירות',       '#6366f1', true, 'expense'),
        ('דברים אישיים', '#a855f7', true, 'expense'),
        ('רכב(דלק)',     '#f59e0b', true, 'expense'),
        ('בנק',          '#64748b', true, 'expense'),
        ('צדקה',         '#10b981', true, 'expense'),
        ('ארי',          '#f43f5e', true, 'expense'),
        ('מיסים',        '#8b5cf6', true, 'expense')
    """)


def downgrade() -> None:
    op.drop_table("user_hidden_categories")
    op.drop_column("categories", "user_id")
    op.drop_column("categories", "type")
    op.execute("DROP TYPE IF EXISTS categorytype")
