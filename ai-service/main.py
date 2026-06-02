# ============================================================
# TruthLens AI – Python FastAPI AI Service
# ============================================================
# main.py – Deepfake detection microservice
#
# Detection cascade (in priority order):
#   Tier 1: Hive AI API           – Bearer auth, visual moderation endpoint
#   Tier 2: dima806/deepfake_vs_real_image_detection (HuggingFace pipeline)
#   Tier 3: Statistical fallback  – demo only, no accuracy guarantee
#
# Starts on: http://localhost:8000
# Docs:       http://localhost:8000/docs
# ============================================================

import os
import io
import json
import logging
from pathlib import Path
from typing import Optional

from torch import classes
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# ── Load .env ────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

# ── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("truthlens.ai")

# ── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title="TruthLens AI – Deepfake Detection Service",
    description=(
        "Deepfake image detection microservice.\n"
        "Cascade: Hive AI API → HuggingFace dima806 pipeline → Statistical fallback."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── HuggingFace pipeline (lazy-loaded on first use) ──────────
_hf_pipeline = None
_hf_loaded   = False          # True once we've attempted loading (success or fail)

HF_MODEL_ID = "dima806/deepfake_vs_real_image_detection"

def get_hf_pipeline():
    """
    Lazy-load the HuggingFace image-classification pipeline.
    Model: dima806/deepfake_vs_real_image_detection
    Labels returned by this model: 'fake' / 'real'
    Downloads ~400 MB on first run; cached locally afterwards.
    """
    global _hf_pipeline, _hf_loaded
    if _hf_loaded:
        return _hf_pipeline

    try:
        from transformers import pipeline
        logger.info(f"[HF] Loading pipeline – model: {HF_MODEL_ID} ...")
        _hf_pipeline = pipeline(
            "image-classification",
            model=HF_MODEL_ID,
            # device=-1 forces CPU; change to device=0 for GPU
            device=-1,
        )
        logger.info(f"[HF] Pipeline loaded successfully ({HF_MODEL_ID}).")
    except Exception as exc:
        logger.warning(f"[HF] Could not load pipeline: {exc}")
        _hf_pipeline = None

    _hf_loaded = True
    return _hf_pipeline


# ─────────────────────────────────────────────────────────────
# Tier 1 – Hive AI API
# ─────────────────────────────────────────────────────────────
async def detect_via_hive(image_bytes: bytes, filename: str) -> Optional[dict]:
    """
    Call Hive AI's Visual Moderation API for deepfake/AI-generated detection.

    Auth:     Authorization: Bearer <SECRET_KEY>
    Endpoint: https://api.thehive.ai/api/v2/task/sync
    Docs:     https://docs.thehive.ai/reference/visual-moderation
    Free tier: 1 000 req / month – sign up at https://thehive.ai/

    Returns None on any error so the cascade can continue.
    """
    import httpx

    api_key = os.getenv("HIVE_API_KEY", "").strip()
    if not api_key or api_key == "YOUR_HIVE_API_KEY_HERE":
        logger.info("[Hive] API key not configured – skipping Tier 1.")
        return None

    url = "https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection"
    headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}

    try:
        logger.info("[Hive] Sending image to Hive AI API (V3)…")

        import base64
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "input": [
                {
                    "media_base64": f"data:image/jpeg;base64,{encoded_image}"
                }
            ]
        }

        async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
            response = await client.post(
                url,
                headers=headers,
                json=payload,
            )
        if not response.text:
            logger.warning("[Hive] Empty response from API")
            return None
        if response.status_code != 200:
            logger.warning(f"[Hive] Error {response.status_code}: {response.text[:300]}")
            return None

        data = response.json()

        # ── Parse Hive V3 response ───────────────────────────────
        classes = data.get("output", [{}])[0].get("classes", [])

        if not classes:
            logger.warning(f"[Hive] Empty or invalid classes: {data}")
            return None

        deepfake_score = 0.0
        real_score = 0.0

        for cls in classes:
            name = cls.get("class", "").lower()
            score = float(cls.get("value", 0))

            if name == "ai_generated":
                deepfake_score = score
            elif name == "not_ai_generated":
                real_score = score
            elif name == "deepfake":
                deepfake_score = max(deepfake_score, score)

        if deepfake_score == 0.0 and real_score == 0.0:
            logger.warning(f"[Hive] Could not map any class. Classes: {classes}")
            return None

        if deepfake_score >= 0.5:
            label = "FAKE"
            confidence = round(deepfake_score * 100, 2)
        else:
            label = "REAL"
            confidence = round(real_score * 100, 2)

        logger.info(f"[Hive] ✓ Tier 1 result: {label} @ {confidence}%")

        return {
            "label": label,
            "confidence": confidence,
            "modelUsed": "Hive AI – Deepfake Detection (V3)",
        }

    except Exception as exc:
            import traceback
            logger.error(f"[Hive] Unexpected error: {str(exc)}")
            logger.error(traceback.format_exc())
            return None
