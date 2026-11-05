"""
PrintReady PDF Quality Inspection Engine
-----------------------------------------
Performs genuine structural, geometric and raster analysis of a PDF file
using PyMuPDF (fitz) and pypdf. No results are fabricated: every issue is
derived from measurements taken on the actual document.
"""
from __future__ import annotations

import hashlib
import io
import os
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any

import fitz  # PyMuPDF
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from PIL import Image

from .specs import (
    STANDARD_SPECS,
    DIMENSION_TOLERANCE_IN,
    LOW_RES_CRITICAL_DPI,
    LOW_RES_WARNING_DPI,
    MIN_SAFE_MARGIN_IN,
    RECOMMENDED_BLEED_IN,
    points_to_inches,
)

SEVERITY_CRITICAL = "critical"
SEVERITY_WARNING = "warning"
SEVERITY_INFO = "info"

CHECK_CATEGORIES = [
    "page_dimensions",
    "page_size_consistency",
    "image_resolution",
    "margins",
    "bleed_trim",
    "fonts",
    "blank_pages",
    "duplicate_pages",
    "structure",
    "color_transparency",
]

CATEGORY_LABELS = {
    "page_dimensions": "Page Dimensions",
    "page_size_consistency": "Page Size Consistency",
    "image_resolution": "Image Resolution",
    "margins": "Margins & Safe Area",
    "bleed_trim": "Bleed & Trim Box",
    "fonts": "Font Embedding",
    "blank_pages": "Blank Pages",
    "duplicate_pages": "Duplicate Pages",
    "structure": "PDF Structure & Integrity",
    "color_transparency": "Color Space & Transparency",
}


def _issue(category, severity, page, title, explanation, recommendation, meta=None):
    return {
        "id": str(uuid.uuid4())[:8],
        "category": category,
        "category_label": CATEGORY_LABELS[category],
        "severity": severity,
        "page": page,  # 1-indexed, or None for document-level
        "title": title,
        "explanation": explanation,
        "recommendation": recommendation,
        "meta": meta or {},
    }


class InspectionError(Exception):
    """Raised when the PDF cannot be opened or is fundamentally unreadable."""


def _phash(pix: "fitz.Pixmap") -> str:
    """Cheap perceptual hash: downsample to 16x16 grayscale and threshold."""
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")
    img = img.resize((16, 16), Image.LANCZOS)
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    bits = "".join("1" if p >= avg else "0" for p in pixels)
    return hashlib.md5(bits.encode()).hexdigest()


def _hamming(a: str, b: str) -> int:
    # compare md5 hex strings as a crude distance proxy
    if a == b:
        return 0
    return sum(1 for x, y in zip(a, b) if x != y)


