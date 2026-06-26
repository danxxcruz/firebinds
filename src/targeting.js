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
      element.getAttribute("placeholder") ||
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

  function interactiveSelector() {
    return [
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
  }

  function deepQuery(root, selector) {
    const matches = [];
    if (!root || typeof root.querySelectorAll !== "function") return matches;
    matches.push(...Array.from(root.querySelectorAll(selector)));
    for (const element of Array.from(root.querySelectorAll("*"))) {
      if (element.shadowRoot) matches.push(...deepQuery(element.shadowRoot, selector));
    }
    return matches;
  }

  function descriptorElement(element) {
    if (!element || !(element instanceof Element)) return element;
    const nativeSelector = 'a[href],button,input,select,textarea,summary';
    const closestNative = element.closest(nativeSelector);
    if (closestNative && closestNative !== element.ownerDocument.body && isVisible(closestNative)) return closestNative;
    const childNative = deepQuery(element, nativeSelector).find(isVisible);
    if (childNative) return childNative;
    const closest = element.closest(interactiveSelector());
    if (closest && closest !== element.ownerDocument.body && isVisible(closest)) return closest;
    const child = deepQuery(element, interactiveSelector()).find(isVisible);
    return child || element;
  }

  function uniqueElements(elements) {
    const seen = new Set();
    return elements.filter((element) => {
      if (!element || seen.has(element)) return false;
      seen.add(element);
      return true;
    });
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

    const attrs = [
      "data-testid",
      "data-test",
      "data-cy",
      "aria-label",
      "placeholder",
      "name",
      "title",
      "role",
      "type"
    ];
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
    const picked = descriptorElement(element);
    return {
      mode: "picker",
      label: labelFor(picked),
      selector: stableSelector(picked),
      tagName: picked.tagName.toLowerCase(),
      textHint: visibleText(picked).slice(0, 80),
      roleHint: picked.getAttribute("role") || "",
      contextHint: contextHintFor(picked),
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

  function confidenceMatch(element, target) {
    let score = 0;
    if (target.roleHint && element.getAttribute("role") === target.roleHint) score += 1;
    if (target.textHint && visibleText(element).startsWith(target.textHint)) score += 1;
    if (target.label && labelFor(element) === target.label) score += 1;
    return score;
  }

  function isStructuralSelector(selector) {
    return String(selector || "").startsWith("body >") || String(selector || "").includes(":nth-of-type");
  }

  function contextHintFor(element) {
    return element && element.closest && element.closest('dialog[open], [aria-modal="true"], [role="dialog"]')
      ? "dialog"
      : "page";
  }

  function targetContextHint(target) {
    if (target.contextHint) return target.contextHint;
    return isStructuralSelector(target.selector) ? "page" : "any";
  }

  function matchesTargetContext(element, target) {
    const expected = targetContextHint(target);
    return expected === "any" || contextHintFor(element) === expected;
  }

  function interactiveCandidates(documentRef) {
    return deepQuery(documentRef, interactiveSelector()).filter(isVisible);
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
      matches = uniqueElements(
        deepQuery(documentRef, target.selector)
          .map((element) => descriptorElement(element))
          .filter(isVisible)
          .filter((element) => matchesTargetContext(element, target))
      );
    } catch (_error) {
      matches = [];
    }

    if (matches.length === 1) {
      if (!isStructuralSelector(target.selector) || confidenceMatch(matches[0], target) > 0) {
        return { status: "ready", element: matches[0] };
      }
    }
    if (matches.length > 1) {
      const scored = matches
        .map((element) => ({ element, score: scoreMatch(element, target) }))
        .sort((a, b) => b.score - a.score);
      if (scored[0] && scored[0].score > 0 && scored[0].score > (scored[1] ? scored[1].score : -1)) {
        return { status: "ready", element: scored[0].element };
      }
      return { status: "ambiguous", element: null };
    }

    if (target.label || target.textHint || target.roleHint) {
      const candidates = uniqueElements(
        deepQuery(documentRef, target.tagName || "*")
          .map((element) => descriptorElement(element))
          .filter(isVisible)
          .filter((element) => matchesTargetContext(element, target))
      );
      const scored = candidates
        .map((element) => ({ element, score: scoreMatch(element, target) }))
        .filter((item) => item.score > (target.textHint || target.roleHint ? 1 : 0))
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
