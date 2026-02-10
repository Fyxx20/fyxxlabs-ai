export type ScoresJson = { [key: string]: number };

export type ResolvedParams = { id: string };

export interface PageParams {
  params: Promise<ResolvedParams>;
}

export interface ScanResultPreview {
  score?: number;
  priority_action?: { title: string; steps?: string[] };
  top_3_issues?: { title: string; impact?: string }[];
  checklist?: { label: string; done: boolean }[];
  confidence?: string;
  limitations?: string[];
}

export interface IssueRow {
  id: string;
  priority?: string;
  category?: string;
  title: string;
  why?: string;
  why_it_hurts?: string;
  fix_steps?: string[];
  example_copy?: string[];
}

export interface IssuesPayload {
  issues?: IssueRow[];
  next_best_action?: { title: string; steps?: string[] };
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface ScanRow {
  free_preview?: boolean;
  result_preview?: ScanResultPreview;
  priority_action?: { title?: string; steps?: string[] };
  mode?: string;
  confidence?: string;
  raw?: { ai?: { status?: string } };
  checklist?: ChecklistItem[];
}

/** Use in page to avoid "as Type" in .tsx (parser ambiguity). */
export function getScores(scan: unknown): ScoresJson {
  const v = (scan as { scores_json?: unknown } | null)?.scores_json as ScoresJson | null | undefined;
  return v ?? {};
}

/** Use in page to avoid "as Type" in .tsx. */
export function getIssuesPayload(scan: unknown): IssuesPayload | null {
  return ((scan as { issues_json?: unknown } | null)?.issues_json as IssuesPayload | null | undefined) ?? null;
}

/** Use in page to avoid "as ScanRow" in .tsx (parser ambiguity). */
export function toScanRow(scan: unknown): ScanRow {
  return scan as ScanRow;
}