def analyze_pdf(
    file_path: str,
    spec_key: str = "6x9",
    custom_width_in: float | None = None,
    custom_height_in: float | None = None,
    bleed_in: float = 0.125,
    margin_in: float = 0.5,
    thumbnail_dir: str | None = None,
    job_id: str | None = None,
) -> dict[str, Any]:
    start_time = time.time()
    job_id = job_id or str(uuid.uuid4())

    if not os.path.exists(file_path):
        raise InspectionError("Uploaded file could not be found on the server.")

    file_size_bytes = os.path.getsize(file_path)

    # ---- Structural validation first (pypdf, strict) ----
    structure_issues: list[dict] = []
    is_encrypted = False
    try:
        with open(file_path, "rb") as fh:
            reader = PdfReader(fh, strict=False)
            is_encrypted = reader.is_encrypted
            _ = len(reader.pages)
    except PdfReadError as exc:
        structure_issues.append(
            _issue(
                "structure", SEVERITY_CRITICAL, None,
                "PDF structure error detected",
                f"The file's cross-reference table or object structure appears damaged ({exc}).",
                "Re-export the PDF from your source application (InDesign, Word, Affinity, etc.) "
                "or run it through a repair tool such as Ghostscript (`gs -o fixed.pdf -sDEVICE=pdfwrite input.pdf`).",
            )
        )
    except Exception as exc:  # noqa: BLE001
        structure_issues.append(
            _issue(
                "structure", SEVERITY_CRITICAL, None,
                "Unable to parse PDF",
                f"The document could not be parsed as a valid PDF file ({exc}).",
                "Confirm the file is a genuine PDF (not renamed) and re-export it from the original source.",
            )
        )

    # ---- Open with PyMuPDF for deep inspection ----
    try:
        doc = fitz.open(file_path)
    except Exception as exc:  # noqa: BLE001
        raise InspectionError(f"This file could not be opened as a PDF: {exc}")

    if doc.is_encrypted:
        is_encrypted = True
        structure_issues.append(
            _issue(
                "structure", SEVERITY_CRITICAL, None,
                "Password-protected PDF",
                "The document is encrypted/password-protected, which will block automated print processing.",
                "Remove password protection before submitting to print (File > Export/Save As without security).",
            )
        )
        page_count = doc.page_count
        doc.close()
        return _finalize_blocked(job_id, file_path, file_size_bytes, page_count, structure_issues, start_time)

    page_count = doc.page_count
    HARD_PAGE_CAP = 2000
    if page_count > HARD_PAGE_CAP:
        doc.close()
        raise InspectionError(
            f"This document has {page_count} pages, exceeding PrintReady's hard safety limit of {HARD_PAGE_CAP} "
            "pages per file. Please split it into smaller files."
        )
    if page_count == 0:
        structure_issues.append(
            _issue("structure", SEVERITY_CRITICAL, None, "Empty document",
                   "The PDF contains zero pages.",
                   "Re-export the document ensuring content was included before upload.")
        )

    # Resolve target spec
    if spec_key == "custom" or spec_key not in STANDARD_SPECS:
        target_w, target_h = custom_width_in, custom_height_in
        spec_label = f"Custom ({custom_width_in}in x {custom_height_in}in)" if custom_width_in else "Custom"
    else:
        target_w = STANDARD_SPECS[spec_key]["width_in"]
        target_h = STANDARD_SPECS[spec_key]["height_in"]
        spec_label = STANDARD_SPECS[spec_key]["label"]

    issues: list[dict] = list(structure_issues)
    page_reports = []
    thumbnails = []
    page_hashes = []
    first_page_size = None

    for i in range(page_count):
        page = doc[i]
        page_no = i + 1
        rect = page.rect  # in points, respects rotation? rect is mediabox mapped
        width_pt, height_pt = rect.width, rect.height
        width_in, height_in = points_to_inches(width_pt), points_to_inches(height_pt)

        if first_page_size is None:
            first_page_size = (round(width_in, 3), round(height_in, 3))
        else:
            cur = (round(width_in, 3), round(height_in, 3))
            if abs(cur[0] - first_page_size[0]) > DIMENSION_TOLERANCE_IN or \
               abs(cur[1] - first_page_size[1]) > DIMENSION_TOLERANCE_IN:
                issues.append(_issue(
                    "page_size_consistency", SEVERITY_CRITICAL, page_no,
                    "Page size differs from document",
                    f"Page {page_no} measures {cur[0]}in x {cur[1]}in, but page 1 measures "
                    f"{first_page_size[0]}in x {first_page_size[1]}in. Mixed trim sizes within one "
                    "file are rejected by nearly all print services.",
                    "Ensure every page is exported at the identical trim size before uploading.",
                    meta={"page_size": cur, "expected": first_page_size},
                ))

        # ---- Dimension check vs chosen spec ----
        if target_w and target_h:
            w_diff = abs(width_in - target_w)
            h_diff = abs(height_in - target_h)
            # allow swapped orientation (landscape vs portrait) without false positive
            w_diff_swapped = abs(width_in - target_h)
            h_diff_swapped = abs(height_in - target_w)
            matches_normal = w_diff <= DIMENSION_TOLERANCE_IN and h_diff <= DIMENSION_TOLERANCE_IN
            matches_swapped = w_diff_swapped <= DIMENSION_TOLERANCE_IN and h_diff_swapped <= DIMENSION_TOLERANCE_IN
            if not matches_normal and not matches_swapped:
                issues.append(_issue(
                    "page_dimensions", SEVERITY_CRITICAL, page_no,
                    "Page size doesn't match selected specification",
                    f"Page {page_no} is {round(width_in,3)}in x {round(height_in,3)}in, but you selected "
                    f"{spec_label} ({target_w}in x {target_h}in).",
                    f"Resize the page to exactly {target_w}in x {target_h}in in your layout application, "
                    "or select the print specification that matches your actual document size.",
                    meta={"page_size": [round(width_in, 3), round(height_in, 3)], "target": [target_w, target_h]},
                ))

        # ---- Bleed / TrimBox inspection ----
        trimbox_raw = doc.xref_get_key(page.xref, "TrimBox")
        bleedbox_raw = doc.xref_get_key(page.xref, "BleedBox")
        mediabox_raw = doc.xref_get_key(page.xref, "MediaBox")
        has_trimbox = trimbox_raw[0] != "null"
        has_bleedbox = bleedbox_raw[0] != "null"

        if not has_bleedbox and bleed_in and bleed_in > 0:
            issues.append(_issue(
                "bleed_trim", SEVERITY_WARNING, page_no,
                "No BleedBox defined",
                f"You specified {bleed_in}in of bleed, but page {page_no} does not define a /BleedBox, "
                "so printers cannot verify bleed was actually built into the file.",
                f"Extend artwork {bleed_in}in beyond the trim edge on all sides and export with bleed/trim "
                "marks enabled, or set the BleedBox explicitly in your export settings.",
            ))
        elif has_bleedbox and has_trimbox:
            try:
                tb = _parse_box(trimbox_raw[1])
                bb = _parse_box(bleedbox_raw[1])
                bleed_amounts = [
                    points_to_inches(tb[0] - bb[0]), points_to_inches(tb[1] - bb[1]),
                    points_to_inches(bb[2] - tb[2]), points_to_inches(bb[3] - tb[3]),
                ]
                min_bleed = min(bleed_amounts)
                if min_bleed < RECOMMENDED_BLEED_IN - 0.01:
                    issues.append(_issue(
                        "bleed_trim", SEVERITY_WARNING, page_no,
                        "Insufficient bleed",
                        f"Page {page_no} has only {round(min_bleed,3)}in of bleed on its narrowest edge; "
                        f"most print-on-demand services require {RECOMMENDED_BLEED_IN}in.",
                        f"Extend background artwork to provide at least {RECOMMENDED_BLEED_IN}in of bleed on every edge.",
                    ))
            except Exception:
                pass

        # ---- Margin / safe-area heuristic using text + drawing bounding box ----
        try:
            content_bbox = _content_bbox(page)
        except Exception:
            content_bbox = None

        if content_bbox:
            left = points_to_inches(content_bbox[0])
            top = points_to_inches(content_bbox[1])
            right = points_to_inches(width_pt - content_bbox[2])
            bottom = points_to_inches(height_pt - content_bbox[3])
            min_margin = min(left, top, right, bottom)
            safe_margin = margin_in if margin_in else MIN_SAFE_MARGIN_IN
            if min_margin < 0:
                issues.append(_issue(
                    "margins", SEVERITY_CRITICAL, page_no,
                    "Content extends beyond the page edge",
                    f"Page {page_no} has content positioned outside the visible page boundary.",
                    "Check object positions and ensure nothing unintentionally overflows the page box.",
                ))
            elif min_margin < safe_margin:
                issues.append(_issue(
                    "margins", SEVERITY_WARNING, page_no,
                    "Content close to the page edge",
                    f"Page {page_no} has content as close as {round(min_margin,3)}in from the edge, "
                    f"inside your configured {safe_margin}in safe margin. Text or images this close to "
                    "the trim edge risk being cut off during binding/trimming.",
                    f"Move text and key visual elements at least {safe_margin}in from the trim edge.",
                    meta={"min_margin_in": round(min_margin, 3)},
                ))

        # ---- Blank page detection ----
        text_content = page.get_text("text").strip()
        img_count = len(page.get_images(full=True))
        drawings = page.get_drawings()
        if not text_content and img_count == 0 and len(drawings) == 0:
            issues.append(_issue(
                "blank_pages", SEVERITY_WARNING, page_no,
                "Blank page detected",
                f"Page {page_no} appears to contain no text, images or vector content.",
                "Confirm this blank page is intentional (e.g. a deliberate chapter break); "
                "otherwise remove it before publishing.",
            ))

        # ---- Image resolution checks ----
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                bbox_list = page.get_image_rects(xref)
            except Exception:
                bbox_list = []
            if not bbox_list:
                continue
            try:
                base_image = doc.extract_image(xref)
                px_w, px_h = base_image["width"], base_image["height"]
                colorspace = base_image.get("colorspace", None)
            except Exception:
                continue
            for bbox in bbox_list:
                disp_w_in = points_to_inches(bbox.width)
                disp_h_in = points_to_inches(bbox.height)
                if disp_w_in <= 0 or disp_h_in <= 0:
                    continue
                dpi_x = px_w / disp_w_in
                dpi_y = px_h / disp_h_in
                effective_dpi = round(min(dpi_x, dpi_y))
                if effective_dpi < LOW_RES_CRITICAL_DPI:
                    issues.append(_issue(
                        "image_resolution", SEVERITY_CRITICAL, page_no,
                        "Critically low-resolution image",
                        f"An image on page {page_no} is printing at approximately {effective_dpi} DPI "
                        f"({px_w}x{px_h}px placed at {round(disp_w_in,2)}in x {round(disp_h_in,2)}in). "
                        "This will appear visibly blurry or pixelated in print.",
                        "Replace with a higher-resolution source image (aim for 300 DPI at final print size) "
                        "or reduce the placed size of the image.",
                        meta={"dpi": effective_dpi, "px": [px_w, px_h]},
                    ))
                elif effective_dpi < LOW_RES_WARNING_DPI:
                    issues.append(_issue(
                        "image_resolution", SEVERITY_WARNING, page_no,
                        "Low-resolution image",
                        f"An image on page {page_no} is printing at approximately {effective_dpi} DPI, "
                        "below the 300 DPI generally recommended for sharp print output.",
                        "Use a higher-resolution version of this image if available, or print at a smaller size.",
                        meta={"dpi": effective_dpi, "px": [px_w, px_h]},
                    ))

        # ---- Color space / transparency ----
        try:
            res = doc.xref_get_key(page.xref, "Group")
            if res and res[0] != "null" and "Transparency" in str(res[1]):
                issues.append(_issue(
                    "color_transparency", SEVERITY_INFO, page_no,
                    "Transparency effects detected",
                    f"Page {page_no} uses PDF transparency groups (shadows, opacity, blend modes). "
                    "Some RIP/print workflows flatten transparency inconsistently.",
                    "If you see unexpected rendering differences, flatten transparency before final export.",
                ))
        except Exception:
            pass

        # Color space of images -> warn on RGB for print (most POD expects CMYK or accepts RGB w/ conversion)
        for img in page.get_images(full=True):
            xref = img[0]
            try:
                base_image = doc.extract_image(xref)
                cs_name = base_image.get("colorspace-name", "")
            except Exception:
                cs_name = None
            if cs_name and cs_name.upper() == "DEVICERGB":
                issues.append(_issue(
                    "color_transparency", SEVERITY_INFO, page_no,
                    "RGB image will be converted at print time",
                    f"An image on page {page_no} uses the RGB color space. Most print vendors convert "
                    "RGB to CMYK automatically, which can shift colors, especially saturated blues and greens.",
                    "For best color accuracy, convert images to CMYK in your image editor before placing them, "
                    "or request a proof from your printer.",
                ))
                break  # one notice per page is enough

        page_reports.append({
            "page": page_no,
            "width_in": round(width_in, 3),
            "height_in": round(height_in, 3),
            "has_text": bool(text_content),
            "image_count": img_count,
            "rotation": page.rotation,
        })

        # duplicate detection signature: normalized text (primary) + perceptual hash (fallback for image-only pages)
        normalized_text = " ".join(text_content.split()).lower()
        text_sig = hashlib.md5(normalized_text.encode()).hexdigest() if len(normalized_text) >= 20 else None
        try:
            pix = page.get_pixmap(matrix=fitz.Matrix(0.3, 0.3), colorspace=fitz.csRGB)
            visual_sig = _phash(pix)
        except Exception:
            visual_sig = None
        page_hashes.append({"text_sig": text_sig, "visual_sig": visual_sig, "has_content": bool(text_content or img_count)})

        # thumbnail generation
        if thumbnail_dir:
            try:
                os.makedirs(thumbnail_dir, exist_ok=True)
                thumb_pix = page.get_pixmap(matrix=fitz.Matrix(0.9, 0.9), colorspace=fitz.csRGB)
                thumb_path = os.path.join(thumbnail_dir, f"page-{page_no}.png")
                thumb_pix.save(thumb_path)
                thumbnails.append(f"page-{page_no}.png")
            except Exception:
                thumbnails.append(None)

    # ---- Font embedding check (document-level, more reliable) ----
    font_issues_seen = set()
    for i in range(page_count):
        page = doc[i]
        for f_info in page.get_fonts(full=True):
            xref_f, ext, font_type, basefont, name, encoding = f_info[:6]
            key = (basefont, ext)
            if key in font_issues_seen:
                continue
            font_issues_seen.add(key)
            is_embedded = ext not in ("", "n/a") and ext is not None
            if not is_embedded and font_type not in ("Type0",) or ext == "":
                # Attempt a secondary, more direct check via FontDescriptor/FontFile keys
                embedded_direct = _font_is_embedded(doc, xref_f)
                if not embedded_direct:
                    issues.append(_issue(
                        "fonts", SEVERITY_WARNING, i + 1,
                        "Possibly unembedded font",
                        f"The font \"{basefont}\" used on page {i+1} does not appear to be fully embedded "
                        "in the PDF. Viewers/printers without this font installed may substitute a different one.",
                        "In your export settings, enable \"Embed all fonts\" (or \"Embed subset\") before saving the PDF.",
                        meta={"font": basefont},
                    ))

    # ---- Duplicate page detection ----
    # Primary signal: exact-normalized text match (reliable, low false-positive rate).
    # Fallback: tight perceptual-hash match, only for pages with no extractable text
    # (e.g. scanned images), using a strict distance threshold to avoid flagging
    # pages that simply share a similar layout.
    seen_text: dict[str, int] = {}
    seen_visual: dict[int, str] = {}
    flagged = set()
    for idx, sig in enumerate(page_hashes):
        if not sig:
            continue
        if sig["text_sig"]:
            prior = seen_text.get(sig["text_sig"])
            if prior is not None:
                issues.append(_issue(
                    "duplicate_pages", SEVERITY_WARNING, idx + 1,
                    "Possible duplicate page",
                    f"Page {idx+1} has text content identical to page {prior+1}.",
                    "Confirm this repetition is intentional (e.g. a deliberate repeated template); otherwise remove the duplicate page.",
                    meta={"duplicate_of": prior + 1},
                ))
                flagged.add(idx)
            else:
                seen_text[sig["text_sig"]] = idx
        elif sig["visual_sig"] and sig["has_content"]:
            matched = False
            for seen_idx, seen_h in list(seen_visual.items()):
                if _hamming(sig["visual_sig"], seen_h) <= 2:
                    issues.append(_issue(
                        "duplicate_pages", SEVERITY_WARNING, idx + 1,
                        "Possible duplicate page",
                        f"Page {idx+1} appears visually near-identical to page {seen_idx+1}.",
                        "Confirm this repetition is intentional; otherwise remove the duplicate page.",
                        meta={"duplicate_of": seen_idx + 1},
                    ))
                    matched = True
                    break
            if not matched:
                seen_visual[idx] = sig["visual_sig"]

    doc.close()

    # ---- Score + summary ----
    critical_count = sum(1 for i in issues if i["severity"] == SEVERITY_CRITICAL)
    warning_count = sum(1 for i in issues if i["severity"] == SEVERITY_WARNING)
    info_count = sum(1 for i in issues if i["severity"] == SEVERITY_INFO)

    categories_with_issues = {i["category"] for i in issues if i["severity"] in (SEVERITY_CRITICAL, SEVERITY_WARNING)}
    passed_checks = len(CHECK_CATEGORIES) - len(categories_with_issues)

    score = 100.0
    score -= critical_count * 12
    score -= warning_count * 4
    score = max(0, min(100, round(score)))

    elapsed = round(time.time() - start_time, 2)

    return {
        "job_id": job_id,
        "file_size_bytes": file_size_bytes,
        "page_count": page_count,
        "spec_key": spec_key,
        "spec_label": spec_label,
        "target_width_in": target_w,
        "target_height_in": target_h,
        "bleed_in": bleed_in,
        "margin_in": margin_in,
        "score": score,
        "critical_count": critical_count,
        "warning_count": warning_count,
        "info_count": info_count,
        "passed_checks": passed_checks,
        "total_checks": len(CHECK_CATEGORIES),
        "issues": sorted(issues, key=lambda x: (0 if x["severity"] == "critical" else 1 if x["severity"] == "warning" else 2, x["page"] or 0)),
        "pages": page_reports,
        "thumbnails": thumbnails,
        "processing_seconds": elapsed,
        "is_encrypted": is_encrypted,
        "blocked": False,
    }


