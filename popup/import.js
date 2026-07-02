(function initImportPage(global) {
  const M = global.Firebinds.Messages;
  const IMPORT_DEBUG_KEY = "firebinds.importDebug";

  const els = {
    notice: document.getElementById("notice"),
    importFileInput: document.getElementById("importFileInput"),
    fileSummary: document.getElementById("fileSummary"),
    importButton: document.getElementById("importButton"),
    closeButton: document.getElementById("closeButton"),
    debugOutput: document.getElementById("debugOutput"),
    refreshDebugButton: document.getElementById("refreshDebugButton"),
    clearDebugButton: document.getElementById("clearDebugButton")
  };

  let selectedFile = null;

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
      // Zoom reset is best-effort; import should keep working without it.
    }
  }

  function showNotice(text, kind) {
    els.notice.hidden = !text;
    els.notice.textContent = text || "";
    els.notice.classList.toggle("error", kind === "error");
  }

  function fileLabel(file) {
    if (!file) return "No file selected.";
    const size = file.size < 1024 ? `${file.size} B` : `${Math.round(file.size / 1024)} KB`;
    return `${file.name} (${size})`;
  }

  async function readDebugEntries() {
    try {
      const result = await send({ type: M.GET_IMPORT_DEBUG });
      if (result && result.ok) return Array.isArray(result.entries) ? result.entries : [];
    } catch (_error) {
      // Fall through to direct storage; useful if the background handler is unavailable while debugging.
    }
    const result = await browser.storage.local.get(IMPORT_DEBUG_KEY);
    return Array.isArray(result[IMPORT_DEBUG_KEY]) ? result[IMPORT_DEBUG_KEY] : [];
  }

  async function appendImportDebug(stage, detail = {}) {
    const entry = {
      stage,
      at: new Date().toISOString(),
      page: "import",
      visibility: document.visibilityState,
      detail
    };
    try {
      const result = await browser.storage.local.get(IMPORT_DEBUG_KEY);
      const entries = Array.isArray(result[IMPORT_DEBUG_KEY]) ? result[IMPORT_DEBUG_KEY] : [];
      await browser.storage.local.set({ [IMPORT_DEBUG_KEY]: [...entries, entry].slice(-100) });
      await renderDebug();
    } catch (error) {
      console.info("[Firebinds import debug]", entry, error);
    }
  }

  async function renderDebug() {
    const entries = await readDebugEntries();
    els.debugOutput.textContent = entries.length
      ? entries.map((entry) => `${entry.at} ${entry.page}:${entry.stage} ${JSON.stringify(entry.detail || {})}`).join("\n")
      : "No debug entries yet.";
  }

  async function clearDebug() {
    try {
      await send({ type: M.CLEAR_IMPORT_DEBUG });
    } catch (_error) {
      await browser.storage.local.set({ [IMPORT_DEBUG_KEY]: [] });
    }
    await renderDebug();
  }

  async function importBackupFile(file) {
    if (!file) return;

    let backup;
    try {
      await appendImportDebug("file-read-start", { name: file.name, size: file.size });
      backup = JSON.parse(await file.text());
      await appendImportDebug("json-parse-ok");
    } catch (_error) {
      showNotice("Backup file is not valid JSON.", "error");
      return;
    }

    await appendImportDebug("confirm-start");
    if (!confirm("Importing this backup will replace all current Firebinds profiles and shortcuts.")) {
      await appendImportDebug("confirm-cancelled");
      return;
    }

    els.importButton.disabled = true;
    showNotice("Importing backup...", "");
    await appendImportDebug("message-send");
    try {
      const result = await send({ type: M.IMPORT_BACKUP, backup });
      await appendImportDebug("message-result", { ok: Boolean(result && result.ok), reason: result && result.reason });
      if (!result.ok) {
        showNotice(result.reason || "Could not import backup.", "error");
        return;
      }
      selectedFile = null;
      els.importFileInput.value = "";
      els.fileSummary.textContent = fileLabel(null);
      showNotice("Backup imported.", "");
      window.setTimeout(() => window.close(), 350);
    } catch (error) {
      await appendImportDebug("message-result", { ok: false, reason: error.message || "Extension error." });
      showNotice(error.message || "Could not import backup.", "error");
    } finally {
      els.importButton.disabled = !selectedFile;
    }
  }

  els.importFileInput.addEventListener("change", async () => {
    selectedFile = els.importFileInput.files[0] || null;
    els.fileSummary.textContent = fileLabel(selectedFile);
    els.importButton.disabled = !selectedFile;
    showNotice("", "");
    await appendImportDebug("file-input-change", { hasFile: Boolean(selectedFile), name: selectedFile && selectedFile.name });
  });

  els.importButton.addEventListener("click", () => importBackupFile(selectedFile));
  els.closeButton.addEventListener("click", () => window.close());
  els.refreshDebugButton.addEventListener("click", renderDebug);
  els.clearDebugButton.addEventListener("click", clearDebug);
  document.addEventListener("wheel", preventBrowserZoom, { passive: false });
  document.addEventListener("keydown", preventBrowserZoom);

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
  appendImportDebug("import-page-loaded").catch((_error) => {});
})(globalThis);
