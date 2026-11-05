// Shared constant — kept out of any "use client" module so server components
// can import it directly without going through a client-component boundary.
export const SPEC_OPTIONS = [
  { key: "8.5x11", label: "8.5 × 11 in", sub: "US Letter" },
  { key: "8x10", label: "8 × 10 in", sub: "Workbook" },
  { key: "8.5x8.5", label: "8.5 × 8.5 in", sub: "Square" },
  { key: "6x9", label: "6 × 9 in", sub: "Novel / Trade" },
  { key: "5x8", label: "5 × 8 in", sub: "Digest" },
  { key: "5.5x8.5", label: "5.5 × 8.5 in", sub: "Trade paperback" },
  { key: "7x10", label: "7 × 10 in", sub: "Non-fiction" },
  { key: "custom", label: "Custom", sub: "Enter your own" },
] as const;

export interface SpecValue {
  specKey: string;
  customWidthIn: number | null;
  customHeightIn: number | null;
  bleedIn: number;
  marginIn: number;
}

export const DEFAULT_SPEC: SpecValue = { specKey: "6x9", customWidthIn: null, customHeightIn: null, bleedIn: 0.125, marginIn: 0.5 };
