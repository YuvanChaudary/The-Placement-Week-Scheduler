import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    replan_proposal_id = Column(UUID(as_uuid=True), ForeignKey("replan_proposals.id", ondelete="CASCADE"), nullable=False)
    recipient_type = Column(String(20), nullable=False)
    recipient_id = Column(UUID(as_uuid=True), nullable=False)
    message = Column(Text, nullable=False)
    channel = Column(String(20), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    replan_proposal = relationship("ReplanProposal", back_populates="notifications")
