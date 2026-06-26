(function initContent(global) {
  if (global.__firebindsContentLoaded) return;
  global.__firebindsContentLoaded = true;

  const M = global.Firebinds.Messages;
  const KeyCombo = global.Firebinds.KeyCombo;
  const Targeting = global.Firebinds.Targeting;

  let pageState = { bindings: [], indicatorsVisible: true };
  let indicators = new Map();
  let picker = null;
  let mutationTimer = null;
  let activeCombo = "";
  let activeComboUntil = 0;

  function send(message) {
    return browser.runtime.sendMessage(message);
  }

  function isFirebindsNode(node) {
    return node && node.classList && (
      node.classList.contains("firebinds-picker-box") ||
      node.classList.contains("firebinds-indicator") ||
      node.classList.contains("firebinds-toast")
    );
  }

  function toast(text) {
    const existing = document.querySelector(".firebinds-toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "firebinds-toast";
    node.textContent = text;
    document.documentElement.appendChild(node);
    setTimeout(() => node.remove(), 2200);
  }

  function clearIndicators() {
    for (const node of indicators.values()) node.remove();
    indicators = new Map();
  }

  function positionIndicator(node, element) {
    const rect = element.getBoundingClientRect();
    const top = Math.max(0, rect.top + global.scrollY - 20);
    const left = Math.max(0, rect.left + global.scrollX);
    node.style.top = `${top}px`;
    node.style.left = `${left}px`;
  }

  function renderIndicators() {
    clearIndicators();
    if (!pageState.indicatorsVisible) return;

    for (const binding of pageState.bindings || []) {
      if (!binding.enabled || binding.showIndicator === false) continue;
      const match = Targeting.matchTarget(document, binding.target);
      if (match.status !== "ready") {
        continue;
      }
      const node = document.createElement("span");
      node.className = "firebinds-indicator";
      node.dataset.bindingId = binding.id;
      node.dataset.status = match.status;
      node.textContent = binding.keyCombo;
      node.title = `Firebinds: ${binding.keyCombo}`;
      document.documentElement.appendChild(node);
      positionIndicator(node, match.element);
      indicators.set(binding.id, node);
    }
  }

  function refreshIndicatorsSoon() {
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(renderIndicators, 120);
  }

  function updatePickerBox(element) {
    if (!picker || !element || isFirebindsNode(element)) return;
    const rect = element.getBoundingClientRect();
    picker.target = element;
    picker.box.style.left = `${rect.left}px`;
    picker.box.style.top = `${rect.top}px`;
    picker.box.style.width = `${rect.width}px`;
    picker.box.style.height = `${rect.height}px`;
  }

  function stopPicker(cancelled) {
    if (!picker) return;
    document.removeEventListener("mousemove", picker.onMove, true);
    document.removeEventListener("click", picker.onClick, true);
    document.removeEventListener("keydown", picker.onKeyDown, true);
    picker.box.remove();
    picker = null;
    if (cancelled) {
      send({ type: M.PICKER_CANCELLED }).catch(() => {});
      toast("Element selection cancelled.");
    }
  }

  function startPicker() {
    stopPicker(false);
    clearIndicators();
    const box = document.createElement("div");
    box.className = "firebinds-picker-box";
    document.documentElement.appendChild(box);

    picker = {
      box,
      target: null,
      onMove(event) {
        updatePickerBox(event.target);
      },
      onClick(event) {
        if (!picker || !picker.target || isFirebindsNode(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const target = Targeting.createDescriptor(picker.target, location.href);
        stopPicker(false);
        send({ type: M.PICKER_RESULT, target }).catch(() => {});
        toast("Element selected. Finish the keybind in the popup.");
      },
      onKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          stopPicker(true);
          renderIndicators();
        }
      }
    };

    document.addEventListener("mousemove", picker.onMove, true);
    document.addEventListener("click", picker.onClick, true);
    document.addEventListener("keydown", picker.onKeyDown, true);
    toast("Pick an element. Press Escape to cancel.");
  }

  function activateElement(element) {
    const actionable = element.closest(
      'button, a[href], input, textarea, select, [role="button"], [role="tab"], [role="menuitem"], [role="link"], [tabindex]'
    ) || element;
    const tag = actionable.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select" || actionable.isContentEditable) {
      actionable.focus();
      return;
    }

    actionable.scrollIntoView({ block: "nearest", inline: "nearest" });
    if (typeof actionable.focus === "function") {
      actionable.focus({ preventScroll: true });
    }

    const rect = actionable.getBoundingClientRect();
    const clientX = Math.floor(rect.left + rect.width / 2);
    const clientY = Math.floor(rect.top + rect.height / 2);
    const baseEventInit = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      screenX: global.screenX + clientX,
      screenY: global.screenY + clientY,
      button: 0,
      buttons: 0
    };
    const mouseEventInit = { ...baseEventInit, view: document.defaultView };

    for (const type of ["mouseover", "mousemove", "mousedown", "mouseup"]) {
      actionable.dispatchEvent(new MouseEvent(type, mouseEventInit));
    }

    actionable.click();
  }

  function onKeyDown(event) {
    if (picker) return;
    const combo = KeyCombo.eventToCombo(event);
    if (!combo) return;
    if (combo === activeCombo && Date.now() < activeComboUntil) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
    const binding = (pageState.bindings || []).find(
      (item) => item.enabled && item.keyCombo === combo
    );
    if (!binding) {
      if (pageState.debugKeys) toast(`Saw ${combo}: no binding`);
      return;
    }
    if (KeyCombo.isEditableTarget(event.target) && !binding.allowInEditable) {
      if (pageState.debugKeys) toast(`Saw ${combo}: ignored in editable field`);
      return;
    }

    const match = Targeting.matchTarget(document, binding.target);
    if (match.status !== "ready") {
      event.preventDefault();
      event.stopPropagation();
      send({ type: M.BINDING_STATUS, id: binding.id, status: match.status }).catch(() => {});
      toast(match.status === "ambiguous" ? "This keybind needs re-selection." : "Target not found.");
      return;
    }

    if (pageState.debugKeys) toast(`Saw ${combo}: matched ${binding.target.label || binding.keyCombo}`);
    activeCombo = combo;
    activeComboUntil = Date.now() + 450;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    activateElement(match.element);
    if (binding.status !== "ready") {
      send({ type: M.BINDING_STATUS, id: binding.id, status: "ready" }).catch(() => {});
    }
  }

  function onKeyUp(event) {
    const combo = KeyCombo.eventToCombo(event);
    if (combo === activeCombo) {
      activeCombo = "";
      activeComboUntil = 0;
    }
  }

  async function loadState() {
    try {
      const state = await send({ type: M.GET_CONTENT_STATE, url: location.href });
      if (state && state.ok) {
        pageState = state;
        renderIndicators();
      }
    } catch (_error) {
      // Content scripts can be loaded before the extension is fully ready.
    }
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message.type === M.PING) return Promise.resolve({ ok: true });
    if (message.type === M.START_PICKER) {
      startPicker();
      return Promise.resolve({ ok: true });
    }
    if (message.type === M.APPLY_STATE) {
      pageState = message.state;
      renderIndicators();
      return Promise.resolve({ ok: true });
    }
    if (message.type === M.CHECK_TARGET) {
      const match = Targeting.matchTarget(document, message.target);
      return Promise.resolve({
        ok: true,
        status: match.status,
        label: match.element ? (match.element.getAttribute("aria-label") || match.element.textContent || match.element.tagName).trim().slice(0, 80) : ""
      });
    }
    return false;
  });

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);
  global.addEventListener("scroll", refreshIndicatorsSoon, true);
  global.addEventListener("resize", refreshIndicatorsSoon);
  function mutationTouchesOnlyFirebinds(mutations) {
    return mutations.every((mutation) => {
      const nodes = [
        mutation.target,
        ...Array.from(mutation.addedNodes || []),
        ...Array.from(mutation.removedNodes || [])
      ];
      return nodes.every((node) => node.nodeType !== Node.ELEMENT_NODE || isFirebindsNode(node));
    });
  }

  new MutationObserver((mutations) => {
    if (!mutationTouchesOnlyFirebinds(mutations)) refreshIndicatorsSoon();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });

  loadState();
})(globalThis);
