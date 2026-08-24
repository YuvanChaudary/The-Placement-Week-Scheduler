import uuid
from sqlalchemy import Column, String, Numeric, DateTime, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(String(100), nullable=False)
    roll_number = Column(String(20), nullable=False, unique=True)
    cgpa = Column(Numeric(4, 2), nullable=False)
    branch = Column(String(50), nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    status = Column(String(20), nullable=False, default="ELIGIBLE", server_default="ELIGIBLE")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("cgpa >= 0.00 AND cgpa <= 10.00", name="chk_student_cgpa"),
    )

    shortlists = relationship("Shortlist", back_populates="student", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="student")
