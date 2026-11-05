"""
PrintReady PDF Processing Service
----------------------------------
FastAPI microservice responsible for all heavy PDF analysis and report
generation. Designed to run as an internal service that the Next.js
application calls server-to-server (never exposed directly to browsers).
"""
import os
import shutil
import uuid
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from analysis.engine import analyze_pdf, InspectionError
from analysis.report import build_report_pdf
from analysis.specs import STANDARD_SPECS

STORAGE_DIR = os.environ.get("PRINTREADY_STORAGE_DIR", os.path.join(os.path.dirname(__file__), "..", "storage"))
UPLOAD_DIR = os.path.join(STORAGE_DIR, "uploads")
THUMB_DIR = os.path.join(STORAGE_DIR, "thumbnails")
MAX_FILE_SIZE_BYTES = int(os.environ.get("PRINTREADY_MAX_FILE_MB", "75")) * 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)

app = FastAPI(title="PrintReady PDF Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "printready-pdf-service"}


@app.get("/specs")
def specs():
    return STANDARD_SPECS


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """Accepts a PDF, validates it, and stores it under a generated job id.
    Returns the job_id and storage path reference used by subsequent calls."""
    if file.content_type not in ("application/pdf", "application/octet-stream") and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    job_id = str(uuid.uuid4())
    dest_path = os.path.join(UPLOAD_DIR, f"{job_id}.pdf")

    size = 0
    with open(dest_path, "wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                out.close()
                os.remove(dest_path)
                raise HTTPException(status_code=413, detail=f"File exceeds the {MAX_FILE_SIZE_BYTES // (1024*1024)}MB limit.")
            out.write(chunk)

    # basic magic-byte sniff to reject disguised non-PDF uploads
    with open(dest_path, "rb") as f:
        header = f.read(5)
    if header != b"%PDF-":
        os.remove(dest_path)
        raise HTTPException(status_code=400, detail="File does not appear to be a valid PDF (bad header).")

    return {"job_id": job_id, "size_bytes": size, "original_filename": file.filename}


@app.post("/analyze")
def analyze(
    job_id: str = Form(...),
    spec_key: str = Form("6x9"),
    custom_width_in: Optional[float] = Form(None),
    custom_height_in: Optional[float] = Form(None),
    bleed_in: float = Form(0.125),
    margin_in: float = Form(0.5),
):
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.pdf")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Uploaded file not found. Please upload again.")

    thumb_dir = os.path.join(THUMB_DIR, job_id)
    try:
        result = analyze_pdf(
            file_path=file_path,
            spec_key=spec_key,
            custom_width_in=custom_width_in,
            custom_height_in=custom_height_in,
            bleed_in=bleed_in,
            margin_in=margin_in,
            thumbnail_dir=thumb_dir,
            job_id=job_id,
        )
    except InspectionError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Analysis failed unexpectedly: {exc}")

    # Hygiene: the raw uploaded PDF is only needed to produce the analysis
    # result and page thumbnails. Once that's done we delete it immediately
    # rather than retaining the original file indefinitely.
    try:
        os.remove(file_path)
    except OSError:
        pass

    return JSONResponse(result)


@app.post("/cleanup")
def cleanup(max_age_hours: float = 2.0):
    """Removes orphaned uploads (files that were uploaded but never analyzed,
    e.g. the user abandoned the flow) older than max_age_hours. Intended to
    be triggered by a scheduled job (see docs/DEPLOYMENT.md for a Vercel Cron
    example hitting the Next.js /api/cron/cleanup wrapper)."""
    import time as _time
    cutoff = _time.time() - max_age_hours * 3600
    removed = []
    for fname in os.listdir(UPLOAD_DIR):
        fpath = os.path.join(UPLOAD_DIR, fname)
        try:
            if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                os.remove(fpath)
                removed.append(fname)
        except OSError:
            continue
    return {"removed_count": len(removed), "removed": removed}


@app.post("/report")
def report(payload: dict):
    document_name = payload.get("document_name", "document.pdf")
    result = payload.get("result")
    generated_for = payload.get("generated_for")
    if not result:
        raise HTTPException(status_code=400, detail="Missing analysis result payload.")
    pdf_bytes = build_report_pdf(document_name, result, generated_for)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="PrintReady-Report-{document_name}.pdf"'
    })


@app.delete("/job/{job_id}")
def delete_job(job_id: str):
    """Cleans up a job's uploaded file and generated thumbnails (temp file hygiene)."""
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}.pdf")
    thumb_dir = os.path.join(THUMB_DIR, job_id)
    removed = []
    if os.path.exists(file_path):
        os.remove(file_path)
        removed.append("file")
    if os.path.isdir(thumb_dir):
        shutil.rmtree(thumb_dir, ignore_errors=True)
        removed.append("thumbnails")
    return {"removed": removed}
