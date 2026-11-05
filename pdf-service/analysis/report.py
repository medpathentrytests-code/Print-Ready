"""Generates the downloadable PrintReady inspection PDF report using ReportLab."""
from __future__ import annotations

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
)

NAVY = colors.HexColor("#0B1220")
INK = colors.HexColor("#1E2A4A")
VIOLET = colors.HexColor("#6C5CE7")
BLUE = colors.HexColor("#3B82F6")
RED = colors.HexColor("#DC2626")
AMBER = colors.HexColor("#D97706")
GREEN = colors.HexColor("#059669")
GRAY = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F1F5F9")

SEVERITY_COLOR = {"critical": RED, "warning": AMBER, "info": BLUE}


def build_report_pdf(document_name: str, result: dict, generated_for: str | None = None) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        topMargin=0.75 * inch, bottomMargin=0.75 * inch,
        leftMargin=0.75 * inch, rightMargin=0.75 * inch,
        title=f"PrintReady Report - {document_name}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleBrand", parent=styles["Title"], textColor=NAVY, fontSize=22, spaceAfter=2)
    sub_style = ParagraphStyle("Sub", parent=styles["Normal"], textColor=GRAY, fontSize=10, spaceAfter=14)
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], textColor=INK, fontSize=13, spaceBefore=16, spaceAfter=8)
    body = ParagraphStyle("Body", parent=styles["Normal"], textColor=INK, fontSize=9.5, leading=13)
    small = ParagraphStyle("Small", parent=styles["Normal"], textColor=GRAY, fontSize=8.5, leading=12)

    story = []
    story.append(Paragraph("PrintReady", ParagraphStyle("Logo", parent=styles["Normal"], textColor=VIOLET, fontSize=14, spaceAfter=4)))
    story.append(Paragraph("PDF Preflight &amp; Quality Inspection Report", title_style))
    story.append(Paragraph(
        f"Generated {datetime.utcnow().strftime('%B %d, %Y %H:%M UTC')}"
        + (f" for {generated_for}" if generated_for else ""), sub_style))
    story.append(HRFlowable(width="100%", color=LIGHT, thickness=1.2, spaceAfter=14))

    meta_table = Table([
        ["Document", document_name],
        ["Print specification", result.get("spec_label") or "—"],
        ["Pages inspected", str(result.get("page_count", 0))],
        ["Bleed configured", f"{result.get('bleed_in')} in" if result.get("bleed_in") is not None else "—"],
        ["Safe margin configured", f"{result.get('margin_in')} in" if result.get("margin_in") is not None else "—"],
    ], colWidths=[1.8 * inch, 4.2 * inch])
    meta_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("TEXTCOLOR", (0, 0), (0, -1), GRAY),
        ("TEXTCOLOR", (1, 0), (1, -1), INK),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LIGHT),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 16))

    score = result.get("score", 0)
    score_color = GREEN if score >= 85 else AMBER if score >= 60 else RED
    story.append(Paragraph("Overall Quality Score", h2))
    score_table = Table([[f"{score}/100", f"{result.get('critical_count',0)} critical",
                           f"{result.get('warning_count',0)} warnings",
                           f"{result.get('passed_checks',0)}/{result.get('total_checks',10)} checks passed"]],
                         colWidths=[1.3 * inch, 1.6 * inch, 1.6 * inch, 1.9 * inch])
    score_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (0, 0), 20),
        ("FONTSIZE", (1, 0), (-1, 0), 9.5),
        ("TEXTCOLOR", (0, 0), (0, 0), score_color),
        ("TEXTCOLOR", (1, 0), (1, 0), RED),
        ("TEXTCOLOR", (2, 0), (2, 0), AMBER),
        ("TEXTCOLOR", (3, 0), (3, 0), GREEN),
        ("FONTNAME", (0, 0), (0, 0), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (0, 0), 14),
    ]))
    story.append(score_table)

    issues = result.get("issues", [])
    critical = [i for i in issues if i["severity"] == "critical"]
    warnings = [i for i in issues if i["severity"] == "warning"]
    infos = [i for i in issues if i["severity"] == "info"]

    def render_section(title, items, color):
        if not items:
            return
        story.append(Paragraph(title, h2))
        rows = [["Page", "Issue", "Explanation & Recommended Fix"]]
        for it in items:
            page_label = str(it["page"]) if it.get("page") else "Doc"
            desc = f"<b>{it['title']}</b><br/>{it['explanation']}<br/><font color='#059669'>Fix: {it['recommendation']}</font>"
            rows.append([page_label, it["category_label"], Paragraph(desc, small)])
        t = Table(rows, colWidths=[0.5 * inch, 1.3 * inch, 4.2 * inch], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), color),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8.5),
            ("GRID", (0, 0), (-1, -1), 0.5, LIGHT),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ]))
        story.append(t)
        story.append(Spacer(1, 10))

    render_section(f"Critical Issues ({len(critical)})", critical, RED)
    render_section(f"Warnings ({len(warnings)})", warnings, AMBER)
    render_section(f"Informational Notes ({len(infos)})", infos, BLUE)

    if not issues:
        story.append(Paragraph("No issues detected. This document passed every automated check.", body))

    story.append(Spacer(1, 18))
    story.append(HRFlowable(width="100%", color=LIGHT, thickness=1))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This report is generated by automated analysis and is intended to help identify common print-readiness "
        "issues. It does not guarantee acceptance by any specific printer or publishing platform, and is not "
        "affiliated with or certified by Amazon KDP or any other print-on-demand service. Always review a physical "
        "proof before a full print run.", small))
    story.append(Paragraph("Generated by PrintReady — printready.app", small))

    doc.build(story)
    return buf.getvalue()
