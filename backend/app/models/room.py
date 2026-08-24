import uuid
from sqlalchemy import Column, String, Integer, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    building = Column(String(50), nullable=False)
    room_number = Column(String(20), nullable=False, unique=True)
    capacity = Column(Integer, nullable=False, default=6, server_default="6")
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")

    interviews = relationship("Interview", back_populates="room")