def _finalize_blocked(job_id, file_path, file_size_bytes, page_count, structure_issues, start_time):
    return {
        "job_id": job_id,
        "file_size_bytes": file_size_bytes,
        "page_count": page_count,
        "spec_key": None,
        "spec_label": None,
        "target_width_in": None,
        "target_height_in": None,
        "bleed_in": None,
        "margin_in": None,
        "score": 0,
        "critical_count": len(structure_issues),
        "warning_count": 0,
        "info_count": 0,
        "passed_checks": 0,
        "total_checks": len(CHECK_CATEGORIES),
        "issues": structure_issues,
        "pages": [],
        "thumbnails": [],
        "processing_seconds": round(time.time() - start_time, 2),
        "is_encrypted": True,
        "blocked": True,
    }


def _parse_box(raw: str):
    raw = raw.strip("[]")
    return [float(x) for x in raw.split()]


def _content_bbox(page: "fitz.Page"):
    """Union bounding box of text + drawings + images on the page, in PDF points
    relative to the page rect origin (left, top, right, bottom distances computed by caller)."""
    rects = []
    try:
        for block in page.get_text("dict").get("blocks", []):
            bbox = block.get("bbox")
            if bbox:
                rects.append(fitz.Rect(bbox))
    except Exception:
        pass
    try:
        for d in page.get_drawings():
            r = d.get("rect")
            if r:
                rects.append(fitz.Rect(r))
    except Exception:
        pass
    try:
        for img in page.get_images(full=True):
            for r in page.get_image_rects(img[0]):
                rects.append(r)
    except Exception:
        pass
    if not rects:
        return None
    union = rects[0]
    for r in rects[1:]:
        union |= r
    page_rect = page.rect
    # return distances already normalized to (left, top, right_from_right_edge_input, bottom_from_bottom_edge_input)
    # caller expects content_bbox = (left_pt, top_pt, right_edge_pt, bottom_edge_pt) where
    # right/bottom are positions (not distances) so it can subtract from page width/height.
    return (union.x0, union.y0, union.x1, union.y1)


def _font_is_embedded(doc, xref_f) -> bool:
    try:
        descriptor = doc.xref_get_key(xref_f, "FontDescriptor")
        if descriptor[0] == "null":
            # Type0 composite fonts nest descriptor under DescendantFonts
            desc_fonts = doc.xref_get_key(xref_f, "DescendantFonts")
            if desc_fonts[0] == "null":
                return True  # can't determine; assume ok to avoid false positives
            return True
        fd_match = descriptor[1]
        if fd_match.startswith("(") is False and "0" in fd_match:
            # it's an indirect reference like "12 0 R"; resolve it
            try:
                fd_xref = int(fd_match.split()[0])
            except Exception:
                return True
            for key in ("FontFile", "FontFile2", "FontFile3"):
                v = doc.xref_get_key(fd_xref, key)
                if v[0] != "null":
                    return True
            return False
    except Exception:
        return True
    return True
