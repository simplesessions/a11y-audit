# a11y audit

An automated website accessibility crawler that analyzes web pages for WCAG compliance issues using [Lighthouse](https://github.com/GoogleChrome/lighthouse), [axe-core](https://github.com/dequelabs/axe-core), and Playwright.

## What It Does

This tool crawls a website and generates a comprehensive accessibility report combining results from both Lighthouse and axe-core. It automatically:

- Crawls multiple pages on a website (configurable limit)
- Runs Lighthouse accessibility audits for scoring and high-level issues
- Runs axe-core accessibility tests for detailed WCAG violations
- Combines results from both tools into a unified report
- Identifies violations grouped by severity level (critical, serious, moderate, minor)
- Generates timestamped Markdown reports with affected elements and remediation guidance
- Finds on average 57% of WCAG issues automatically

## Installation

```bash
bun install
```

## Usage

Basic usage:

```bash
bun run crawler.ts <url>
```

With options:

```bash
bun run crawler.ts https://example.com --max-pages 20 --output custom-report.md
```

### Options

- `--max-pages <number>` - Maximum number of pages to crawl (default: 10)
- `--output <file>` - Output file path (default: `reports/{hostname}-{datetime}.md`)

### Example

```bash
bun run crawler.ts https://www.example.com --max-pages 15
```

This will crawl up to 15 pages on example.com and generate a report in the `reports/` directory with a datetime stamp, e.g., `reports/www-example-com-2025-09-29T23-42-29.md`.

## Output

Reports are saved to the `reports/` directory with datetime stamps to avoid conflicts. Each report includes:

### Summary Section

- **Axe-core Statistics** - Total violations, critical issues, serious issues
- **Lighthouse Score** - Average accessibility score across all pages

### Per-Page Results

- **Lighthouse Accessibility Score** - 0-100 score with color-coded indicators (🟢 90+, 🟡 50-89, 🔴 <50)
- **Lighthouse Issues** - High-level accessibility problems detected
- **Axe-core Violations** - Detailed WCAG violations grouped by severity (🔴 Critical, 🟠 Serious, 🟡 Moderate, 🔵 Minor)
- **Remediation Links** - Links to documentation for fixing each issue
- **Affected Elements** - HTML snippets showing where violations occur

## Technologies

- [Bun](https://bun.com) - Fast JavaScript runtime
- [Playwright](https://playwright.dev) - Browser automation
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) - Google's accessibility auditing tool
- [axe-core](https://github.com/dequelabs/axe-core) - Deque's accessibility testing engine
- TypeScript

## Why Two Tools?

Combining Lighthouse and axe-core provides more comprehensive coverage:

- **Lighthouse** offers a holistic accessibility score and catches performance-related accessibility issues
- **axe-core** provides detailed WCAG violation reports with specific element-level feedback
- Together they catch more issues than either tool alone
