from fastapi import FastAPI
from routes.share import router as share_router
from models import engine, Base

app = FastAPI(title="CypherTube File Sharing Service", version="1.0.0")

# Ensure all database metadata is configured on application initialization
Base.metadata.create_all(bind=engine)

app.include_router(share_router)

@app.get("/")
def read_root():
    return {"status": "Sovereign CypherTube API", "module": "Share File Module"}
