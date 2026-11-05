"""Print specification definitions and tolerances for PrintReady."""

POINTS_PER_INCH = 72.0

# Standard self-publishing / POD trim sizes (width_in, height_in)
STANDARD_SPECS = {
    "8.5x11": {"label": '8.5 x 11 in (Letter)', "width_in": 8.5, "height_in": 11.0},
    "8x10": {"label": "8 x 10 in", "width_in": 8.0, "height_in": 10.0},
    "8.5x8.5": {"label": "8.5 x 8.5 in (Square)", "width_in": 8.5, "height_in": 8.5},
    "6x9": {"label": "6 x 9 in (Novel)", "width_in": 6.0, "height_in": 9.0},
    "5x8": {"label": "5 x 8 in (Digest)", "width_in": 5.0, "height_in": 8.0},
    "5.5x8.5": {"label": "5.5 x 8.5 in", "width_in": 5.5, "height_in": 8.5},
    "7x10": {"label": "7 x 10 in", "width_in": 7.0, "height_in": 10.0},
    "custom": {"label": "Custom", "width_in": None, "height_in": None},
}

DIMENSION_TOLERANCE_IN = 0.03  # ~2 pt, accounts for rounding
LOW_RES_CRITICAL_DPI = 100
LOW_RES_WARNING_DPI = 150
MIN_SAFE_MARGIN_IN = 0.25
RECOMMENDED_BLEED_IN = 0.125


def inches_to_points(value_in: float) -> float:
    return value_in * POINTS_PER_INCH


def points_to_inches(value_pt: float) -> float:
    return value_pt / POINTS_PER_INCH
