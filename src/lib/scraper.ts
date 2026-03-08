import { DEFAULT_HEADERS, FETCH_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS } from "../config";

// ─── In-memory cache & dedup ──────────────────────────────────────────────────

const pageCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

// ─── Tiny delay helper ────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── fetchPage ────────────────────────────────────────────────────────────────

/**
 * Fetch the HTML string for a URL with retry + in-memory cache.
 */
export async function fetchPage(url: string): Promise<string> {
  // Normalise double-slashes (except protocol)
  url = url.replace(/(?<!:)\/\//g, "/");

  if (pageCache.has(url)) return pageCache.get(url)!;
  if (inFlight.has(url)) return inFlight.get(url)!;

  const promise = (async (): Promise<string> => {
    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const res = await fetch(url, {
          headers: DEFAULT_HEADERS,
          redirect: "follow",
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
        }

        const html = await res.text();
        pageCache.set(url, html);
        return html;
      } catch (err) {
        lastErr = err as Error;
        if (attempt < MAX_RETRIES) await delay(RETRY_DELAY_MS * attempt);
      }
    }

    throw new Error(
      `fetchPage failed after ${MAX_RETRIES} attempts: ${lastErr?.message}`
    );
  })();

  inFlight.set(url, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(url);
  }
}

// ─── HtmlDoc — zero-dependency HTML query helper ──────────────────────────────

/**
 * Minimal DOM-less HTML scraper that uses regex-based selectors.
 * Supports:  tag,  tag[attr],  tag[attr="val"],  #id,  .class
 * No external parser needed — works on Vercel Edge.
 */
export class HtmlDoc {
  private html: string;

  constructor(html: string) {
    this.html = html;
  }

  // ── Low-level helpers ──────────────────────────────────────────────────────

  /** Return the raw HTML string for inspection / substring ops. */
  raw(): string {
    return this.html;
  }

  /**
   * Find the FIRST opening tag that matches a simple CSS-ish selector and
   * return its full outer-HTML as a string, or null.
   */
  private findTag(selector: string): string | null {
    const { tag, attr, value } = parseSelector(selector);

    // Build a regex that matches <tag ...attr="value"...>
    let attrPart = "";
    if (attr && value !== undefined) {
      // attr="value" or attr='value'
      attrPart = `(?=[^>]*${escRe(attr)}\\s*=\\s*["']${escRe(value)}["'])`;
    } else if (attr) {
      attrPart = `(?=[^>]*\\b${escRe(attr)}\\b)`;
    }

    const openRe = new RegExp(`<${tag}${attrPart}[^>]*>`, "i");
    const m = openRe.exec(this.html);
    return m ? m[0] : null;
  }

