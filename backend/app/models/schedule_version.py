import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ScheduleVersion(Base):
    __tablename__ = "schedule_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    version_number = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    created_by = Column(String(50), nullable=False)
    disruption_id = Column(UUID(as_uuid=True), ForeignKey("disruptions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    disruption = relationship("Disruption", back_populates="schedule_versions")
    interviews = relationship("Interview", back_populates="version", cascade="all, delete-orphan")
    base_replan_proposals = relationship("ReplanProposal", foreign_keys="ReplanProposal.base_version_id", back_populates="base_version")
    proposed_replan_proposals = relationship("ReplanProposal", foreign_keys="ReplanProposal.proposed_version_id", back_populates="proposed_version")