# ─────────────────────────────────────────────────────────────
# Tier 2 – HuggingFace dima806 pipeline
# ─────────────────────────────────────────────────────────────
async def detect_via_huggingface(image_bytes: bytes) -> Optional[dict]:
    """
    Run the dima806/deepfake_vs_real_image_detection pipeline locally.

    Model card: https://huggingface.co/dima806/deepfake_vs_real_image_detection
    Labels:     'fake' and 'real' (exact strings from the model)
    Size:       ~400 MB download on first run; cached in ~/.cache/huggingface

    Returns None if the pipeline cannot be loaded or inference fails.
    """
    try:
        from PIL import Image
        pipe = get_hf_pipeline()
        if pipe is None:
            logger.info("[HF] Pipeline unavailable – skipping Tier 2.")
            return None

        logger.info(f"[HF] Running inference with {HF_MODEL_ID} …")
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # pipeline returns a list of {"label": str, "score": float}
        # sorted by descending score
        preds = pipe(image)
        logger.info(f"[HF] Raw predictions: {preds}")

        # Build a score dict  {label_lower: score}
        scores = {p["label"].lower(): float(p["score"]) for p in preds}

        fake_score = 0.0
        real_score = 0.0
        for lbl, sc in scores.items():
            if "fake" in lbl or "deepfake" in lbl or "ai" in lbl:
                fake_score = max(fake_score, sc)
            elif "real" in lbl or "authentic" in lbl:
                real_score = max(real_score, sc)

        if fake_score == 0.0 and real_score == 0.0:
            logger.warning(f"[HF] Could not map predictions to fake/real: {preds}")
            return None

        if fake_score >= real_score:
            label      = "FAKE"
            confidence = round(fake_score * 100, 2)
        else:
            label      = "REAL"
            confidence = round(real_score * 100, 2)

        logger.info(f"[HF] ✓ Tier 2 result: {label} @ {confidence}%")
        return {
            "label"     : label,
            "confidence": confidence,
            "modelUsed" : f"HuggingFace – {HF_MODEL_ID}",
        }

    except Exception as exc:
        logger.error(f"[HF] Inference error: {exc}")
        return None


# ─────────────────────────────────────────────────────────────
# Tier 3 – Statistical fallback (demo only)
# ─────────────────────────────────────────────────────────────
def detect_via_fallback(image_bytes: bytes) -> dict:
    """
    Basic image-statistics fallback used when both Tier 1 and Tier 2 fail.

    This is NOT a real deepfake detector – it uses trivial pixel statistics
    purely to keep the system functional without API keys or ML libraries.
    Confidence is intentionally capped at 60 % to signal uncertainty.
    """
    try:
        from PIL import Image
        import numpy as np

        logger.info("[Fallback] Running statistical image analysis (Tier 3 – demo only)…")
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        arr   = np.array(image, dtype=np.float32)

        variance    = float(np.var(arr))
        mean_r      = float(np.mean(arr[:, :, 0]))
        mean_g      = float(np.mean(arr[:, :, 1]))
        mean_b      = float(np.mean(arr[:, :, 2]))
        channel_std = float(np.std([mean_r, mean_g, mean_b]))

        fake_score = 0.0
        if variance < 1500:      # unusually smooth – may indicate AI generation
            fake_score += 0.3
        if channel_std < 5:      # very uniform colour channels
            fake_score += 0.2
        fake_score = min(fake_score, 0.6)    # never claim high confidence
        real_score = 1.0 - fake_score

        label      = "FAKE" if fake_score > 0.45 else "REAL"
        confidence = round((fake_score if label == "FAKE" else real_score) * 100, 2)

        logger.info(f"[Fallback] ✓ Tier 3 result: {label} @ {confidence}% (demo)")
        return {
            "label"     : label,
            "confidence": confidence,
            "modelUsed" : "Statistical Fallback Analyzer (Tier 3 – Demo Only)",
            "note"      : (
                "Result is based on simple pixel statistics, NOT a real AI model. "
                "Configure HIVE_API_KEY or install transformers/torch for real detection."
            ),
        }

    except Exception as exc:
        logger.error(f"[Fallback] Error: {exc}")
        return {
            "label"     : "UNCERTAIN",
            "confidence": 50.0,
            "modelUsed" : "Error Fallback",
            "note"      : f"All detection tiers failed: {str(exc)}",
        }


