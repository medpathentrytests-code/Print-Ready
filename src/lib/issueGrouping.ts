import type { IssueRecord } from "./db/types";

export interface GroupedIssue {
  key: string;
  category: string;
  categoryLabel: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  recommendation: string;
  pages: number[];
  count: number;
}

// Groups near-identical issues (same category + title) that repeat across
// many pages into a single, readable card listing the affected pages —
// instead of overwhelming the dashboard with dozens of duplicate rows.
export function groupIssues(issues: IssueRecord[]): GroupedIssue[] {
  const map = new Map<string, GroupedIssue>();
  for (const issue of issues) {
    const key = `${issue.category}:${issue.title}`;
    const existing = map.get(key);
    if (existing) {
      if (issue.page != null && !existing.pages.includes(issue.page)) existing.pages.push(issue.page);
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        category: issue.category,
        categoryLabel: issue.category_label,
        severity: issue.severity,
        title: issue.title,
        explanation: issue.explanation,
        recommendation: issue.recommendation,
        pages: issue.page != null ? [issue.page] : [],
        count: 1,
      });
    }
  }
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return Array.from(map.values()).sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function formatPageList(pages: number[]): string {
  if (pages.length === 0) return "Document-wide";
  const sorted = [...pages].sort((a, b) => a - b);
  if (sorted.length <= 6) return `Page${sorted.length > 1 ? "s" : ""} ${sorted.join(", ")}`;
  // compress into ranges
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const cur = sorted[i];
    if (cur !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = cur;
    }
    prev = cur;
  }
  return `Pages ${ranges.join(", ")}`;
}
