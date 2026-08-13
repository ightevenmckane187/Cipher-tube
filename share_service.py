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
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found on disk: {file_path}")

        # 1. Resolve canonical/absolute path to defeat path traversal attacks
        canonical_path = os.path.realpath(file_path)

        # 2. Validate directory containment (Defense-in-depth)
        allowed_bases = [
            os.path.realpath(os.getcwd()),
            os.path.realpath(tempfile.gettempdir())
        ]

        is_contained = False
        for base in allowed_bases:
            try:
                if os.path.commonpath([base, canonical_path]) == base:
                    is_contained = True
                    break
            except ValueError:
                # May occur if paths are on different drive letters (e.g., Windows)
                continue

        if not is_contained:
            raise ValueError("Access to the specified path is restricted (unauthorized directory location).")

        # 3. Block access to hidden files/directories (starting with '.')
        basename = os.path.basename(canonical_path)
        if basename.startswith('.'):
            raise ValueError("Access to hidden files is restricted.")

        # Check relative path components to prevent access inside hidden subdirectories
        for base in allowed_bases:
            is_sub = False
            try:
                if os.path.commonpath([base, canonical_path]) == base:
                    is_sub = True
            except ValueError:
                continue

            if is_sub:
                rel_path = os.path.relpath(canonical_path, base)
                if any(part.startswith('.') for part in rel_path.split(os.sep) if part not in ('', '.', '..')):
                    raise ValueError("Access to hidden files or directories is restricted.")

        # 4. Block access to sensitive or system configuration names/extensions
        sensitive_patterns = [".env", "vault.env", "config.json", "settings.json", "database.db"]
        for pattern in sensitive_patterns:
            if pattern in basename.lower() or pattern in canonical_path.lower():
                raise ValueError("Access to sensitive configuration or system files is restricted.")

        # Generate a cryptographically secure random share token
        share_token = secrets.token_urlsafe(32)
        expiration = datetime.now(timezone.utc) + timedelta(hours=expire_hours)

        shared_entry = SharedFile(
            video_id=video_id,
            share_token=share_token,
            file_path=file_path,
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
