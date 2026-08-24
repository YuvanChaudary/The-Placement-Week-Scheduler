import uuid
from sqlalchemy import Column, String, Integer, Time, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    version_id = Column(UUID(as_uuid=True), ForeignKey("schedule_versions.id", ondelete="CASCADE"), nullable=False)
    shortlist_id = Column(UUID(as_uuid=True), ForeignKey("shortlists.id", ondelete="CASCADE"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    panel_id = Column(UUID(as_uuid=True), ForeignKey("panels.id", ondelete="SET NULL"), nullable=True)
    room_id = Column(UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    day = Column(Integer, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    status = Column(String(20), nullable=False)
    conflict_reason = Column(String(100), nullable=True)

    __table_args__ = (
        Index(
            "idx_interviews_student_slot",
            "version_id", "student_id", "day", "start_time", "end_time",
            postgresql_where=text("status = 'SCHEDULED'")
        ),
        Index(
            "idx_interviews_room_slot",
            "version_id", "room_id", "day", "start_time", "end_time",
            postgresql_where=text("status = 'SCHEDULED'")
        ),
        Index(
            "idx_interviews_panel_slot",
            "version_id", "panel_id", "day", "start_time", "end_time",
            postgresql_where=text("status = 'SCHEDULED'")
        ),
        Index(
            "idx_interviews_version_lookup",
            "version_id", "status"
        ),
    )

    version = relationship("ScheduleVersion", back_populates="interviews")
    shortlist = relationship("Shortlist", back_populates="interviews")
    company = relationship("Company", back_populates="interviews")
    student = relationship("Student", back_populates="interviews")
    panel = relationship("Panel", back_populates="interviews")
    room = relationship("Room", back_populates="interviews")
