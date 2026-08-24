import uuid
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Disruption(Base):
    __tablename__ = "disruptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    disruption_type = Column(String(30), nullable=False)
    target_entity_type = Column(String(20), nullable=False)
    target_entity_id = Column(UUID(as_uuid=True), nullable=False)
    parameters = Column(JSONB, nullable=False)
    injected_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    schedule_versions = relationship("ScheduleVersion", back_populates="disruption")
    replan_proposals = relationship("ReplanProposal", back_populates="disruption")
