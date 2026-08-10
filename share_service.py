import os
import secrets
import tempfile
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models import SharedFile, SessionLocal

class ShareService:
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("CYPHER_BASE_URL", "http://localhost:8000")

    def create_share_link(
        self,
        db: Session,
        video_id: str,
        file_path: str,
        file_type: str = "video/mp4",
        expire_hours: int = 24,
        max_views: int = -1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Creates a time-limited secure share token for a specific video file or clip.
        Implements strict path traversal protection and secure file filtering.
        """
        # Resolve to absolute real path to handle symlinks and relative traversal (e.g. "../")
        real_path = os.path.realpath(file_path)

        if not os.path.exists(real_path):
            raise FileNotFoundError(f"File not found on disk: {file_path}")

        # Define allowed directories (workspace root and system temp folder)
        allowed_dirs = [
            os.path.realpath(os.getcwd()),
            os.path.realpath(tempfile.gettempdir())
        ]

        # Ensure the file is inside one of the allowed directories (strict containment)
        is_allowed = False
        for allowed_dir in allowed_dirs:
            common = os.path.commonpath([allowed_dir, real_path])
            if common == allowed_dir:
                is_allowed = True
                break

        if not is_allowed:
            raise ValueError("Path traversal detected: Access to files outside of designated directories is denied.")

        # Hardened check: Prevent sharing critical configuration files, system databases, or hidden files/folders (starting with .)
        filename = os.path.basename(real_path)
        if (
            filename.startswith(".") or
            filename in ("shared_files.db", "vault.env", "package.json", "package-lock.json", "pnpm-lock.yaml", "pnpm-workspace.yaml") or
            real_path.endswith(".env") or
            ".git" in real_path.split(os.sep) or
            ".jules" in real_path.split(os.sep)
        ):
            raise ValueError("Access Denied: Sharing of sensitive configuration, system database, or hidden files is strictly prohibited.")

        # Generate a cryptographically secure random share token
        share_token = secrets.token_urlsafe(32)
        expiration = datetime.now(timezone.utc) + timedelta(hours=expire_hours)

        shared_entry = SharedFile(
            video_id=video_id,
            share_token=share_token,
            file_path=real_path,
            file_type=file_type,
            max_views=max_views,
            expires_at=expiration,
            metadata_payload=metadata or {}
        )

        db.add(shared_entry)
        db.commit()
        db.refresh(shared_entry)

        share_url = f"{self.base_url}/api/v1/share/access/{share_token}"

        return {
            "share_id": shared_entry.id,
            "share_token": share_token,
            "share_url": share_url,
            "expires_at": expiration.isoformat(),
            "max_views": max_views,
            "file_type": file_type
        }

    def validate_and_record_access(self, db: Session, share_token: str) -> SharedFile:
        """
        Validates token expiration and view count, then increments the view counter.
        """
        share_record = db.query(SharedFile).filter(SharedFile.share_token == share_token).first()

        if not share_record or not share_record.is_valid():
            raise ValueError("Share link is invalid, expired, or view limits exceeded.")

        # Increment view analytics counter
        share_record.views_count += 1
        db.commit()
        db.refresh(share_record)

        return share_record

    def revoke_share_link(self, db: Session, share_token: str) -> SharedFile:
        """
        Immediately sets is_active = False on active share tokens.
        """
        share_record = db.query(SharedFile).filter(SharedFile.share_token == share_token).first()

        if not share_record:
            raise ValueError("Share link not found.")

        share_record.is_active = False
        db.commit()
        db.refresh(share_record)

        return share_record
