(function initTargeting(global) {
  const Firebinds = global.Firebinds || (global.Firebinds = {});

  function cssEscape(value) {
    if (global.CSS && typeof global.CSS.escape === "function") {
      return global.CSS.escape(value);
    }
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function attrEscape(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function visibleText(element) {
    return (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function labelFor(element) {
    const label =
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("alt") ||
      element.getAttribute("name") ||
      visibleText(element) ||
      element.tagName.toLowerCase();
    return label.slice(0, 80);
  }

  function isVisible(element) {
    if (!element || !(element instanceof Element)) return false;
    const rect = element.getBoundingClientRect();
    const style = global.getComputedStyle ? global.getComputedStyle(element) : null;
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      (!style || (style.visibility !== "hidden" && style.display !== "none"))
    );
  }

  function uniqueSelector(documentRef, selector) {
    try {
      const matches = Array.from(documentRef.querySelectorAll(selector));
      return matches.length === 1 ? selector : "";
    } catch (_error) {
      return "";
    }
  }

  function stableSelector(element) {
    const documentRef = element.ownerDocument;
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");
    if (id) {
      const selector = `#${cssEscape(id)}`;
      if (uniqueSelector(documentRef, selector)) return selector;
    }

    const attrs = ["data-testid", "data-test", "data-cy", "aria-label", "name", "title", "role"];
    for (const attr of attrs) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      const selector = `${tag}[${attr}="${attrEscape(value)}"]`;
      if (uniqueSelector(documentRef, selector)) return selector;
    }

    return nthPath(element);
  }

  function nthPath(element) {
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== current.ownerDocument.body) {
      const tag = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
      const index = siblings.indexOf(current) + 1;
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
      current = parent;
      if (parts.length >= 6) break;
    }
    return parts.length ? `body > ${parts.join(" > ")}` : "body";
  }

  function createDescriptor(element, url) {
    return {
      mode: "picker",
      label: labelFor(element),
      selector: stableSelector(element),
      tagName: element.tagName.toLowerCase(),
      textHint: visibleText(element).slice(0, 80),
      roleHint: element.getAttribute("role") || "",
      urlAtSelection: url
    };
  }

  function createTextDescriptor(mode, textQuery) {
    const normalizedQuery = String(textQuery || "").replace(/\s+/g, " ").trim();
    return {
      mode,
      label: mode === "textPattern" ? `Text pattern: ${normalizedQuery}` : `Text: ${normalizedQuery}`,
      textQuery: normalizedQuery
    };
  }

  function scoreMatch(element, target) {
    let score = 0;
    if (element.tagName.toLowerCase() === target.tagName) score += 2;
    if (target.roleHint && element.getAttribute("role") === target.roleHint) score += 2;
    if (target.textHint && visibleText(element).startsWith(target.textHint)) score += 2;
    if (labelFor(element) === target.label) score += 1;
    return score;
  }

  function interactiveCandidates(documentRef) {
    const selector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role]",
      "[tabindex]",
      "summary",
      "label"
    ].join(",");
    return Array.from(documentRef.querySelectorAll(selector)).filter(isVisible);
  }

  function elementSearchText(element) {
    return normalizeText([
      labelFor(element),
      visibleText(element),
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.getAttribute("placeholder"),
      element.getAttribute("value")
    ].filter(Boolean).join(" "));
  }

  function wildcardToRegex(pattern) {
    const escaped = normalizeText(pattern).replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escaped.replace(/\*/g, ".*")}$`, "i");
  }

  function matchTextTarget(documentRef, target) {
    const query = normalizeText(target.textQuery);
    if (!query) return { status: "missing", element: null };
    const candidates = interactiveCandidates(documentRef);
    const matches = candidates.filter((element) => {
      const text = elementSearchText(element);
      if (target.mode === "textPattern") return wildcardToRegex(query).test(text);
      return text === query || normalizeText(labelFor(element)) === query || normalizeText(visibleText(element)) === query;
    });
    if (matches.length === 1) return { status: "ready", element: matches[0] };
    if (matches.length > 1) return { status: "ambiguous", element: null };
    return { status: "missing", element: null };
  }

  function matchPickerTarget(documentRef, target) {
    if (!target || !target.selector) return { status: "missing", element: null };
    let matches = [];
    try {
      matches = Array.from(documentRef.querySelectorAll(target.selector)).filter(isVisible);
    } catch (_error) {
      matches = [];
    }

    if (matches.length === 1) return { status: "ready", element: matches[0] };
    if (matches.length > 1) {
      const scored = matches
        .map((element) => ({ element, score: scoreMatch(element, target) }))
        .sort((a, b) => b.score - a.score);
      if (scored[0] && scored[0].score > 0 && scored[0].score > (scored[1] ? scored[1].score : -1)) {
        return { status: "ready", element: scored[0].element };
      }
      return { status: "ambiguous", element: null };
    }

    if (target.textHint || target.roleHint) {
      const candidates = Array.from(documentRef.querySelectorAll(target.tagName || "*")).filter(isVisible);
      const scored = candidates
        .map((element) => ({ element, score: scoreMatch(element, target) }))
        .filter((item) => item.score > 1)
        .sort((a, b) => b.score - a.score);
      if (scored.length === 1 || (scored[0] && scored[0].score > scored[1].score)) {
        return { status: "ready", element: scored[0].element };
      }
      if (scored.length > 1) return { status: "ambiguous", element: null };
    }

    return { status: "missing", element: null };
  }

  function normalizeScope(url, scopeType) {
    if (scopeType === "global") return "*";
    const parsed = new URL(url);
    if (scopeType === "site") return parsed.origin;
    return `${parsed.origin}${parsed.pathname}`;
  }

  function matchTarget(documentRef, target) {
    if (!target) return { status: "missing", element: null };
    if (target.mode === "text" || target.mode === "textPattern") {
      return matchTextTarget(documentRef, target);
    }
    return matchPickerTarget(documentRef, { ...target, mode: target.mode || "picker" });
  }

  Firebinds.Targeting = Object.freeze({
    createDescriptor,
    createTextDescriptor,
    matchTarget,
    normalizeScope,
    isVisible,
    normalizeText
  });
})(globalThis);
