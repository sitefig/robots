// Shapes of the engine's JSON output that the page reads. The full report
// is described by schema/report.schema.json; these cover the fields used.

export type Level = 'error' | 'warning' | 'info';
export type Verdict = 'open' | 'partial' | 'blocked';
export type Severity = 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';

export interface Issue {
  level: Level;
  kind: string;
  id: string;
  line: number | null;
  message: string;
}

export interface ReportCrawler {
  name: string;
  category: string;
  categoryLabel: string;
  note: string | null;
  groupUsed: string | null;
  verdict: Verdict;
  rootAllowed: boolean;
  allowRules: number;
  disallowRules: number;
  crawlDelay: number | null;
}

export interface AiCrawler {
  name: string;
  verdict: Verdict;
  explanation: string;
}

export interface AiGroup {
  category: string;
  label: string;
  counts: { open: number; partial: number; blocked: number };
  crawlers: AiCrawler[];
}

export interface SecurityFinding {
  path: string;
  line: number;
  userAgents: string[];
  category: string;
  severity: Severity;
  reason: string;
}

export interface Detection {
  name: string;
  kind: string;
  confidence: Confidence;
  evidence: { line: number; text: string }[];
}

export interface Recon {
  stack: { primary: { name: string; kind: string; confidence: Confidence } | null; detections: Detection[] };
  generators: { name: string; url: string | null; line: number; comment: string }[];
  tech: string[];
  cloud: { provider: string; kind: string; host: string; bucket: string | null; line: number; source: string }[];
  hosts: {
    hosts: { host: string; relation: string; env: string | null; sources: { line: number; source: string }[] }[];
    paths: { path: string; line: number; hint: string }[];
  };
  api: { path: string; line: number; kind: string; version: string | null }[];
  data: {
    feeds: { path: string; line: number; kind: string }[];
    portals: { path: string; line: number; kind: string }[];
    search: { paths: { path: string; line: number; kind?: string }[]; params: { name: string; role: string }[] };
  };
  extensions: { ext: string; label: string; risk: string; count: number; examples: { path: string; line: number }[] }[];
  comments: { kind: string; value: string; line: number; comment: string; note: string | null }[];
}

export interface Report {
  raw: string;
  summary: {
    groups: number;
    rules: number;
    sitemaps: number;
    issues: { errors: number; warnings: number; notes: number };
    defaultPolicy: { hasStarGroup: boolean; verdict: Verdict; allowRules: number; disallowRules: number };
  };
  directives: { host: { value: string; line: number } | null; cleanParams: unknown[] };
  rules: { type: 'allow' | 'disallow'; path: string }[];
  sitemaps: { url: string; line: number; valid: boolean }[];
  issues: Issue[];
  crawlers: ReportCrawler[];
  aiStatus: { headline: string; callout: { state: string; text: string }; groups: AiGroup[] };
  security: SecurityFinding[];
  securityCategories: { id: string; label: string; advice: string }[];
  recon: Recon;
}

/** The active crawler list, from Analysis.crawlers(). */
export interface CrawlerList {
  categories: string[];
  browser_ua: string;
  list: { name: string; tokens: string[]; ua: string | null }[];
}

export interface AccessResult {
  allowed: boolean;
  always: boolean;
  specific: boolean;
  token: string | null;
  path: string;
  rule: { type: 'allow' | 'disallow'; path: string; line: number } | null;
  crawlDelay: number | null;
}

export interface Redirect {
  from: string;
  status: number | null;
  to: string;
}

/** What the page fetched, in the shape susbot_core::FetchInfo expects. */
export interface FetchInfo {
  source: string;
  robotsUrl: string;
  finalUrl: string;
  status: number;
  statusText: string | null;
  contentType: string | null;
  bytes: number;
  truncated: boolean;
  redirects: Redirect[];
  redirectLimit: boolean;
  text: string;
}