# ─────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    label      : str
    confidence : float
    modelUsed  : str
    note       : Optional[str] = None


@app.get("/")
async def root():
    return {
        "service"  : "TruthLens AI Detection Service",
        "status"   : "running",
        "version"  : "2.0.0",
        "cascade"  : ["Hive AI API (Bearer)", f"HuggingFace {HF_MODEL_ID}", "Statistical Fallback"],
        "endpoints": ["/predict", "/health", "/docs"],
    }


@app.get("/health")
async def health():
    hive_configured = (
        bool(os.getenv("HIVE_API_KEY"))
        and os.getenv("HIVE_API_KEY") != "YOUR_HIVE_API_KEY_HERE"
    )
    return {
        "status"             : "ok",
        "hive_api_configured": hive_configured,
        "hf_model_loaded"    : _hf_loaded and _hf_pipeline is not None,
        "hf_model_id"        : HF_MODEL_ID,
        "fallback_available" : True,
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(..., description="Image file to analyse")):
    """
    Main detection endpoint.

    Accepts : multipart/form-data  field: 'file'
    Returns : label, confidence, modelUsed, (optional) note

    Detection cascade:
      Tier 1 → Hive AI API (Bearer auth)
      Tier 2 → HuggingFace dima806/deepfake_vs_real_image_detection
      Tier 3 → Statistical pixel-statistics fallback (demo)
    """
    ALLOWED = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in ALLOWED:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.",
        )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file received.")
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Max 10 MB.")

    logger.info(
        f"[predict] ── New request ──  file={file.filename}  "
        f"size={len(image_bytes)//1024} KB  type={file.content_type}"
    )

    # ── Tier 1: Hive AI ──────────────────────────────────────
    result = await detect_via_hive(image_bytes, file.filename or "image.jpg")
    if result:
        logger.info("[predict] Used Tier 1 (Hive AI API).")

    # ── Tier 2: HuggingFace pipeline ─────────────────────────
    if result is None:
        result = await detect_via_huggingface(image_bytes)
        if result:
            logger.info("[predict] Used Tier 2 (HuggingFace pipeline).")

    # ── Tier 3: Statistical fallback ─────────────────────────
    if result is None:
        result = detect_via_fallback(image_bytes)
        logger.info("[predict] Used Tier 3 (Statistical fallback).")

    logger.info(
        f"[predict] ── FINAL RESULT ──  "
        f"label={result['label']}  confidence={result['confidence']}%  "
        f"model={result['modelUsed']}"
    )
    return PredictionResponse(**result)


# ─────────────────────────────────────────────────────────────
# Startup
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    hive_ok = (
        bool(os.getenv("HIVE_API_KEY"))
        and os.getenv("HIVE_API_KEY") != "YOUR_HIVE_API_KEY_HERE"
    )
    print("\n" + "=" * 54)
    print("  TruthLens AI - Python Detection Service v2")
    print("=" * 54)
    print(f"  Tier 1 Hive  : {'[OK] Configured (Bearer auth)' if hive_ok else '[--] Not configured'}")
    print(f"  Tier 2 HF    : {HF_MODEL_ID}")
    print(f"  Tier 3 Fallb : [OK] Always available")
    print(f"  Docs         : http://localhost:8000/docs")
    print("=" * 54 + "\n")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
