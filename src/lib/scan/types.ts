export interface ScanPageData {
  url: string;
  title: string;
  metaDescription: string | null;
  h1: string | null;
  visibleText: string;
  hasPrice: boolean;
  hasCTA: boolean;
  hasReviews: boolean;
  hasTrustBadges: boolean;
  hasShippingReturns: boolean;
  links: string[];
}

export interface ScanData {
  homepage: ScanPageData;
  pages: ScanPageData[];
  analyzedAt: string;
}

export interface ScoresOutput {
  conversion: number;
  trust: number;
  offer: number;
  performance: number;
  traffic: number;
  confidence: "low" | "medium" | "high";
  explanations?: Record<string, string>;
}

export interface IssueItem {
  id: string;
  priority: "P0" | "P1" | "P2";
  category: "Conversion" | "Trust" | "Offer" | "Performance" | "Traffic";
  title: string;
  why_it_hurts: string;
  evidence?: string[];
  fix_steps: string[];
  example_copy?: string[];
  expected_impact: "low" | "med" | "high";
}

export interface NextBestAction {
  title: string;
  steps: string[];
  example_copy?: string[];
}

export interface IssuesPayload {
  scores: ScoresOutput;
  issues: IssueItem[];
  next_best_action: NextBestAction;
}

export interface SingleAdvicePayload {
  single_advice: {
    title: string;
    why: string;
    how: string;
    example: string;
  };
}
