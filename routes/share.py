import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from auth import verify_api_key
from models import SessionLocal
from share_service import ShareService
from telemetry_notifier import TelemetryNotifier

router = APIRouter(prefix="/api/v1/share", tags=["File Sharing & Access"])
share_service = ShareService()
notifier = TelemetryNotifier()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class CreateShareRequest(BaseModel):
    video_id: str = Field(..., json_schema_extra={"example": "vid_305"})
    file_path: str = Field(..., json_schema_extra={"example": "./data/videos/vid_305.mp4"})
    file_type: Optional[str] = Field("video/mp4", json_schema_extra={"example": "video/mp4"})
    expire_hours: Optional[int] = Field(24, json_schema_extra={"example": 48})
    max_views: Optional[int] = Field(-1, json_schema_extra={"example": 10})
    metadata: Optional[Dict[str, Any]] = None

@router.post("/create", status_code=status.HTTP_201_CREATED)
def generate_share_link(
    data: CreateShareRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    [Authenticated] Generates a secure, time-limited share link for a video or extract.
    """
    try:
        result = share_service.create_share_link(
            db=db,
            video_id=data.video_id,
            file_path=data.file_path,
            file_type=data.file_type,
            expire_hours=data.expire_hours,
            max_views=data.max_views,
            metadata=data.metadata
        )

        # Notify telemetry engine of link creation
        background_tasks.add_task(
            notifier.dispatch_alert,
            event_type="FILE_SHARE_LINK_CREATED",
            payload={"video_id": data.video_id, "share_token": result["share_token"], "expires": result["expires_at"]},
            priority="INFO"
        )

        return {"status": "success", "share_data": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/access/{share_token}")
def access_shared_file(
    share_token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    [Public Direct Link] Streams or downloads the shared asset using the secret token.
    """
    try:
        file_record = share_service.validate_and_record_access(db=db, share_token=share_token)

        # Trigger telemetry event for file access
        background_tasks.add_task(
            notifier.dispatch_alert,
            event_type="SHARED_FILE_ACCESSED",
            payload={
                "video_id": file_record.video_id,
                "token": share_token,
                "views_count": file_record.views_count
            },
            priority="INFO"
        )

        return FileResponse(
            path=file_record.file_path,
            media_type=file_record.file_type,
            filename=os.path.basename(file_record.file_path)
        )
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/revoke/{share_token}", status_code=status.HTTP_200_OK)
def revoke_share_link(
    share_token: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    api_key: str = Depends(verify_api_key)
):
    """
    [Authenticated] Immediately sets is_active = False on active share tokens.
    """
    try:
        file_record = share_service.revoke_share_link(db=db, share_token=share_token)

        # Trigger telemetry event for link revocation
        background_tasks.add_task(
            notifier.dispatch_alert,
            event_type="FILE_SHARE_LINK_REVOKED",
            payload={
                "video_id": file_record.video_id,
                "token": share_token,
                "revoked_at": datetime.now(timezone.utc).isoformat()
            },
            priority="WARNING"
        )

        return {"status": "success", "message": f"Share token {share_token} has been successfully revoked."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
