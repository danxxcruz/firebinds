(function initPopup(global) {
  const M = global.Firebinds.Messages;
  const KeyCombo = global.Firebinds.KeyCombo;
  const Targeting = global.Firebinds.Targeting;

  const els = {
    pageLabel: document.getElementById("pageLabel"),
    notice: document.getElementById("notice"),
    header: document.querySelector(".header"),
    headerBrand: document.querySelector(".brand"),
    headerActions: document.querySelector(".header-actions"),
    mainView: document.getElementById("mainView"),
    settingsView: document.getElementById("settingsView"),
    controls: document.getElementById("controls"),
    settingsButton: document.getElementById("settingsButton"),
    settingsBackButton: document.getElementById("settingsBackButton"),
    refreshButton: document.getElementById("refreshButton"),
    profilePanel: document.getElementById("profilePanel"),
    profileSelect: document.getElementById("profileSelect"),
    profileCount: document.getElementById("profileCount"),
    newProfileButton: document.getElementById("newProfileButton"),
    renameProfileButton: document.getElementById("renameProfileButton"),
    duplicateProfileButton: document.getElementById("duplicateProfileButton"),
    deleteProfileButton: document.getElementById("deleteProfileButton"),
    exportButton: document.getElementById("exportButton"),
    importButton: document.getElementById("importButton"),
    importFileInput: document.getElementById("importFileInput"),
    addButton: document.getElementById("addButton"),
    indicatorsToggle: document.getElementById("indicatorsToggle"),
    indicatorOpacityRange: document.getElementById("indicatorOpacityRange"),
    indicatorOpacityValue: document.getElementById("indicatorOpacityValue"),
    debugKeysToggle: document.getElementById("debugKeysToggle"),
    formPanel: document.getElementById("formPanel"),
    formTitle: document.getElementById("formTitle"),
    targetModeSelect: document.getElementById("targetModeSelect"),
    pickerTargetPanel: document.getElementById("pickerTargetPanel"),
    pickTargetButton: document.getElementById("pickTargetButton"),
    textTargetPanel: document.getElementById("textTargetPanel"),
    textTargetInput: document.getElementById("textTargetInput"),
    targetLabel: document.getElementById("targetLabel"),
    scopeSelect: document.getElementById("scopeSelect"),
    keyCapture: document.getElementById("keyCapture"),
    editableToggle: document.getElementById("editableToggle"),
    conflictPanel: document.getElementById("conflictPanel"),
    conflictText: document.getElementById("conflictText"),
    replaceConflictToggle: document.getElementById("replaceConflictToggle"),
    saveButton: document.getElementById("saveButton"),
    testTargetButton: document.getElementById("testTargetButton"),
    cancelButton: document.getElementById("cancelButton"),
    searchInput: document.getElementById("searchInput"),
    bindingsList: document.getElementById("bindingsList")
  };

  let pageState = null;
  let activeEditId = null;
  let activeFormContext = null;
  let savedFlashId = null;
  let savedFlashTimer = 0;
  let view = "main";
  let viewTransitionTimer = 0;

  const BUTTON_ICONS = {
    Edit: "edit",
    Duplicate: "copy",
    Test: "target",
    Disable: "power",
    Enable: "power",
    Delete: "trash"
  };
  const IMPORT_DEBUG_KEY = "firebinds.importDebug";

  function send(message) {
    return browser.runtime.sendMessage(message);
  }

  function preventBrowserZoom(event) {
    if (!event.ctrlKey && !event.metaKey) return;
    if (event.type === "wheel") {
      event.preventDefault();
      return;
    }
    if (event.key === "+" || event.key === "-" || event.key === "=" || event.key === "0") {
      event.preventDefault();
    }
  }

  async function resetPageZoom() {
    if (!browser.tabs || !browser.tabs.getCurrent || !browser.tabs.setZoom) return;
    try {
      const tab = await browser.tabs.getCurrent();
      if (tab && tab.id !== undefined) await browser.tabs.setZoom(tab.id, 1);
    } catch (_error) {
      // Zoom reset is best-effort; the popup should still load if the browser denies it.
    }
  }

  async function isFirefox() {
    if (!browser.runtime.getBrowserInfo) return false;
    try {
      const info = await browser.runtime.getBrowserInfo();
      return /firefox/i.test(info.name || "");
    } catch (_error) {
      return false;
    }
  }

  async function appendImportDebug(stage, detail = {}) {
    const entry = {
      stage,
      at: new Date().toISOString(),
      page: "popup",
      visibility: document.visibilityState,
      detail
    };
    try {
      const result = await browser.storage.local.get(IMPORT_DEBUG_KEY);
      const entries = Array.isArray(result[IMPORT_DEBUG_KEY]) ? result[IMPORT_DEBUG_KEY] : [];
      await browser.storage.local.set({ [IMPORT_DEBUG_KEY]: [...entries, entry].slice(-100) });
    } catch (error) {
      console.info("[Firebinds import debug]", entry, error);
    }
  }

  function iconNode(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    svg.setAttribute("class", "button-icon");
    svg.setAttribute("aria-hidden", "true");
    use.setAttribute("href", `#icon-${name}`);
    svg.appendChild(use);
    return svg;
  }

  function setButtonContent(node, label, iconName) {
    node.textContent = "";
    if (iconName) node.appendChild(iconNode(iconName));
    const text = document.createElement("span");
    text.textContent = label;
    node.appendChild(text);
  }

  function setButtonLabel(node, label) {
    const text = node.querySelector("span");
    if (text) {
      text.textContent = label;
      return;
    }
    node.textContent = label;
  }

  function clearHeaderTransitionClasses() {
    for (const node of [els.headerBrand, els.headerActions]) {
      node.classList.remove("header-transition", "header-leaving", "header-entering", "is-active");
    }
  }

  function animateHeaderOut() {
    els.headerBrand.classList.add("header-transition", "header-leaving");
    els.headerActions.classList.add("header-transition", "header-leaving");
    requestAnimationFrame(() => {
      els.headerBrand.classList.add("is-active");
      els.headerActions.classList.add("is-active");
    });
  }

  function prepareHeaderIn() {
    els.header.hidden = false;
    els.headerBrand.classList.add("header-transition", "header-entering");
    els.headerActions.classList.add("header-transition", "header-entering");
  }

  function animateHeaderIn() {
    requestAnimationFrame(() => {
      els.headerBrand.classList.add("is-active");
      els.headerActions.classList.add("is-active");
    });
  }

  function showView(nextView, focusBackButton = true) {
    if (nextView === view) {
      els.mainView.hidden = view !== "main";
      els.settingsView.hidden = view !== "settings";
      els.header.hidden = view === "settings";
      if (view === "settings" && focusBackButton) els.settingsBackButton.focus();
      return;
    }

    const previousView = view;
    const entering = nextView === "settings" ? els.settingsView : els.mainView;
    const leaving = previousView === "settings" ? els.settingsView : els.mainView;
    const reverse = nextView === "main";
    const toSettings = nextView === "settings";
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    view = nextView;
    closePopupMenus();

    window.clearTimeout(viewTransitionTimer);
    entering.classList.remove("view-transition", "view-entering", "view-leaving", "is-active", "view-reverse");
    leaving.classList.remove("view-transition", "view-entering", "view-leaving", "is-active", "view-reverse");
    clearHeaderTransitionClasses();

    if (reducedMotion) {
      els.mainView.hidden = view !== "main";
      els.settingsView.hidden = view !== "settings";
      els.header.hidden = view === "settings";
      if (view === "settings" && focusBackButton) els.settingsBackButton.focus();
      return;
    }

    if (toSettings) animateHeaderOut();

    leaving.classList.add("view-transition", "view-leaving");
    if (reverse) leaving.classList.add("view-reverse");

    requestAnimationFrame(() => {
      leaving.classList.add("is-active");
    });

    viewTransitionTimer = window.setTimeout(() => {
      leaving.hidden = true;
      leaving.classList.remove("view-transition", "view-leaving", "is-active", "view-reverse");

      if (toSettings) {
        els.header.hidden = true;
        clearHeaderTransitionClasses();
      } else {
        prepareHeaderIn();
      }

      entering.hidden = false;
      entering.classList.add("view-transition", "view-entering");
      if (reverse) entering.classList.add("view-reverse");

      requestAnimationFrame(() => {
        entering.classList.add("is-active");
        if (!toSettings) animateHeaderIn();
      });

      viewTransitionTimer = window.setTimeout(() => {
        entering.classList.remove("view-transition", "view-entering", "is-active", "view-reverse");
        if (!toSettings) clearHeaderTransitionClasses();
        if (view === "settings" && focusBackButton) els.settingsBackButton.focus();
      }, 120);
    }, 90);
  }

  function opacityLabel(value) {
    return `${Math.round(Number(value || 1) * 100)}%`;
  }

  function syncOpacityControl(value) {
    const opacity = Number(value || 1);
    const min = Number(els.indicatorOpacityRange.min);
    const max = Number(els.indicatorOpacityRange.max);
    const progress = ((opacity - min) / (max - min)) * 100;
    els.indicatorOpacityRange.value = String(opacity);
    els.indicatorOpacityRange.style.setProperty("--range-progress", `${Math.max(0, Math.min(100, progress))}%`);
    els.indicatorOpacityValue.textContent = opacityLabel(opacity);
  }

  function syncSettingsUi(state) {
    const ok = Boolean(state && state.ok);
    const opacity = Number(state && state.indicatorOpacity ? state.indicatorOpacity : 1);
    els.indicatorsToggle.checked = Boolean(state && state.indicatorsVisible);
    els.indicatorsToggle.disabled = !ok;
    syncOpacityControl(opacity);
    els.debugKeysToggle.checked = Boolean(state && state.debugKeys);
  }

  function showNotice(text, kind) {
    els.notice.hidden = !text;
    els.notice.textContent = text || "";
    els.notice.classList.toggle("error", kind === "error");
  }

  function popupMenus() {
    return Array.from(document.querySelectorAll(".popup-menu"));
  }

  function closePopupMenus(exceptMenu, restoreFocus = false) {
    for (const menu of popupMenus()) {
      if (menu === exceptMenu || !menu.open) continue;
      menu.open = false;
      menu.classList.remove("menu-flip");
      if (restoreFocus) {
        const summary = menu.querySelector("summary");
        if (summary) summary.focus();
      }
    }
  }

  function positionPopupMenu(menu) {
    if (!menu || !menu.open) return;
    const summary = menu.querySelector("summary");
    const popover = menu.querySelector(".menu-popover");
    if (!summary || !popover) return;

    menu.classList.remove("menu-flip");
    const triggerRect = summary.getBoundingClientRect();
    const popoverHeight = popover.getBoundingClientRect().height;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    if (popoverHeight > spaceBelow) menu.classList.add("menu-flip");
  }

  function pageLabel(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`;
    } catch (_error) {
      return url || "Current page";
    }
  }

  function activeProfileId() {
    return pageState && pageState.activeProfile ? pageState.activeProfile.id : "";
  }

  function scopeValue(scopeType) {
    if (scopeType === "global") return "*";
    return scopeType === "site" ? pageState.page.siteScope : pageState.page.pageScope;
  }

  function bindingTargetLabel(target) {
    if (!target) return "No element selected.";
    if (target.mode === "text" || target.mode === "textPattern") return target.label || target.textQuery;
    return target.label || target.selector || target.tagName || "Selected element";
  }

  function statusText(binding) {
    if (binding.status === "missing") return "Missing";
    if (binding.status === "ambiguous") return "Ambiguous";
    return binding.enabled ? "Ready" : "Disabled";
  }

  function scopeLabel(binding) {
    if (binding.scopeType === "global") return "global";
    return binding.scopeType;
  }

  function backupFileName() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `firebinds-backup-${stamp}.json`;
  }

  function downloadJson(fileName, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function targetModeFor(target) {
    return target && target.mode ? target.mode : "picker";
  }

  function formTargetLabel(target) {
    return target ? bindingTargetLabel(target) : "Choose an element to bind to.";
  }

  function formModelFromBinding(binding, target) {
    return {
      id: binding.id,
      target: target || binding.target,
      targetMode: targetModeFor(target || binding.target),
      scopeType: binding.scopeType,
      keyCombo: binding.keyCombo,
      allowInEditable: binding.allowInEditable
    };
  }

  const topFormContext = {
    kind: "top",
    model: null,
    nodes: {
      panel: els.formPanel,
      title: els.formTitle,
      targetModeSelect: els.targetModeSelect,
      pickerTargetPanel: els.pickerTargetPanel,
      pickTargetButton: els.pickTargetButton,
      textTargetPanel: els.textTargetPanel,
      textTargetInput: els.textTargetInput,
      targetLabel: els.targetLabel,
      scopeSelect: els.scopeSelect,
      keyCapture: els.keyCapture,
      editableToggle: els.editableToggle,
      conflictPanel: els.conflictPanel,
      conflictText: els.conflictText,
      replaceConflictToggle: els.replaceConflictToggle,
      saveButton: els.saveButton,
      testTargetButton: els.testTargetButton,
      cancelButton: els.cancelButton
    }
  };

  function roleElement(tagName, role, className) {
    const node = document.createElement(tagName);
    node.dataset.role = role;
    if (className) node.className = className;
    return node;
  }

  function labelText(text) {
    const node = document.createElement("span");
    node.textContent = text;
    return node;
  }

  function optionNode(value, label) {
    const node = document.createElement("option");
    node.value = value;
    node.textContent = label;
    return node;
  }

  function formSelect(role, options) {
    const node = roleElement("select", role);
    node.append(...options.map(([value, label]) => optionNode(value, label)));
    return node;
  }

  function fieldNode(label, control, role) {
    const node = document.createElement("label");
    node.className = "field";
    if (role) node.dataset.role = role;
    node.append(labelText(label), control);
    return node;
  }

  function roleButton(role, label, iconName, className) {
    const node = roleElement("button", role, className);
    node.type = "button";
    setButtonContent(node, label, iconName);
    return node;
  }

  function appendInlineForm(panel) {
    panel.textContent = "";

    const title = roleElement("h2", "form-title");
    title.textContent = "Edit shortcut";

    const targetModeSelect = formSelect("target-mode", [
      ["picker", "Pick element"],
      ["text", "Text"],
      ["textPattern", "Text pattern"]
    ]);

    const pickerTargetPanel = roleElement("div", "picker-target-panel", "target-panel");
    const targetLabel = roleElement("p", "target-label", "target");
    targetLabel.textContent = "Choose an element to bind to.";
    pickerTargetPanel.append(targetLabel, roleButton("pick-target", "Pick element", "target"));

    const textTargetInput = roleElement("input", "text-target");
    textTargetInput.type = "text";
    textTargetInput.placeholder = "Add New*";
    const textTargetPanel = fieldNode("Target text", textTargetInput, "text-target-panel");
    textTargetPanel.hidden = true;

    const scopeSelect = formSelect("scope", [
      ["page", "This page"],
      ["site", "This site"],
      ["global", "Global"]
    ]);

    const keyCapture = roleButton("key-capture", "Press keys", "", "capture");
    const editableToggle = roleElement("input", "editable");
    editableToggle.type = "checkbox";
    const editableCheck = document.createElement("label");
    editableCheck.className = "check";
    editableCheck.append(editableToggle, labelText("Allow while typing in fields"));

    const conflictPanel = roleElement("div", "conflict-panel", "conflict");
    conflictPanel.hidden = true;
    const conflictText = roleElement("p", "conflict-text");
    const replaceConflictToggle = roleElement("input", "replace-conflict");
    replaceConflictToggle.type = "checkbox";
    const replaceConflictCheck = document.createElement("label");
    replaceConflictCheck.className = "check";
    replaceConflictCheck.append(replaceConflictToggle, labelText("Replace the existing shortcut"));
    conflictPanel.append(conflictText, replaceConflictCheck);

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      roleButton("test-target", "Test target", "target"),
      roleButton("save", "Save", "check", "primary"),
      roleButton("cancel", "Cancel", "x")
    );

    panel.append(
      title,
      fieldNode("Target method", targetModeSelect),
      pickerTargetPanel,
      textTargetPanel,
      fieldNode("Scope", scopeSelect),
      fieldNode("Shortcut", keyCapture),
      editableCheck,
      conflictPanel,
      actions
    );
  }

  function inlineFormNodes(panel) {
    return {
      panel,
      title: panel.querySelector("[data-role='form-title']"),
      targetModeSelect: panel.querySelector("[data-role='target-mode']"),
      pickerTargetPanel: panel.querySelector("[data-role='picker-target-panel']"),
      pickTargetButton: panel.querySelector("[data-role='pick-target']"),
      textTargetPanel: panel.querySelector("[data-role='text-target-panel']"),
      textTargetInput: panel.querySelector("[data-role='text-target']"),
      targetLabel: panel.querySelector("[data-role='target-label']"),
      scopeSelect: panel.querySelector("[data-role='scope']"),
      keyCapture: panel.querySelector("[data-role='key-capture']"),
      editableToggle: panel.querySelector("[data-role='editable']"),
      conflictPanel: panel.querySelector("[data-role='conflict-panel']"),
      conflictText: panel.querySelector("[data-role='conflict-text']"),
      replaceConflictToggle: panel.querySelector("[data-role='replace-conflict']"),
      saveButton: panel.querySelector("[data-role='save']"),
      testTargetButton: panel.querySelector("[data-role='test-target']"),
      cancelButton: panel.querySelector("[data-role='cancel']")
    };
  }

  function createInlineFormContext(panel) {
    appendInlineForm(panel);
    const context = {
      kind: "inline",
      model: null,
      nodes: inlineFormNodes(panel)
    };
    wireFormContext(context);
    return context;
  }

  function hideFormContext(context) {
    if (!context || !context.nodes || !context.nodes.panel) return;
    context.model = null;
    context.nodes.panel.hidden = true;
    context.nodes.panel.classList.remove("is-open");
    context.nodes.keyCapture.classList.remove("listening");
    context.nodes.conflictPanel.hidden = true;
    context.nodes.replaceConflictToggle.checked = false;
  }

  function closeActiveForm() {
    hideFormContext(activeFormContext);
    hideFormContext(topFormContext);
    activeEditId = null;
    activeFormContext = null;
  }

  function hideTopForm() {
    hideFormContext(topFormContext);
    if (activeFormContext === topFormContext) activeFormContext = null;
  }

  function closeInlineEdit(render = false) {
    if (activeFormContext && activeFormContext.kind === "inline") hideFormContext(activeFormContext);
    activeEditId = null;
    if (activeFormContext && activeFormContext.kind === "inline") activeFormContext = null;
    if (render) renderBindings();
  }

  function setFormContext(context, nextForm, options = {}) {
    context.model = nextForm;
    context.nodes.panel.hidden = !nextForm;
    if (context.kind === "inline") context.nodes.panel.classList.remove("is-open");
    context.nodes.conflictPanel.hidden = true;
    context.nodes.replaceConflictToggle.checked = false;
    context.nodes.keyCapture.classList.remove("listening");

    if (!nextForm) {
      if (activeFormContext === context) activeFormContext = null;
      return;
    }

    activeFormContext = context;
    const mode = targetModeFor(nextForm.target);
    context.nodes.title.textContent = nextForm.id ? "Edit shortcut" : "New shortcut";
    context.nodes.targetModeSelect.value = nextForm.targetMode || mode;
    context.nodes.textTargetInput.value = nextForm.target && nextForm.target.textQuery ? nextForm.target.textQuery : "";
    context.nodes.scopeSelect.value = nextForm.scopeType || "page";
    context.nodes.keyCapture.textContent = nextForm.keyCombo || "Press keys";
    context.nodes.editableToggle.checked = Boolean(nextForm.allowInEditable);
    syncFormUi(context);
    if (context.kind === "inline") {
      requestAnimationFrame(() => {
        if (activeFormContext === context && context.model === nextForm) {
          context.nodes.panel.classList.add("is-open");
        }
      });
    }
    if (!options.keepNotice) showNotice("", "");
  }

  function syncFormUi(context = activeFormContext) {
    if (!context || !context.model) return;
    const mode = context.nodes.targetModeSelect.value;
    const isPicker = mode === "picker";
    context.nodes.pickerTargetPanel.hidden = !isPicker;
    context.nodes.textTargetPanel.hidden = isPicker;
    setButtonLabel(context.nodes.pickTargetButton, context.model.id ? "Reselect element" : "Pick element");
    context.nodes.targetLabel.textContent = formTargetLabel(context.model.target);
    context.nodes.testTargetButton.disabled = !targetFromForm(false, context);
  }

  function setForm(nextForm) {
    if (!nextForm) {
      closeActiveForm();
      return;
    }
    closeInlineEdit(activeFormContext && activeFormContext.kind === "inline");
    activeEditId = null;
    setFormContext(topFormContext, nextForm);
  }

  function newForm() {
    setForm({
      id: "",
      target: null,
      targetMode: "picker",
      scopeType: "page",
      keyCombo: "",
      allowInEditable: false
    });
  }

  function renderProfiles() {
    const profiles = pageState && pageState.profiles ? pageState.profiles : [];
    els.profileSelect.textContent = "";
    for (const profile of profiles) {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      els.profileSelect.appendChild(option);
    }
    if (pageState && pageState.activeProfile) {
      els.profileSelect.value = pageState.activeProfile.id;
    }
    els.profileCount.textContent = String((pageState && pageState.bindings ? pageState.bindings : []).length);
  }

  function bindingSearchHaystack(binding) {
    return [
      binding.keyCombo,
      binding.scopeType,
      bindingTargetLabel(binding.target),
      statusText(binding)
    ].join(" ").toLowerCase();
  }

  function statusDotClass(binding) {
    return statusText(binding) === "Ready" ? "is-ready" : "is-attention";
  }

  function renderBindings() {
    const activeDraft = activeFormContext && activeFormContext.kind === "inline" && activeFormContext.model
      ? activeFormContext.model
      : null;
    let renderedActiveEdit = false;

    els.bindingsList.textContent = "";
    const query = els.searchInput.value.trim().toLowerCase();
    const bindings = (pageState && pageState.bindings ? pageState.bindings : [])
      .filter((binding) => !query || bindingSearchHaystack(binding).includes(query));

    if (!bindings.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = query ? "No matching shortcuts." : "No shortcuts for this page yet.";
      els.bindingsList.appendChild(empty);
      if (activeFormContext && activeFormContext.kind === "inline") activeFormContext = null;
      activeEditId = null;
      return;
    }

    for (const binding of bindings) {
      const item = document.createElement("article");
      item.className = "binding";
      item.classList.toggle("is-disabled", !binding.enabled);
      item.classList.toggle("is-editing", binding.id === activeEditId);
      const bindingMain = document.createElement("div");
      bindingMain.className = "binding-main";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "binding-toggle";
      toggleLabel.title = binding.enabled ? "Disable shortcut" : "Enable shortcut";
      const enabledToggle = document.createElement("input");
      enabledToggle.className = "binding-enabled";
      enabledToggle.type = "checkbox";
      enabledToggle.setAttribute("aria-label", binding.enabled ? "Disable shortcut" : "Enable shortcut");
      const toggleTrack = document.createElement("span");
      toggleTrack.setAttribute("aria-hidden", "true");
      toggleLabel.append(enabledToggle, toggleTrack);

      const label = document.createElement("div");
      label.className = "binding-label";
      const title = document.createElement("strong");
      title.textContent = bindingTargetLabel(binding.target);
      const subtitle = document.createElement("span");
      subtitle.className = "muted";
      subtitle.textContent = `${scopeLabel(binding)} · ${targetModeFor(binding.target)}`;
      label.append(title, subtitle);

      const combo = document.createElement("span");
      combo.className = "combo";
      combo.textContent = binding.keyCombo || "unset";
      const statusDot = document.createElement("span");
      statusDot.className = "binding-status-dot";
      statusDot.setAttribute("aria-hidden", "true");
      statusDot.classList.add(statusDotClass(binding));
      statusDot.title = statusText(binding);
      bindingMain.append(toggleLabel, label, combo, statusDot);

      const bindingActions = document.createElement("div");
      bindingActions.className = "binding-actions";
      const editButton = document.createElement("button");
      editButton.className = "binding-edit";
      editButton.type = "button";

      const menu = document.createElement("details");
      menu.className = "popup-menu more-menu binding-menu";
      const summary = document.createElement("summary");
      summary.title = "More actions";
      summary.setAttribute("aria-label", "More binding actions");
      summary.setAttribute("aria-haspopup", "menu");
      summary.appendChild(iconNode("more"));
      const menuActions = document.createElement("div");
      menuActions.className = "menu-popover binding-menu-actions";
      menu.append(summary, menuActions);
      bindingActions.append(editButton, menu);
      item.append(bindingMain, bindingActions);

      const editForm = document.createElement("div");
      editForm.className = "binding-edit-form";
      editForm.dataset.bindingId = binding.id;
      editForm.hidden = true;

      enabledToggle.checked = Boolean(binding.enabled);
      enabledToggle.addEventListener("change", () => toggleBinding(binding));
      if (binding.id === savedFlashId) {
        setButtonContent(editButton, "Saved", "check");
        editButton.disabled = true;
      } else {
        setButtonContent(editButton, "Edit", BUTTON_ICONS.Edit);
        editButton.addEventListener("click", () => {
          if (binding.id === activeEditId) {
            cancelForm(activeFormContext);
            return;
          }
          editBinding(binding);
        });
      }
      menuActions.append(
        button("Test", () => testTarget(binding.target)),
        button("Duplicate", () => duplicateBinding(binding)),
        button("Delete", () => deleteBinding(binding), { danger: true })
      );
      els.bindingsList.append(item, editForm);

      if (binding.id === activeEditId) {
        const context = createInlineFormContext(editForm);
        const draft = activeDraft && activeDraft.id === binding.id ? activeDraft : formModelFromBinding(binding);
        setFormContext(context, draft, { keepNotice: true });
        renderedActiveEdit = true;
      }
    }

    if (activeEditId && !renderedActiveEdit) {
      activeEditId = null;
      if (activeFormContext && activeFormContext.kind === "inline") activeFormContext = null;
    }
  }

  function button(label, onClick, options = {}) {
    const node = document.createElement("button");
    node.type = "button";
    setButtonContent(node, label, BUTTON_ICONS[label]);
    if (options.danger) node.classList.add("danger");
    node.addEventListener("click", onClick);
    return node;
  }

  async function loadState() {
    showNotice("", "");
    const state = await send({ type: M.GET_ACTIVE_PAGE_STATE });
    pageState = state;
    if (!state.ok) {
      setForm(null);
      const label = state.reason || "Unsupported page";
      els.pageLabel.textContent = label;
      els.pageLabel.title = label;
      els.controls.hidden = true;
      els.profilePanel.hidden = true;
      syncSettingsUi(state);
      showNotice(state.reason || "This page is not available to Firebinds.", "error");
      renderBindings();
      return;
    }

    els.controls.hidden = false;
    els.profilePanel.hidden = false;
    els.pageLabel.textContent = pageLabel(state.page.url);
    els.pageLabel.title = state.page.url || els.pageLabel.textContent;
    syncSettingsUi(state);
    renderProfiles();
    renderBindings();

    if (state.pendingPick && state.pendingPick.target) {
      const existing = state.bindings.find((binding) => binding.id === state.pendingPick.bindingId);
      const pickedForm = {
        id: existing ? existing.id : "",
        target: state.pendingPick.target,
        targetMode: "picker",
        scopeType: existing ? existing.scopeType : "page",
        keyCombo: existing ? existing.keyCombo : "",
        allowInEditable: existing ? existing.allowInEditable : false
      };
      if (existing) {
        editBinding(existing, pickedForm, { keepNotice: true });
      } else {
        setForm(pickedForm);
      }
      showNotice("Element selected. Finish and save the shortcut here.", "");
    }
    if (view === "settings") showView("settings", false);
  }

  async function startPicker(bindingId) {
    const result = await send({ type: M.START_PICKER, bindingId: bindingId || "" });
    if (!result.ok) {
      showNotice(result.reason || "Could not start picker.", "error");
      return;
    }
    window.close();
  }

  function editBinding(binding, draft = null, options = {}) {
    hideTopForm();
    activeEditId = binding.id;
    activeFormContext = {
      kind: "inline",
      model: draft || formModelFromBinding(binding),
      nodes: null
    };
    renderBindings();
    if (activeFormContext && activeFormContext.kind === "inline" && activeFormContext.nodes) {
      if (options.scroll !== false) {
        activeFormContext.nodes.panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    if (!options.keepNotice) showNotice("", "");
  }

  async function duplicateBinding(binding) {
    const result = await send({ type: M.DUPLICATE_BINDING, id: binding.id });
    if (!result.ok) {
      showNotice(result.reason || "Could not duplicate binding.", "error");
      return;
    }
    await loadState();
    editBinding(result.binding);
    showNotice("Duplicate created. Choose a shortcut and save it.", "");
  }

  async function toggleBinding(binding) {
    const result = await send({
      type: M.TOGGLE_BINDING,
      id: binding.id,
      enabled: !binding.enabled
    });
    if (!result.ok) {
      showNotice(result.reason || "Could not update binding.", "error");
      return;
    }
    await loadState();
  }

  async function deleteBinding(binding) {
    if (!confirm(`Delete ${binding.keyCombo || "unset key"} for ${bindingTargetLabel(binding.target)}?`)) return;
    const result = await send({ type: M.DELETE_BINDING, id: binding.id });
    if (!result.ok) {
      showNotice(result.reason || "Could not delete binding.", "error");
      return;
    }
    await loadState();
  }

  function capturedCombo(event, context = activeFormContext) {
    if (!context || !context.model) return;
    event.preventDefault();
    event.stopPropagation();
    const combo = KeyCombo.eventToCombo(event);
    const validation = KeyCombo.validateCombo(combo);
    context.model.keyCombo = combo;
    context.nodes.keyCapture.textContent = combo || "Press keys";
    showNotice(validation.ok ? "" : validation.reason, validation.ok ? "" : "error");
  }

  function targetFromForm(showErrors, context = activeFormContext) {
    if (!context || !context.model) return null;
    const mode = context.nodes.targetModeSelect.value;
    if (mode === "picker") {
      if (!context.model.target) {
        if (showErrors) showNotice("Pick an element first.", "error");
        return null;
      }
      return { ...context.model.target, mode: "picker" };
    }
    const query = context.nodes.textTargetInput.value.trim();
    if (!query) {
      if (showErrors) showNotice("Enter target text first.", "error");
      return null;
    }
    return Targeting.createTextDescriptor(mode, query);
  }

  async function testTarget(target, context = activeFormContext) {
    const targetToTest = target || targetFromForm(true, context);
    if (!targetToTest) return;
    const result = await send({ type: M.TEST_TARGET, target: targetToTest });
    if (!result.ok) {
      showNotice(result.reason || "Could not test target.", "error");
      return;
    }
    const copy = result.status === "ready"
      ? `Target ready${result.label ? `: ${result.label}` : "."}`
      : result.status === "ambiguous"
        ? "Target is ambiguous on this page."
        : "Target is missing on this page.";
    showNotice(copy, result.status === "ready" ? "" : "error");
  }

  function flashSavedBinding(bindingId) {
    window.clearTimeout(savedFlashTimer);
    savedFlashId = bindingId;
    renderBindings();
    savedFlashTimer = window.setTimeout(() => {
      if (savedFlashId !== bindingId) return;
      savedFlashId = null;
      renderBindings();
    }, 1500);
  }

  async function saveForm(context = activeFormContext) {
    if (!context || !context.model) return;
    const target = targetFromForm(true, context);
    if (!target) return;

    const validation = KeyCombo.validateCombo(context.model.keyCombo);
    if (!validation.ok) {
      showNotice(validation.reason, "error");
      return;
    }

    const scopeType = context.nodes.scopeSelect.value;
    const payload = {
      id: context.model.id || undefined,
      profileId: activeProfileId(),
      scopeType,
      scopeValue: scopeValue(scopeType),
      keyCombo: context.model.keyCombo,
      target,
      enabled: true,
      showIndicator: true,
      allowInEditable: context.nodes.editableToggle.checked,
      status: "ready",
      replaceConflict: context.nodes.replaceConflictToggle.checked
    };

    const message = context.model.id
      ? { type: M.UPDATE_BINDING, id: context.model.id, patch: payload }
      : { type: M.SAVE_BINDING, binding: payload };
    const result = await send(message);

    if (!result.ok && result.conflict) {
      context.nodes.conflictPanel.hidden = false;
      context.nodes.conflictText.textContent = result.reason;
      showNotice("Resolve the duplicate shortcut before saving.", "error");
      return;
    }
    if (!result.ok) {
      showNotice(result.reason || "Could not save binding.", "error");
      return;
    }

    const wasInlineEdit = context.kind === "inline";
    const savedId = result.binding && result.binding.id ? result.binding.id : context.model.id;
    await send({ type: M.CLEAR_PENDING_PICK });
    setForm(null);
    await loadState();
    if (wasInlineEdit && savedId) flashSavedBinding(savedId);
  }

  async function cancelForm(context = activeFormContext) {
    const wasInlineEdit = context && context.kind === "inline";
    await send({ type: M.CLEAR_PENDING_PICK });
    setForm(null);
    if (wasInlineEdit) renderBindings();
    showNotice("", "");
  }

  function wireFormContext(context) {
    const { nodes } = context;
    nodes.pickTargetButton.addEventListener("click", () => {
      if (!context.model) return;
      activeFormContext = context;
      startPicker(context.model.id);
    });
    nodes.targetModeSelect.addEventListener("change", () => {
      if (!context.model) return;
      activeFormContext = context;
      const nextMode = nodes.targetModeSelect.value;
      context.model.targetMode = nextMode;
      if (!context.model.target || targetModeFor(context.model.target) !== nextMode) context.model.target = null;
      syncFormUi(context);
    });
    nodes.textTargetInput.addEventListener("input", () => syncFormUi(context));
    nodes.keyCapture.addEventListener("click", () => {
      if (!context.model) return;
      activeFormContext = context;
      nodes.keyCapture.classList.add("listening");
      nodes.keyCapture.textContent = "Press keys...";
      nodes.keyCapture.focus();
    });
    nodes.keyCapture.addEventListener("keydown", (event) => {
      if (!context.model) return;
      activeFormContext = context;
      nodes.keyCapture.classList.remove("listening");
      capturedCombo(event, context);
    });
    nodes.saveButton.addEventListener("click", () => saveForm(context));
    nodes.cancelButton.addEventListener("click", () => cancelForm(context));
    nodes.testTargetButton.addEventListener("click", () => testTarget(null, context));
  }

  async function createProfile() {
    const name = prompt("Profile name", "New profile");
    if (!name) return;
    const result = await send({ type: M.SAVE_PROFILE, profile: { name } });
    if (!result.ok) {
      showNotice(result.reason || "Could not create profile.", "error");
      return;
    }
    await send({ type: M.SET_ACTIVE_PROFILE, id: result.profile.id });
    await loadState();
  }

  async function renameProfile() {
    if (!pageState || !pageState.activeProfile) return;
    const name = prompt("Rename profile", pageState.activeProfile.name);
    if (!name) return;
    const result = await send({ type: M.SAVE_PROFILE, profile: { id: pageState.activeProfile.id, name } });
    if (!result.ok) {
      showNotice(result.reason || "Could not rename profile.", "error");
      return;
    }
    await loadState();
  }

  async function duplicateProfile() {
    if (!pageState || !pageState.activeProfile) return;
    const result = await send({ type: M.DUPLICATE_PROFILE, id: pageState.activeProfile.id });
    if (!result.ok) {
      showNotice(result.reason || "Could not duplicate profile.", "error");
      return;
    }
    await loadState();
  }

  async function deleteProfile() {
    if (!pageState || !pageState.activeProfile) return;
    if (!confirm(`Delete profile "${pageState.activeProfile.name}" and its shortcuts?`)) return;
    const result = await send({ type: M.DELETE_PROFILE, id: pageState.activeProfile.id });
    if (!result.ok) {
      showNotice(result.reason || "Could not delete profile.", "error");
      return;
    }
    setForm(null);
    await loadState();
  }

  async function exportBackup() {
    const result = await send({ type: M.EXPORT_BACKUP });
    if (!result.ok) {
      showNotice(result.reason || "Could not export backup.", "error");
      return;
    }
    downloadJson(backupFileName(), result.backup);
    showNotice("Backup exported.", "");
  }

  async function importBackupFile(file, sourcePage = "popup") {
    await appendImportDebug("file-input-change", { hasFile: Boolean(file), sourcePage });
    if (!file) return;
    try {
      let backup;
      try {
        await appendImportDebug("file-read-start", { name: file.name, size: file.size, sourcePage });
        backup = JSON.parse(await file.text());
        await appendImportDebug("json-parse-ok", { sourcePage });
      } catch (_error) {
        showNotice("Backup file is not valid JSON.", "error");
        return;
      }
      await appendImportDebug("confirm-start", { sourcePage });
      if (!confirm("Importing this backup will replace all current Firebinds profiles and shortcuts.")) return;
      await appendImportDebug("message-send", { sourcePage });
      const result = await send({ type: M.IMPORT_BACKUP, backup });
      await appendImportDebug("message-result", { ok: Boolean(result && result.ok), reason: result && result.reason, sourcePage });
      if (!result.ok) {
        showNotice(result.reason || "Could not import backup.", "error");
        return;
      }
      setForm(null);
      await loadState();
      showNotice("Backup imported.", "");
    } catch (error) {
      showNotice(error.message || "Could not import backup.", "error");
    } finally {
      els.importFileInput.value = "";
    }
  }

  async function openImportPage() {
    try {
      await send({ type: M.CLEAR_IMPORT_DEBUG });
      await appendImportDebug("import-click");
      const url = browser.runtime.getURL("popup/import.html");
      if (await isFirefox()) {
        await browser.windows.create({ url, type: "popup", width: 420, height: 560 });
        window.close();
      } else {
        els.importFileInput.value = "";
        els.importFileInput.focus();
        els.importFileInput.click();
      }
    } catch (error) {
      showNotice(error.message || "Could not open import page.", "error");
    }
  }

  wireFormContext(topFormContext);
  els.refreshButton.addEventListener("click", loadState);
  els.settingsButton.addEventListener("click", () => showView("settings"));
  els.settingsBackButton.addEventListener("click", () => showView("main"));
  els.profileSelect.addEventListener("change", async () => {
    await send({ type: M.SET_ACTIVE_PROFILE, id: els.profileSelect.value });
    setForm(null);
    await loadState();
  });
  els.newProfileButton.addEventListener("click", createProfile);
  els.renameProfileButton.addEventListener("click", renameProfile);
  els.duplicateProfileButton.addEventListener("click", duplicateProfile);
  els.deleteProfileButton.addEventListener("click", deleteProfile);
  document.addEventListener("toggle", (event) => {
    const menu = event.target && event.target.closest ? event.target.closest(".popup-menu") : null;
    if (!menu) return;
    if (menu.open) {
      closePopupMenus(menu);
      requestAnimationFrame(() => positionPopupMenu(menu));
    } else {
      menu.classList.remove("menu-flip");
    }
  }, true);
  document.addEventListener("click", (event) => {
    const menu = event.target && event.target.closest ? event.target.closest(".popup-menu") : null;
    if (!menu) {
      closePopupMenus();
      return;
    }
    if (event.target.closest(".menu-popover button")) {
      menu.open = false;
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopupMenus(null, true);
  });
  document.addEventListener("wheel", preventBrowserZoom, { passive: false });
  document.addEventListener("keydown", preventBrowserZoom);
  els.exportButton.addEventListener("click", exportBackup);
  els.importButton.addEventListener("click", openImportPage);
  els.importFileInput.addEventListener("change", () => importBackupFile(els.importFileInput.files[0]));
  els.addButton.addEventListener("click", newForm);
  els.searchInput.addEventListener("input", renderBindings);
  els.indicatorsToggle.addEventListener("change", async () => {
    if (!pageState || !pageState.ok) return;
    await send({
      type: M.SET_INDICATORS_VISIBLE,
      profileId: activeProfileId(),
      scopeType: "page",
      scopeValue: pageState.page.pageScope,
      visible: els.indicatorsToggle.checked
    });
    await loadState();
  });
  els.indicatorOpacityRange.addEventListener("input", () => {
    syncOpacityControl(els.indicatorOpacityRange.value);
  });
  els.indicatorOpacityRange.addEventListener("change", async () => {
    const result = await send({
      type: M.SET_INDICATOR_OPACITY,
      opacity: Number(els.indicatorOpacityRange.value)
    });
    if (!result.ok) {
      showNotice(result.reason || "Could not update indicator opacity.", "error");
      return;
    }
    await loadState();
  });
  els.debugKeysToggle.addEventListener("change", async () => {
    const result = await send({
      type: M.SET_DEBUG_KEYS,
      enabled: els.debugKeysToggle.checked
    });
    if (!result.ok) {
      showNotice(result.reason || "Could not update debug setting.", "error");
      return;
    }
    await loadState();
  });
  window.addEventListener("pagehide", (event) => {
    appendImportDebug("pagehide", { persisted: Boolean(event.persisted) });
  });
  window.addEventListener("beforeunload", () => {
    appendImportDebug("beforeunload");
  });
  document.addEventListener("visibilitychange", () => {
    appendImportDebug("visibilitychange");
  });

  resetPageZoom().catch((_error) => {});
  loadState().catch((error) => {
    showNotice(error.message || "Could not load Firebinds.", "error");
  });
})(globalThis);
