# Security Audit Report: Feedbox RSS Reader

**Date:** 2026-06-26  
**Auditor:** Claude Code / Sonnet  
**Severity Level:** Medium  
**Status:** Issues found requiring remediation

---

## Executive Summary

Feedbox is a **client-side React SPA** backed by **Supabase** (PostgreSQL + Auth) with **serverless Edge Functions**. The app has solid foundational security through:
- ✅ OAuth-only authentication (GitHub + Google)
- ✅ Supabase Row-Level Security (RLS) on all tables
- ✅ No password storage or email auth
- ✅ No SQL injection vectors (using Supabase client library)

However, **5 security issues** require remediation, ranging from moderate to high severity.

---

## Critical Issues (Must Fix)

### 1. ⚠️ **XSS Vulnerability: Highlight Injection + dangerouslySetInnerHTML**
**Location:** `src/components/ContentViewer.jsx:818 + src/components/ContentViewer.jsx:897–909`  
**Severity:** HIGH (requires specific Supabase compromise)  
**Description:**

The app renders article HTML via `dangerouslySetInnerHTML`, and highlights are injected using string replacement **without HTML escaping**:

```javascript
// ContentViewer.jsx:897–909
function injectHtmlHighlights(html, highlights, colorDefs) {
  let result = html;
  for (const h of highlights) {
    const esc = h.passage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(esc, "g"),
      `<mark style="...>${h.passage}</mark>`  // ❌ NO HTML ESCAPE
    );
  }
  return result;
}
// Rendered at line 818:
<div dangerouslySetInnerHTML={{ __html: processedBodyHtml }} />
```

**Attack Vector:** If highlight data is compromised, attacker injects `</mark><img src=x onerror="alert('XSS')">` into the passage field.

**Remediation:** Use DOMPurify to sanitize before rendering, or use the existing HighlightedText component (safe React rendering).

---

### 2. ⚠️ **Missing Feed URL Validation**
**Location:** `src/lib/supabase.js:44–50`  
**Severity:** MEDIUM  
**Description:** `addFeed()` accepts any URL without validation. Users could store `javascript:`, `data:`, or malformed URLs.

**Remediation:**
```javascript
export async function addFeed(userId, feed) {
  if (feed.url) {
    try {
      const url = new URL(feed.url);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error("Only http/https URLs allowed");
      }
    } catch (e) {
      throw new Error("Invalid feed URL: " + e.message);
    }
  }
  // ... rest of function
}
```

---

### 3. ⚠️ **Dependency Vulnerabilities**
**Severity:** HIGH (5 high-severity CVEs in npm audit)  
**Details:** 26 total vulnerabilities (1 low, 20 moderate, 5 high)
- `@babel/core` ≤7.29.0: Arbitrary File Read
- `@opentelemetry/core` <2.8.0: Unbounded memory allocation

**Remediation:** `npm audit fix && npm test && npm run build`

---

## Important Issues (Should Fix)

### 4. ⚠️ **Anthropic API Key Bundled in JavaScript**
**Severity:** MEDIUM (privacy/cost risk)  
**Status:** Currently OK (not included in production build), but docs could be clearer

**Fix:** Document that AI keys must stay server-side (use Edge Functions, not VITE_ vars).

---

### 5. ⚠️ **RSS Proxy Privacy**
**Severity:** LOW (privacy concern, not security)  
**Details:** Public proxies can see what articles users read

**Remediation:** Optional — encourage users to deploy custom Cloudflare Worker proxy for privacy.

---

## What's Done Well ✅

- **OAuth-only** authentication (no passwords)
- **Row-Level Security** (RLS) on all database tables
- **No SQL injection** (using parameterized Supabase queries)
- **No secrets in code** (GitHub Actions uses secrets properly)
- **No eval/Function()** calls

---

## Remediation Priority

| Issue | Effort | Priority |
|-------|--------|----------|
| XSS (dangerouslySetInnerHTML) | 2h | P0 |
| Dependency audit fix | 1h | P0 |
| URL validation | 30m | P1 |
| Clarify API key docs | 15m | P2 |
| RSS proxy privacy docs | 30m | P2 |

**Recommended action:** Fix P0 items (XSS + deps) before next production release.

