(function initPopup(global) {
  const M = global.Firebinds.Messages;
  const KeyCombo = global.Firebinds.KeyCombo;
  const Targeting = global.Firebinds.Targeting;

  const els = {
    pageLabel: document.getElementById("pageLabel"),
    notice: document.getElementById("notice"),
    controls: document.getElementById("controls"),
    refreshButton: document.getElementById("refreshButton"),
    profilePanel: document.getElementById("profilePanel"),
    profileSelect: document.getElementById("profileSelect"),
    profileCount: document.getElementById("profileCount"),
    newProfileButton: document.getElementById("newProfileButton"),
    renameProfileButton: document.getElementById("renameProfileButton"),
    duplicateProfileButton: document.getElementById("duplicateProfileButton"),
    deleteProfileButton: document.getElementById("deleteProfileButton"),
    optionsMenu: document.querySelector(".options-menu"),
    backupMenu: document.querySelector(".backup-menu"),
    exportButton: document.getElementById("exportButton"),
    importButton: document.getElementById("importButton"),
    importFileInput: document.getElementById("importFileInput"),
    addButton: document.getElementById("addButton"),
    indicatorsToggle: document.getElementById("indicatorsToggle"),
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
  let form = null;

  const BUTTON_ICONS = {
    Edit: "edit",
    Duplicate: "copy",
    Test: "target",
    Disable: "power",
    Enable: "power",
    Delete: "trash"
  };

  function send(message) {
    return browser.runtime.sendMessage(message);
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

  function showNotice(text, kind) {
    els.notice.hidden = !text;
    els.notice.textContent = text || "";
    els.notice.classList.toggle("error", kind === "error");
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

  function syncFormUi() {
    if (!form) return;
    const mode = els.targetModeSelect.value;
    const isPicker = mode === "picker";
    els.pickerTargetPanel.hidden = !isPicker;
    els.textTargetPanel.hidden = isPicker;
    setButtonLabel(els.pickTargetButton, form.id ? "Reselect element" : "Pick element");
    els.targetLabel.textContent = bindingTargetLabel(form.target);
    els.testTargetButton.disabled = !targetFromForm(false);
  }

  function setForm(nextForm) {
    form = nextForm;
    els.formPanel.hidden = !form;
    els.conflictPanel.hidden = true;
    els.replaceConflictToggle.checked = false;

    if (!form) return;
    const mode = targetModeFor(form.target);
    els.formTitle.textContent = form.id ? "Edit keybind" : "New keybind";
    els.targetModeSelect.value = form.targetMode || mode;
    els.textTargetInput.value = form.target && form.target.textQuery ? form.target.textQuery : "";
    els.scopeSelect.value = form.scopeType || "page";
    els.keyCapture.textContent = form.keyCombo || "Press keys";
    els.editableToggle.checked = Boolean(form.allowInEditable);
    syncFormUi();
    showNotice("", "");
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

  function renderBindings() {
    els.bindingsList.textContent = "";
    const query = els.searchInput.value.trim().toLowerCase();
    const bindings = (pageState && pageState.bindings ? pageState.bindings : [])
      .filter((binding) => !query || bindingSearchHaystack(binding).includes(query));

    if (!bindings.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = query ? "No matching keybinds." : "No keybinds for this page yet.";
      els.bindingsList.appendChild(empty);
      return;
    }

    for (const binding of bindings) {
      const item = document.createElement("article");
      item.className = "binding";
      item.innerHTML = `
        <div class="binding-main">
          <div class="binding-label">
            <strong></strong>
            <span class="muted"></span>
          </div>
          <span class="combo"></span>
        </div>
        <div class="binding-actions">
          <button class="binding-edit" type="button"></button>
          <details class="popup-menu more-menu binding-menu">
            <summary title="More actions" aria-label="More binding actions">
              <svg class="button-icon" aria-hidden="true"><use href="#icon-more"></use></svg>
            </summary>
            <div class="menu-popover binding-menu-actions"></div>
          </details>
        </div>
      `;

      item.querySelector("strong").textContent = bindingTargetLabel(binding.target);
      item.querySelector(".muted").textContent = `${scopeLabel(binding)} · ${targetModeFor(binding.target)} · ${statusText(binding)}`;
      item.querySelector(".combo").textContent = binding.keyCombo || "unset";
      const editButton = item.querySelector(".binding-edit");
      const menuActions = item.querySelector(".binding-menu-actions");

      setButtonContent(editButton, "Edit", BUTTON_ICONS.Edit);
      editButton.addEventListener("click", () => editBinding(binding));
      menuActions.append(
        button("Test", () => testTarget(binding.target)),
        button("Duplicate", () => duplicateBinding(binding)),
        button(binding.enabled ? "Disable" : "Enable", () => toggleBinding(binding)),
        button("Delete", () => deleteBinding(binding), { danger: true })
      );
      els.bindingsList.appendChild(item);
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
      els.pageLabel.textContent = state.reason || "Unsupported page";
      els.controls.hidden = true;
      els.profilePanel.hidden = true;
      showNotice(state.reason || "This page is not available to Firebinds.", "error");
      renderBindings();
      return;
    }

    els.controls.hidden = false;
    els.profilePanel.hidden = false;
    els.pageLabel.textContent = pageLabel(state.page.url);
    els.indicatorsToggle.checked = Boolean(state.indicatorsVisible);
    els.debugKeysToggle.checked = Boolean(state.debugKeys);
    renderProfiles();
    renderBindings();

    if (state.pendingPick && state.pendingPick.target) {
      const existing = state.bindings.find((binding) => binding.id === state.pendingPick.bindingId);
      setForm({
        id: existing ? existing.id : "",
        target: state.pendingPick.target,
        targetMode: "picker",
        scopeType: existing ? existing.scopeType : "page",
        keyCombo: existing ? existing.keyCombo : "",
        allowInEditable: existing ? existing.allowInEditable : false
      });
      showNotice("Element selected. Finish and save the keybind here.", "");
    }
  }

  async function startPicker(bindingId) {
    const result = await send({ type: M.START_PICKER, bindingId: bindingId || "" });
    if (!result.ok) {
      showNotice(result.reason || "Could not start picker.", "error");
      return;
    }
    window.close();
  }

  function editBinding(binding) {
    setForm({
      id: binding.id,
      target: binding.target,
      targetMode: targetModeFor(binding.target),
      scopeType: binding.scopeType,
      keyCombo: binding.keyCombo,
      allowInEditable: binding.allowInEditable
    });
  }

  async function duplicateBinding(binding) {
    const result = await send({ type: M.DUPLICATE_BINDING, id: binding.id });
    if (!result.ok) {
      showNotice(result.reason || "Could not duplicate binding.", "error");
      return;
    }
    await loadState();
    editBinding(result.binding);
    showNotice("Duplicate created. Choose a keybind and save it.", "");
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

  function capturedCombo(event) {
    event.preventDefault();
    event.stopPropagation();
    const combo = KeyCombo.eventToCombo(event);
    const validation = KeyCombo.validateCombo(combo);
    form.keyCombo = combo;
    els.keyCapture.textContent = combo || "Press keys";
    showNotice(validation.ok ? "" : validation.reason, validation.ok ? "" : "error");
  }

  function targetFromForm(showErrors) {
    if (!form) return null;
    const mode = els.targetModeSelect.value;
    if (mode === "picker") {
      if (!form.target) {
        if (showErrors) showNotice("Pick an element first.", "error");
        return null;
      }
      return { ...form.target, mode: "picker" };
    }
    const query = els.textTargetInput.value.trim();
    if (!query) {
      if (showErrors) showNotice("Enter target text first.", "error");
      return null;
    }
    return Targeting.createTextDescriptor(mode, query);
  }

  async function testTarget(target) {
    const targetToTest = target || targetFromForm(true);
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

  async function saveForm() {
    const target = targetFromForm(true);
    if (!target) return;

    const validation = KeyCombo.validateCombo(form.keyCombo);
    if (!validation.ok) {
      showNotice(validation.reason, "error");
      return;
    }

    const scopeType = els.scopeSelect.value;
    const payload = {
      id: form.id || undefined,
      profileId: activeProfileId(),
      scopeType,
      scopeValue: scopeValue(scopeType),
      keyCombo: form.keyCombo,
      target,
      enabled: true,
      showIndicator: true,
      allowInEditable: els.editableToggle.checked,
      status: "ready",
      replaceConflict: els.replaceConflictToggle.checked
    };

    const message = form.id
      ? { type: M.UPDATE_BINDING, id: form.id, patch: payload }
      : { type: M.SAVE_BINDING, binding: payload };
    const result = await send(message);

    if (!result.ok && result.conflict) {
      els.conflictPanel.hidden = false;
      els.conflictText.textContent = result.reason;
      showNotice("Resolve the duplicate keybind before saving.", "error");
      return;
    }
    if (!result.ok) {
      showNotice(result.reason || "Could not save binding.", "error");
      return;
    }

    await send({ type: M.CLEAR_PENDING_PICK });
    setForm(null);
    await loadState();
  }

  async function cancelForm() {
    await send({ type: M.CLEAR_PENDING_PICK });
    setForm(null);
    showNotice("", "");
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
    if (!confirm(`Delete profile "${pageState.activeProfile.name}" and its bindings?`)) return;
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
    if (els.backupMenu) els.backupMenu.open = false;
    showNotice("Backup exported.", "");
  }

  async function importBackupFile(file) {
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!confirm("Importing this backup will replace all current Firebinds profiles and keybinds.")) return;
      const result = await send({ type: M.IMPORT_BACKUP, backup });
      if (!result.ok) {
        showNotice(result.reason || "Could not import backup.", "error");
        return;
      }
      setForm(null);
      await loadState();
      showNotice("Backup imported.", "");
    } catch (error) {
      showNotice(error.message || "Backup file is not valid JSON.", "error");
    } finally {
      els.importFileInput.value = "";
    }
  }

  els.refreshButton.addEventListener("click", loadState);
  els.profileSelect.addEventListener("change", async () => {
    await send({ type: M.SET_ACTIVE_PROFILE, id: els.profileSelect.value });
    setForm(null);
    await loadState();
  });
  els.newProfileButton.addEventListener("click", createProfile);
  els.renameProfileButton.addEventListener("click", renameProfile);
  els.duplicateProfileButton.addEventListener("click", duplicateProfile);
  els.deleteProfileButton.addEventListener("click", deleteProfile);
  els.optionsMenu.addEventListener("toggle", () => {
    if (els.optionsMenu.open && els.backupMenu) els.backupMenu.open = false;
  });
  els.backupMenu.addEventListener("toggle", () => {
    if (els.backupMenu.open && els.optionsMenu) els.optionsMenu.open = false;
  });
  els.exportButton.addEventListener("click", exportBackup);
  els.importButton.addEventListener("click", () => {
    if (els.backupMenu) els.backupMenu.open = false;
    els.importFileInput.click();
  });
  els.importFileInput.addEventListener("change", () => importBackupFile(els.importFileInput.files[0]));
  els.addButton.addEventListener("click", newForm);
  els.pickTargetButton.addEventListener("click", () => startPicker(form && form.id));
  els.targetModeSelect.addEventListener("change", () => {
    if (!form) return;
    const nextMode = els.targetModeSelect.value;
    form.targetMode = nextMode;
    if (!form.target || targetModeFor(form.target) !== nextMode) form.target = null;
    syncFormUi();
  });
  els.textTargetInput.addEventListener("input", syncFormUi);
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
  els.debugKeysToggle.addEventListener("change", async () => {
    if (!pageState || !pageState.ok) return;
    await send({
      type: M.SET_DEBUG_KEYS,
      enabled: els.debugKeysToggle.checked
    });
    await loadState();
  });
  els.keyCapture.addEventListener("click", () => {
    els.keyCapture.classList.add("listening");
    els.keyCapture.textContent = "Press keys...";
    els.keyCapture.focus();
  });
  els.keyCapture.addEventListener("keydown", (event) => {
    if (!form) return;
    els.keyCapture.classList.remove("listening");
    capturedCombo(event);
  });
  els.saveButton.addEventListener("click", saveForm);
  els.cancelButton.addEventListener("click", cancelForm);
  els.testTargetButton.addEventListener("click", () => testTarget());

  loadState().catch((error) => {
    showNotice(error.message || "Could not load Firebinds.", "error");
  });
})(globalThis);
