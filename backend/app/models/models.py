import uuid
from datetime import date
from sqlalchemy import (
    Column,
    String,
    Boolean,
    ForeignKey,
    Numeric,
    Text,
    Date,
    DateTime,
    Integer,
    Enum as SAEnum,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class MemberRole(str, enum.Enum):
    owner = "owner"
    member = "member"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"


class CategoryType(str, enum.Enum):
    expense = "expense"
    income = "income"


class Family(Base):
    __tablename__ = "families"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    owner_id = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    members = relationship("FamilyMember", back_populates="family", cascade="all, delete-orphan")
    invites = relationship("FamilyInvite", back_populates="family", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="family")
    cards = relationship("Card", back_populates="family")
    spendings = relationship("Spending", back_populates="family")
    incomes = relationship("Income", back_populates="family")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_email = Column(String(255), nullable=False)
    user_name = Column(String(255), nullable=True)
    role = Column(SAEnum(MemberRole), nullable=False, default=MemberRole.member)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="members")


class FamilyInvite(Base):

    __tablename__ = "family_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="invites")


class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=True
    )
    user_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=False, default="#6366f1")
    is_default = Column(Boolean, default=False)
    type = Column(SAEnum(CategoryType), nullable=False, default=CategoryType.expense)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="categories")
    spendings = relationship("Spending", back_populates="category")
    incomes = relationship("Income", back_populates="category")


class UserHiddenCategory(Base):
    __tablename__ = "user_hidden_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(
        UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Card(Base):
    __tablename__ = "cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="cards")
    spendings = relationship("Spending", back_populates="card")


class Spending(Base):
    __tablename__ = "spendings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_email = Column(String(255), nullable=False)
    user_name = Column(String(255), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    payment_method = Column(SAEnum(PaymentMethod), nullable=False, default=PaymentMethod.cash)
    card_id = Column(UUID(as_uuid=True), ForeignKey("cards.id"), nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="spendings")
    category = relationship("Category", back_populates="spendings")
    card = relationship("Card", back_populates="spendings")


class BudgetGoal(Base):
    __tablename__ = "budget_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    limit_amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Income(Base):
    __tablename__ = "incomes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id = Column(
        UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_email = Column(String(255), nullable=False)
    user_name = Column(String(255), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    date = Column(Date, nullable=False, default=date.today)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="incomes")
    category = relationship("Category", back_populates="incomes")