  /**
   * Find ALL opening tags matching selector, return their raw tag strings.
   */
  private findAllTags(selector: string): string[] {
    const { tag, attr, value } = parseSelector(selector);

    let attrPart = "";
    if (attr && value !== undefined) {
      attrPart = `(?=[^>]*${escRe(attr)}\\s*=\\s*["']${escRe(value)}["'])`;
    } else if (attr) {
      attrPart = `(?=[^>]*\\b${escRe(attr)}\\b)`;
    }

    const openRe = new RegExp(`<${tag}${attrPart}[^>]*>`, "gi");
    return [...this.html.matchAll(openRe)].map((m) => m[0]);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Get an attribute value from the FIRST matching tag.
   * e.g.  doc.attr('meta[property="og:title"]', 'content')
   */
  attr(selector: string, attrName: string): string {
    const tag = this.findTag(selector);
    if (!tag) return "";
    return extractAttr(tag, attrName);
  }

  /**
   * Get an attribute value from ALL matching tags.
   */
  attrs(selector: string, attrName: string): string[] {
    return this.findAllTags(selector).map((t) => extractAttr(t, attrName));
  }

  /**
   * Get the inner-text between the FIRST matching open-tag and its close-tag.
   */
  text(selector: string): string {
    const { tag } = parseSelector(selector);
    const openTag = this.findTag(selector);
    if (!openTag) return "";

    const startIdx = this.html.indexOf(openTag);
    if (startIdx === -1) return "";

    const afterOpen = startIdx + openTag.length;
    const closeRe = new RegExp(`<\\/${tag}>`, "i");
    const closeM = closeRe.exec(this.html.slice(afterOpen));
    if (!closeM) return "";

    const inner = this.html.slice(afterOpen, afterOpen + closeM.index);
    // Strip nested tags
    return inner.replace(/<[^>]+>/g, "").trim();
  }

  /**
   * Get inner-text of ALL matching tags.
   */
  texts(selector: string): string[] {
    const { tag, attr, value } = parseSelector(selector);

    let attrPart = "";
    if (attr && value !== undefined) {
      attrPart = `(?=[^>]*${escRe(attr)}\\s*=\\s*["']${escRe(value)}["'])`;
    } else if (attr) {
      attrPart = `(?=[^>]*\\b${escRe(attr)}\\b)`;
    }

    const re = new RegExp(
      `<${tag}${attrPart}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "gi"
    );
    return [...this.html.matchAll(re)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim()
    );
  }

  /**
   * Return a new HtmlDoc scoped to the innerHTML of the FIRST matching tag.
   */
  scope(selector: string): HtmlDoc {
    const { tag, attr, value } = parseSelector(selector);

    let attrPart = "";
    if (attr && value !== undefined) {
      attrPart = `(?=[^>]*${escRe(attr)}\\s*=\\s*["']${escRe(value)}["'])`;
    } else if (attr) {
      attrPart = `(?=[^>]*\\b${escRe(attr)}\\b)`;
    }

    const re = new RegExp(
      `<${tag}${attrPart}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );
    const m = re.exec(this.html);
    return new HtmlDoc(m ? m[1] : "");
  }

  /**
   * Return an array of new HtmlDocs, one per matching element (full outer HTML).
   */
  scopeAll(selector: string): HtmlDoc[] {
    const { tag, attr, value } = parseSelector(selector);

    let attrPart = "";
    if (attr && value !== undefined) {
      attrPart = `(?=[^>]*${escRe(attr)}\\s*=\\s*["']${escRe(value)}["'])`;
    } else if (attr) {
      attrPart = `(?=[^>]*\\b${escRe(attr)}\\b)`;
    }

    const re = new RegExp(
      `<${tag}${attrPart}[^>]*>[\\s\\S]*?<\\/${tag}>`,
      "gi"
    );
    return [...this.html.matchAll(re)].map((m) => new HtmlDoc(m[0]));
  }

  /** Convenience: does the HTML contain a given string / regex? */
  contains(needle: string | RegExp): boolean {
    return typeof needle === "string"
      ? this.html.includes(needle)
      : needle.test(this.html);
  }

  /** Extract a value using a custom regex (first capture group). */
  extract(re: RegExp): string {
    const m = re.exec(this.html);
    return m ? (m[1] ?? m[0]) : "";
  }

  /** Extract all matches of a custom regex (first capture group each). */
  extractAll(re: RegExp): string[] {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    return [...this.html.matchAll(g)].map((m) => m[1] ?? m[0]);
  }
}

// ─── Selector parser ──────────────────────────────────────────────────────────

interface Parsed {
  tag: string;
  attr?: string;
  value?: string;
}

function parseSelector(sel: string): Parsed {
  sel = sel.trim();

  // tag[attr="value"] or tag[attr='value'] or tag[attr]
  const bracketM = /^([\w-]+)\[([^\]=]+)(?:=["']([^"']+)["'])?\]$/.exec(sel);
  if (bracketM) {
    return { tag: bracketM[1], attr: bracketM[2].trim(), value: bracketM[3] };
  }

  // .class  →  treat as any[class~="cls"]
  if (sel.startsWith(".")) {
    return { tag: "[\\w-]+", attr: "class", value: sel.slice(1) };
  }

  // #id
  if (sel.startsWith("#")) {
    return { tag: "[\\w-]+", attr: "id", value: sel.slice(1) };
  }

  // plain tag
  return { tag: sel };
}

function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAttr(tagStr: string, attr: string): string {
  const re = new RegExp(`\\b${escRe(attr)}\\s*=\\s*["']([^"']*)["']`, "i");
  const m = re.exec(tagStr);
  return m ? m[1] : "";
}
