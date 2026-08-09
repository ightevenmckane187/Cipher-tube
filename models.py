import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, JSON
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./shared_files.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SharedFile(Base):
    __tablename__ = "shared_files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String, index=True, nullable=False)
    share_token = Column(String, unique=True, index=True, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, default="video/mp4")  # video/mp4, application/json, text/plain

    # Access controls
    max_views = Column(Integer, default=-1)  # -1 for unlimited
    views_count = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    # Telemetry metadata
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    metadata_payload = Column(JSON, nullable=True)

    def is_valid(self) -> bool:
        """Checks if share link is active, unexpired, and within view limits."""
        if not self.is_active:
            return False

        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

        if datetime.now(timezone.utc) > expires:
            return False
        if self.max_views != -1 and self.views_count >= self.max_views:
            return False
        return True
