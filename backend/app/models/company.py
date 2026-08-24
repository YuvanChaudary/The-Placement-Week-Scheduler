import uuid
from sqlalchemy import Column, String, Numeric, Integer, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(String(100), nullable=False, unique=True)
    cgpa_cutoff = Column(Numeric(4, 2), nullable=False)
    priority_tier = Column(Integer, nullable=False)
    panel_count = Column(Integer, nullable=False)
    interview_duration_mins = Column(Integer, nullable=False)
    day_availability_mask = Column(Integer, nullable=False, default=15, server_default="15")
    arrival_delay_mins = Column(Integer, nullable=False, default=0, server_default="0")

    __table_args__ = (
        CheckConstraint("cgpa_cutoff >= 0.00 AND cgpa_cutoff <= 10.00", name="chk_company_cgpa_cutoff"),
        CheckConstraint("panel_count >= 1 AND panel_count <= 10", name="chk_company_panel_count"),
    )

    panels = relationship("Panel", back_populates="company", cascade="all, delete-orphan")
    shortlists = relationship("Shortlist", back_populates="company", cascade="all, delete-orphan")
    interviews = relationship("Interview", back_populates="company")
