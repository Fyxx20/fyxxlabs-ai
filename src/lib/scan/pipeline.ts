import type { ScanData, ScanPageData } from "./types";
import { fetchHtmlWithPlaywright, fetchMultipleUrls } from "./playwright-fetch";
import { extractPageData, discoverKeyPages } from "./crawler";
import { generateIssuesAndScores, generateTrialSingleAdviceOnly } from "./llm";

export async function runScanPipeline(
  websiteUrl: string,
  goal: string,
  isTrial: boolean
): Promise<{
  scanData: ScanData;
  scoreGlobal: number;
  scoresJson: Record<string, number>;
  issuesJson: unknown;
  trialSingleAdvice: string | null;
  summary: string;
}> {
  const analyzedAt = new Date().toISOString();

  const homepageHtml = await fetchHtmlWithPlaywright(websiteUrl);
  const homepageData = extractPageData(homepageHtml, websiteUrl);
  const homepageWithUrl: ScanPageData = {
    ...homepageData,
    url: websiteUrl,
    links: homepageData.links,
  };

  const keyUrls = discoverKeyPages(homepageData.links, websiteUrl, 5);
  const extraPages = await fetchMultipleUrls(keyUrls);
  const pages: ScanPageData[] = extraPages.map(({ url, html }) => ({
    ...extractPageData(html, url),
    url,
    links: [],
  }));

  const scanData: ScanData = {
    homepage: homepageWithUrl,
    pages,
    analyzedAt,
  };

  let issuesPayload: unknown;
  let trialSingleAdvice: string | null = null;
  let scoresJson: Record<string, number>;

  if (isTrial) {
    const single = await generateTrialSingleAdviceOnly(scanData, goal);
    trialSingleAdvice = [
      single.single_advice.title,
      single.single_advice.why,
      single.single_advice.how,
      single.single_advice.example,
    ].join("\n\n");
    const { payload } = await generateIssuesAndScores(scanData, goal, true);
    scoresJson = {
      conversion: payload.scores.conversion,
      trust: payload.scores.trust,
      offer: payload.scores.offer,
      performance: payload.scores.performance,
      traffic: payload.scores.traffic,
    };
    issuesPayload = {
      scores: payload.scores,
      issues: [],
      next_best_action: payload.next_best_action,
    };
  } else {
    const { payload } = await generateIssuesAndScores(scanData, goal, false);
    scoresJson = {
      conversion: payload.scores.conversion,
      trust: payload.scores.trust,
      offer: payload.scores.offer,
      performance: payload.scores.performance,
      traffic: payload.scores.traffic,
    };
    issuesPayload = payload;
  }

  const weights = { conversion: 0.35, trust: 0.2, offer: 0.15, performance: 0.15, traffic: 0.15 };
  const scoreGlobal =
    Math.round(
      (scoresJson.conversion ?? 0) * weights.conversion +
        (scoresJson.trust ?? 0) * weights.trust +
        (scoresJson.offer ?? 0) * weights.offer +
        (scoresJson.performance ?? 0) * weights.performance +
        (scoresJson.traffic ?? 0) * weights.traffic
    );

  const summary = `Score global ${scoreGlobal}/100. Conversion: ${scoresJson.conversion}, Confiance: ${scoresJson.trust}, Offre: ${scoresJson.offer}, Performance: ${scoresJson.performance}, Trafic: ${scoresJson.traffic}.`;

  return {
    scanData,
    scoreGlobal,
    scoresJson,
    issuesJson: issuesPayload,
    trialSingleAdvice,
    summary,
  };
}
