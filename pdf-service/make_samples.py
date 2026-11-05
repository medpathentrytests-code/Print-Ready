"""Generates realistic sample PDFs used for QA testing, demos, and the
acquisition sample-files package. Produces a mix of clean and flawed files."""
import os
import io
from reportlab.lib.pagesizes import inch
from reportlab.pdfgen import canvas
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "storage", "samples")
os.makedirs(OUT, exist_ok=True)


def make_low_res_image(path, px=(150, 150), color=(120, 140, 230)):
    img = Image.new("RGB", px, color)
    img.save(path)


def clean_6x9(path):
    c = canvas.Canvas(path, pagesize=(6 * inch, 9 * inch))
    for i in range(1, 11):
        c.setFont("Helvetica", 11)
        c.drawString(0.75 * inch, 8.25 * inch, f"Chapter sample — Page {i}")
        c.setFont("Helvetica", 9)
        for line in range(20):
            c.drawString(0.75 * inch, (7.8 - line * 0.32) * inch,
                         "The quick brown fox jumps over the lazy dog. " * 1)
        c.showPage()
    c.save()


def flawed_manuscript(path):
    """A manuscript with multiple intentional, detectable problems used for QA."""
    c = canvas.Canvas(path, pagesize=(6 * inch, 9 * inch))

    # Page 1: normal
    c.setFont("Helvetica", 11)
    c.drawString(0.75 * inch, 8.25 * inch, "Chapter One")
    c.setFont("Helvetica", 9)
    for line in range(18):
        c.drawString(0.75 * inch, (7.8 - line * 0.32) * inch, "Sample body text for preflight testing purposes.")
    c.showPage()

    # Page 2: text too close to the edge (margin warning)
    c.setFont("Helvetica", 9)
    c.drawString(0.05 * inch, 8.9 * inch, "This text sits dangerously close to the trim edge of the page.")
    c.drawString(0.75 * inch, 4 * inch, "Body content for page two of the manuscript.")
    c.showPage()

    # Page 3: blank page
    c.showPage()

    # Page 4: duplicate of page 1
    c.setFont("Helvetica", 11)
    c.drawString(0.75 * inch, 8.25 * inch, "Chapter One")
    c.setFont("Helvetica", 9)
    for line in range(18):
        c.drawString(0.75 * inch, (7.8 - line * 0.32) * inch, "Sample body text for preflight testing purposes.")
    c.showPage()

    # Page 5: low-res image
    tmp_img = os.path.join(OUT, "_tmp_lowres.jpg")
    make_low_res_image(tmp_img, px=(120, 160))
    c.drawImage(tmp_img, 0.75 * inch, 3 * inch, width=4.5 * inch, height=5.5 * inch)
    c.showPage()

    # Page 6: wrong page size (letter instead of 6x9) — new canvas page size
    c.showPage()
    c.save()

    if os.path.exists(tmp_img):
        os.remove(tmp_img)


def wrong_size_page(path):
    """A document where one page has a different trim size than the rest (page-size consistency)."""
    from reportlab.pdfgen import canvas as cv
    c = cv.Canvas(path, pagesize=(6 * inch, 9 * inch))
    c.setFont("Helvetica", 10)
    c.drawString(0.75 * inch, 8 * inch, "Page 1 - correct 6x9 trim size")
    c.showPage()

    c.setPageSize((8.5 * inch, 11 * inch))
    c.setFont("Helvetica", 10)
    c.drawString(0.75 * inch, 10 * inch, "Page 2 - accidentally exported at Letter size")
    c.showPage()

    c.setPageSize((6 * inch, 9 * inch))
    c.setFont("Helvetica", 10)
    c.drawString(0.75 * inch, 8 * inch, "Page 3 - back to correct 6x9 trim size")
    c.showPage()
    c.save()


if __name__ == "__main__":
    clean_6x9(os.path.join(OUT, "clean-manuscript-6x9.pdf"))
    flawed_manuscript(os.path.join(OUT, "flawed-manuscript-sample.pdf"))
    wrong_size_page(os.path.join(OUT, "inconsistent-page-sizes-sample.pdf"))
    print("Sample PDFs generated in", OUT)
