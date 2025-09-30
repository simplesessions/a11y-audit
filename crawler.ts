#!/usr/bin/env bun
/**
 * Website Accessibility Crawler
 * Crawls a website and generates an accessibility report using axe-core and Lighthouse
 *
 * Usage: bun run crawler.ts <url> [options]
 * Options:
 *   --max-pages <number>  Maximum number of pages to crawl (default: 10)
 *   --output <file>       Output file name (default: reports/{hostname}-{datetime}.md)
 */

import { chromium } from "playwright";
import type { Browser, BrowserContext, Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import type { AxeResults } from "axe-core";
import lighthouse from "lighthouse";
import type { Result as LighthouseResult } from "lighthouse";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface PageResult {
  url: string;
  axeResults: AxeResults;
  lighthouseResults: LighthouseResult | null;
  timestamp: string;
}

class AccessibilityCrawler {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private visitedUrls = new Set<string>();
  private baseUrl: string;
  private maxPages: number;
  private results: PageResult[] = [];
  private cdpPort = 9222;

  constructor(startUrl: string, maxPages = 10) {
    this.baseUrl = new URL(startUrl).origin;
    this.maxPages = maxPages;
  }

  async initialize() {
    this.browser = await chromium.launch({
      args: [`--remote-debugging-port=${this.cdpPort}`],
    });
    this.context = await this.browser.newContext();
  }

  async crawl(url: string) {
    if (
      !this.browser ||
      !this.context ||
      this.visitedUrls.size >= this.maxPages
    )
      return;

    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);

    if (
      this.visitedUrls.has(normalizedUrl) ||
      !this.isInternalUrl(normalizedUrl) ||
      !this.isWebPage(normalizedUrl)
    ) {
      return;
    }

    this.visitedUrls.add(normalizedUrl);
    console.log(
      `Crawling: ${normalizedUrl} (${this.visitedUrls.size}/${this.maxPages})`
    );

    try {
      const page = await this.context.newPage();
      await page.goto(normalizedUrl, { waitUntil: "networkidle" });

      // Run axe accessibility tests
      const axeResults = await new AxeBuilder({ page }).analyze();

      // Run Lighthouse accessibility audit
      let lighthouseResults: LighthouseResult | null = null;
      try {
        const lhr = await lighthouse(normalizedUrl, {
          port: this.cdpPort,
          output: "json",
          onlyCategories: ["accessibility"],
          disableStorageReset: true,
        });
        lighthouseResults = lhr?.lhr || null;
      } catch (error) {
        console.error(`Lighthouse error for ${normalizedUrl}:`, error);
      }

      this.results.push({
        url: normalizedUrl,
        axeResults,
        lighthouseResults,
        timestamp: new Date().toISOString(),
      });

      // Find more links to crawl
      if (this.visitedUrls.size < this.maxPages) {
        const links = await this.extractLinks(page);
        await page.close();

        for (const link of links) {
          if (this.visitedUrls.size >= this.maxPages) break;
          await this.crawl(link);
        }
      } else {
        await page.close();
      }
    } catch (error) {
      console.error(`Error crawling ${normalizedUrl}:`, error);
    }
  }

  private async extractLinks(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links
        .map((link) => (link as HTMLAnchorElement).href)
        .filter((href) => href.startsWith("http"));
    });
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = ""; // Remove hash
      return parsed.href;
    } catch {
      return url;
    }
  }

  private isInternalUrl(url: string): boolean {
    try {
      return new URL(url).origin === this.baseUrl;
    } catch {
      return false;
    }
  }

  private isWebPage(url: string): boolean {
    try {
      const pathname = new URL(url).pathname.toLowerCase();
      const fileExtensions = [
        ".pdf",
        ".zip",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".svg",
        ".webp",
        ".ico",
        ".mp4",
        ".avi",
        ".mov",
        ".wmv",
        ".mp3",
        ".wav",
        ".xml",
        ".json",
        ".csv",
        ".txt",
        ".dmg",
        ".exe",
        ".pkg",
        ".deb",
        ".rpm",
      ];
      return !fileExtensions.some((ext) => pathname.endsWith(ext));
    } catch {
      return true;
    }
  }

  generateMarkdownReport(): string {
    let markdown = `# Accessibility Report\n\n`;
    markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
    markdown += `**Pages Analyzed:** ${this.results.length}\n\n`;

    // Summary statistics
    const totalViolations = this.results.reduce(
      (sum, r) => sum + r.axeResults.violations.length,
      0
    );
    const criticalIssues = this.results.reduce(
      (sum, r) =>
        sum +
        r.axeResults.violations.filter((v) => v.impact === "critical").length,
      0
    );
    const seriousIssues = this.results.reduce(
      (sum, r) =>
        sum +
        r.axeResults.violations.filter((v) => v.impact === "serious").length,
      0
    );

    // Lighthouse scores
    const lighthouseScores = this.results
      .filter((r) => r.lighthouseResults)
      .map((r) => r.lighthouseResults!.categories.accessibility.score! * 100);
    const avgLighthouseScore =
      lighthouseScores.length > 0
        ? (
            lighthouseScores.reduce((a, b) => a + b, 0) /
            lighthouseScores.length
          ).toFixed(1)
        : "N/A";

    markdown += `## Summary\n\n`;
    markdown += `### Axe-core Results\n\n`;
    markdown += `- **Total Violations:** ${totalViolations}\n`;
    markdown += `- **Critical Issues:** ${criticalIssues}\n`;
    markdown += `- **Serious Issues:** ${seriousIssues}\n\n`;
    markdown += `### Lighthouse Results\n\n`;
    markdown += `- **Average Accessibility Score:** ${avgLighthouseScore}${
      typeof avgLighthouseScore === "string" && avgLighthouseScore !== "N/A"
        ? "/100"
        : ""
    }\n\n`;

    markdown += `---\n\n`;

    // Per-page results
    for (const pageResult of this.results) {
      markdown += `## Page: ${pageResult.url}\n\n`;
      markdown += `**Analyzed:** ${new Date(
        pageResult.timestamp
      ).toLocaleString()}\n\n`;

      // Lighthouse score
      if (pageResult.lighthouseResults) {
        const score =
          pageResult.lighthouseResults.categories.accessibility.score! * 100;
        const emoji = score >= 90 ? "🟢" : score >= 50 ? "🟡" : "🔴";
        markdown += `### ${emoji} Lighthouse Accessibility Score: ${score.toFixed(
          0
        )}/100\n\n`;

        // Lighthouse audits
        const audits = pageResult.lighthouseResults.audits;
        const failedAudits = Object.values(audits).filter(
          (audit) =>
            audit.score !== null &&
            audit.score < 1 &&
            audit.scoreDisplayMode !== "notApplicable"
        );

        if (failedAudits.length > 0) {
          markdown += `**Lighthouse Issues (${failedAudits.length}):**\n\n`;
          for (const audit of failedAudits) {
            markdown += `- **${audit.title}**\n`;
            if (audit.description) {
              markdown += `  ${audit.description}\n`;
            }
          }
          markdown += `\n`;
        }
      }

      // Axe results
      if (pageResult.axeResults.violations.length === 0) {
        markdown += `### ✅ Axe-core: No violations found!\n\n`;
      } else {
        markdown += `### Axe-core Violations (${pageResult.axeResults.violations.length})\n\n`;

        // Group by impact
        const byImpact = {
          critical: pageResult.axeResults.violations.filter(
            (v) => v.impact === "critical"
          ),
          serious: pageResult.axeResults.violations.filter(
            (v) => v.impact === "serious"
          ),
          moderate: pageResult.axeResults.violations.filter(
            (v) => v.impact === "moderate"
          ),
          minor: pageResult.axeResults.violations.filter(
            (v) => v.impact === "minor"
          ),
        };

        for (const [impact, violations] of Object.entries(byImpact)) {
          if (violations.length === 0) continue;

          const emoji =
            impact === "critical"
              ? "🔴"
              : impact === "serious"
              ? "🟠"
              : impact === "moderate"
              ? "🟡"
              : "🔵";
          markdown += `#### ${emoji} ${impact.toUpperCase()} (${
            violations.length
          })\n\n`;

          for (const violation of violations) {
            markdown += `**${violation.help}**\n\n`;
            markdown += `- **Description:** ${violation.description}\n`;
            markdown += `- **Impact:** ${violation.impact}\n`;
            markdown += `- **Affected Elements:** ${violation.nodes.length}\n`;
            markdown += `- **Learn More:** [${violation.id}](${violation.helpUrl})\n\n`;

            if (violation.nodes.length > 0) {
              markdown += `<details>\n<summary>View affected elements</summary>\n\n`;
              for (let i = 0; i < Math.min(violation.nodes.length, 3); i++) {
                const node = violation.nodes[i];
                if (node) {
                  markdown += `**Element ${i + 1}:**\n\`\`\`html\n${
                    node.html
                  }\n\`\`\`\n`;
                  if (node.failureSummary) {
                    markdown += `${node.failureSummary}\n\n`;
                  }
                }
              }
              if (violation.nodes.length > 3) {
                markdown += `... and ${
                  violation.nodes.length - 3
                } more element(s)\n\n`;
              }
              markdown += `</details>\n\n`;
            }
          }
        }
      }

      markdown += `---\n\n`;
    }

    return markdown;
  }

  async close() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || !args[0] || args[0].startsWith("--")) {
    console.error("Usage: bun run crawler.ts <url> [options]");
    console.error("Options:");
    console.error(
      "  --max-pages <number>  Maximum pages to crawl (default: 10)"
    );
    console.error(
      "  --output <file>       Output file name (default: {hostname}-accessibility-report.md)"
    );
    process.exit(1);
  }

  const startUrl = args[0]!;
  const maxPagesIndex = args.indexOf("--max-pages");
  const maxPages =
    maxPagesIndex !== -1 && args[maxPagesIndex + 1]
      ? parseInt(args[maxPagesIndex + 1]!) || 10
      : 10;

  // Generate default filename from URL with datetime
  const urlHostname = new URL(startUrl).hostname.replace(/\./g, "-");
  const datetime = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const outputIndex = args.indexOf("--output");
  const outputFile =
    outputIndex !== -1 && args[outputIndex + 1]
      ? args[outputIndex + 1]
      : join("reports", `${urlHostname}-${datetime}.md`);

  // Ensure reports directory exists
  try {
    mkdirSync("reports", { recursive: true });
  } catch (e) {
    // Directory might already exist
  }

  console.log("🔍 Starting accessibility crawl...");
  console.log(`URL: ${startUrl}`);
  console.log(`Max pages: ${maxPages}\n`);

  const crawler = new AccessibilityCrawler(startUrl, maxPages);

  try {
    await crawler.initialize();
    await crawler.crawl(startUrl);

    const report = crawler.generateMarkdownReport();
    writeFileSync(outputFile!, report);

    console.log(`\n✅ Report generated: ${outputFile}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await crawler.close();
  }
}

main();
