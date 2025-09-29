# a11y audit

An automated website accessibility crawler that analyzes web pages for WCAG compliance issues using [axe-core](https://github.com/dequelabs/axe-core) and Playwright.

## What It Does

This tool crawls a website and generates a comprehensive accessibility report identifying violations, grouped by severity level (critical, serious, moderate, minor). It automatically:

- Crawls multiple pages on a website (configurable limit)
- Runs axe-core accessibility tests on each page
- Identifies WCAG violations with detailed descriptions
- Generates a Markdown report with affected elements and remediation guidance
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
- `--output <file>` - Output file name (default: `{hostname}-accessibility-report.md`)

### Example

```bash
bun run crawler.ts https://www.example.com --max-pages 15
```

This will crawl up to 15 pages on example.com and generate a report named `www-example-com-accessibility-report.md`.

## Output

The generated report includes:

- **Summary Statistics** - Total violations, critical issues, serious issues
- **Per-Page Results** - Detailed violations for each crawled page
- **Severity Levels** - Issues grouped by impact (🔴 Critical, 🟠 Serious, 🟡 Moderate, 🔵 Minor)
- **Remediation Links** - Links to axe-core documentation for fixing each issue
- **Affected Elements** - HTML snippets showing where violations occur

## Technologies

- [Bun](https://bun.com) - Fast JavaScript runtime
- [Playwright](https://playwright.dev) - Browser automation
- [axe-core](https://github.com/dequelabs/axe-core) - Accessibility testing engine
- TypeScript
