import uuid
from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Shortlist(Base):
    __tablename__ = "shortlists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    priority_rank = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("company_id", "student_id", name="uq_shortlists_company_student"),
        Index("idx_shortlists_company_student", "company_id", "student_id"),
    )

    company = relationship("Company", back_populates="shortlists")
    student = relationship("Student", back_populates="shortlists")
    interviews = relationship("Interview", back_populates="shortlist")
