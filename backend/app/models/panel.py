import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Panel(Base):
    __tablename__ = "panels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    panel_name = Column(String(50), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    company = relationship("Company", back_populates="panels")
    interviews = relationship("Interview", back_populates="panel")
