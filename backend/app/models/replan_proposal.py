import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ReplanProposal(Base):
    __tablename__ = "replan_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    disruption_id = Column(UUID(as_uuid=True), ForeignKey("disruptions.id", ondelete="CASCADE"), nullable=False)
    base_version_id = Column(UUID(as_uuid=True), ForeignKey("schedule_versions.id", ondelete="CASCADE"), nullable=False)
    proposed_version_id = Column(UUID(as_uuid=True), ForeignKey("schedule_versions.id", ondelete="CASCADE"), nullable=False)
    diff_matrix = Column(JSONB, nullable=False)
    metrics_summary = Column(JSONB, nullable=False)
    status = Column(String(20), nullable=False, default="PROPOSED", server_default="PROPOSED")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    disruption = relationship("Disruption", back_populates="replan_proposals")
    base_version = relationship("ScheduleVersion", foreign_keys=[base_version_id], back_populates="base_replan_proposals")
    proposed_version = relationship("ScheduleVersion", foreign_keys=[proposed_version_id], back_populates="proposed_replan_proposals")
    notifications = relationship("Notification", back_populates="replan_proposal", cascade="all, delete-orphan")
