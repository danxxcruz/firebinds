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

  const stableAttributeNames = [
    "data-testid",
    "data-test",
    "data-cy",
    "aria-label",
    "placeholder",
    "name",
    "title",
    "role",
    "type",
    "jsname",
    "data-idom-class"
  ];

  function storedAttributes(element) {
    const attrs = {};
    for (const attr of stableAttributeNames) {
      const value = element.getAttribute(attr);
      if (value) attrs[attr] = value;
    }
    return attrs;
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

    const attrs = storedAttributes(element);
    for (const attr of stableAttributeNames) {
      const value = attrs[attr];
      if (!value) continue;
      const selector = `${tag}[${attr}="${attrEscape(value)}"]`;
      if (uniqueSelector(documentRef, selector)) return selector;
    }

    for (const primary of ["aria-label", "placeholder", "title", "name"]) {
      if (!attrs[primary]) continue;
      for (const secondary of stableAttributeNames) {
        if (primary === secondary || !attrs[secondary]) continue;
        const selector = `${tag}[${primary}="${attrEscape(attrs[primary])}"][${secondary}="${attrEscape(attrs[secondary])}"]`;
        if (uniqueSelector(documentRef, selector)) return selector;
      }
    }

    return nthPath(element);
  }

  function selectorIndex(documentRef, selector, element, target) {
    if (!selector) return -1;
    try {
      const matches = uniqueElements(
        deepQuery(documentRef, selector)
          .map((match) => descriptorElement(match))
          .filter(isVisible)
          .filter((match) => !target || matchesTargetContext(match, target))
      );
      return matches.indexOf(element);
    } catch (_error) {
      return -1;
    }
  }

  function labelCandidates(documentRef, tagName, label, contextTarget) {
    if (!label) return [];
    return uniqueElements(
      deepQuery(documentRef, tagName || "*")
        .map((element) => descriptorElement(element))
        .filter(isVisible)
        .filter((element) => !contextTarget || matchesTargetContext(element, contextTarget))
        .filter((element) => !tagName || element.tagName.toLowerCase() === tagName)
        .filter((element) => labelFor(element) === label)
    );
  }

  function labelIndex(documentRef, element, contextTarget) {
    const matches = labelCandidates(
      documentRef,
      element.tagName.toLowerCase(),
      labelFor(element),
      contextTarget
    );
    return matches.indexOf(element);
  }

  function rectHintFor(element) {
    const rect = element.getBoundingClientRect();
    const viewportWidth = Math.max(1, element.ownerDocument.documentElement.clientWidth);
    const viewportHeight = Math.max(1, element.ownerDocument.documentElement.clientHeight);
    return {
      x: Math.round(((rect.left + rect.width / 2) / viewportWidth) * 1000) / 1000,
      y: Math.round(((rect.top + rect.height / 2) / viewportHeight) * 1000) / 1000
    };
  }

  function distanceFromRectHint(element, rectHint) {
    if (!rectHint) return Number.POSITIVE_INFINITY;
    const rect = element.getBoundingClientRect();
    const viewportWidth = Math.max(1, element.ownerDocument.documentElement.clientWidth);
    const viewportHeight = Math.max(1, element.ownerDocument.documentElement.clientHeight);
    const x = (rect.left + rect.width / 2) / viewportWidth;
    const y = (rect.top + rect.height / 2) / viewportHeight;
    return Math.hypot(x - rectHint.x, y - rectHint.y);
  }

  function attributeScore(element, target) {
    if (!target.attributes) return 0;
    let score = 0;
    for (const [attr, value] of Object.entries(target.attributes)) {
      if (value && element.getAttribute(attr) === value) score += 1;
    }
    return score;
  }

  function indexedMatch(documentRef, matches, target) {
    if (!matches.length) return null;

    if (Number.isInteger(target.selectorIndex) && target.selectorIndex >= 0 && target.selector) {
      const selectorMatches = uniqueElements(
        deepQuery(documentRef, target.selector)
          .map((element) => descriptorElement(element))
          .filter(isVisible)
          .filter((element) => matchesTargetContext(element, target))
      );
      const indexed = selectorMatches[target.selectorIndex];
      if (indexed && matches.includes(indexed) && confidenceMatch(indexed, target) > 0) return indexed;
    }

    if (Number.isInteger(target.labelIndex) && target.labelIndex >= 0 && target.label) {
      const candidates = labelCandidates(documentRef, target.tagName, target.label, target);
      const indexed = candidates[target.labelIndex];
      if (indexed && matches.includes(indexed) && confidenceMatch(indexed, target) > 0) return indexed;
    }

    if (target.rectHint && matches.length > 1) {
      const nearest = matches
        .map((element) => ({ element, distance: distanceFromRectHint(element, target.rectHint) }))
        .sort((a, b) => a.distance - b.distance);
      if (nearest[0] && nearest[0].distance < 0.12 && nearest[0].distance + 0.08 < nearest[1].distance) {
        return nearest[0].element;
      }
    }

    return null;
  }

  function bestScoredMatch(documentRef, candidates, target) {
    const scored = candidates
      .map((element) => ({ element, score: scoreMatch(element, target) }))
      .sort((a, b) => b.score - a.score);
    if (!scored.length || scored[0].score <= 0) return null;
    const topScore = scored[0].score;
    const topMatches = scored.filter((item) => item.score === topScore).map((item) => item.element);
    if (topMatches.length === 1) return topMatches[0];
    return indexedMatch(documentRef, topMatches, target);
  }

  function createDescriptor(element, url) {
    const picked = descriptorElement(element);
    const selector = stableSelector(picked);
    const contextTarget = {
      contextHint: contextHintFor(picked),
      selector
    };
    return {
      mode: "picker",
      label: labelFor(picked),
      selector,
      selectorIndex: selectorIndex(picked.ownerDocument, selector, picked, contextTarget),
      labelIndex: labelIndex(picked.ownerDocument, picked, contextTarget),
      tagName: picked.tagName.toLowerCase(),
      attributes: storedAttributes(picked),
      textHint: visibleText(picked).slice(0, 80),
      roleHint: picked.getAttribute("role") || "",
      contextHint: contextHintFor(picked),
      rectHint: rectHintFor(picked),
      urlAtSelection: url
    };
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
    score += Math.min(attributeScore(element, target), 3);
    if (labelFor(element) === target.label) score += 1;
    return score;
  }

  function confidenceMatch(element, target) {
    let score = 0;
    if (target.roleHint && element.getAttribute("role") === target.roleHint) score += 1;
    if (target.textHint && visibleText(element).startsWith(target.textHint)) score += 1;
    if (attributeScore(element, target) > 0) score += 1;
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
      const best = bestScoredMatch(documentRef, matches, target);
      if (best) return { status: "ready", element: best };
      return { status: "ambiguous", element: null };
    }

    if (target.label || target.textHint || target.roleHint) {
      const candidates = uniqueElements(
        deepQuery(documentRef, target.tagName || "*")
          .map((element) => descriptorElement(element))
          .filter(isVisible)
          .filter((element) => matchesTargetContext(element, target))
      );
      const threshold = target.textHint || target.roleHint || target.attributes ? 1 : 0;
      const scoredCandidates = candidates.filter((element) => scoreMatch(element, target) > threshold);
      const best = bestScoredMatch(documentRef, scoredCandidates, target);
      if (best) return { status: "ready", element: best };
      if (scoredCandidates.length > 1) return { status: "ambiguous", element: null };
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
