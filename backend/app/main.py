import os
from urllib.parse import urlencode
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

API_TITLE = "Frequency API"

app = FastAPI(title=API_TITLE)

# CORS
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:8080")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TransferRequest(BaseModel):
    action: str
    sourcePlaylistId: str | None = None
    sourcePlatform: str | None = None
    targetPlatform: str | None = None
    playlistName: str | None = None
    playlistDescription: str | None = None


class SyncRequest(BaseModel):
    syncConfigId: str | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/spotify/start")
def spotify_start():
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:8000/auth/spotify/callback")
    scope = "playlist-read-private playlist-modify-private playlist-modify-public"
    if not client_id:
        raise HTTPException(status_code=500, detail="Missing SPOTIFY_CLIENT_ID")

    params = {
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": scope,
        "show_dialog": "false",
    }
    auth_url = f"https://accounts.spotify.com/authorize?{urlencode(params)}"
    return {"authUrl": auth_url}


@app.post("/playlist-transfer")
def playlist_transfer(payload: TransferRequest):
    if payload.action != "transfer_playlist":
        raise HTTPException(status_code=400, detail="Unsupported action")

    # Placeholder response. Implement real transfer with Spotipy or provider SDKs.
    total = 25
    successful = 23
    return {
        "summary": {
            "total": total,
            "successful": successful,
            "failed": total - successful,
        },
        "details": [],
    }


@app.post("/playlist-transfer/sync-linked")
def sync_linked():
    # Placeholder response. Implement real sync logic and persistence.
    return {
        "syncResults": [
            {"configName": "Daily Mix", "tracksAdded": 0, "newTracksFound": 0},
        ]
    }


@app.post("/sync")
def sync(payload: SyncRequest):
    # Placeholder: kick off manual sync.
    return {"started": True, "syncConfigId": payload.syncConfigId}
