(function initBackground(global) {
  const M = global.Firebinds.Messages;
  const Storage = global.Firebinds.Storage;
  const Targeting = global.Firebinds.Targeting;
  const KeyCombo = global.Firebinds.KeyCombo;

  let pendingPick = null;

  function isAllowedUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "file:";
    } catch (_error) {
      return false;
    }
  }

  async function activeTab() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0] || null;
  }

  async function ensureContent(tabId) {
    try {
      await browser.tabs.sendMessage(tabId, { type: M.PING });
      return;
    } catch (_error) {
      await browser.scripting.insertCSS({ target: { tabId }, files: ["src/content.css"] });
      await browser.scripting.executeScript({
        target: { tabId },
        files: ["src/messages.js", "src/key-combo.js", "src/targeting.js", "src/content.js"]
      });
    }
  }

  async function stateForUrl(url) {
    if (!isAllowedUrl(url)) {
      return {
        ok: false,
        restricted: true,
        reason: "Firebinds can only run on normal webpages.",
        bindings: [],
        pendingPick: null,
        indicatorsVisible: false
      };
    }

    const pageScope = Targeting.normalizeScope(url, "page");
    const siteScope = Targeting.normalizeScope(url, "site");
    const globalScope = Targeting.normalizeScope(url, "global");
    const profiles = await Storage.listProfiles();
    const activeProfile = await Storage.getActiveProfile();
    const bindings = await Storage.getBindingsForUrl(url);
    const indicatorsVisible = await Storage.getIndicatorsVisible(activeProfile.id, "page", pageScope);
    const debugKeys = await Storage.getDebugKeys();
    return {
      ok: true,
      restricted: false,
      page: { url, pageScope, siteScope, globalScope },
      profiles,
      activeProfile,
      bindings,
      pendingPick,
      indicatorsVisible,
      debugKeys
    };
  }

  async function activePageState() {
    const tab = await activeTab();
    if (!tab || !tab.url) {
      return { ok: false, restricted: true, reason: "No active webpage is available." };
    }
    return stateForUrl(tab.url);
  }

  async function applyState(tabId, url) {
    if (!tabId || !url || !isAllowedUrl(url)) return;
    const state = await stateForUrl(url);
    try {
      await browser.tabs.sendMessage(tabId, { type: M.APPLY_STATE, state });
    } catch (_error) {
      // The tab may not have a content script yet; it will ask for state on load.
    }
  }

  async function saveBinding(input) {
    const validation = KeyCombo.validateCombo(input.keyCombo);
    if (!validation.ok) return { ok: false, reason: validation.reason };

    const conflict = await Storage.findConflict(
      input.profileId,
      input.scopeType,
      input.scopeValue,
      input.keyCombo,
      input.id
    );
    if (conflict && !input.replaceConflict) {
      return { ok: false, conflict, reason: `${input.keyCombo} is already used for this scope.` };
    }
    if (conflict && input.replaceConflict) {
      await Storage.deleteBinding(conflict.id);
    }

    const binding = await Storage.saveBinding(input);
    const tab = await activeTab();
    if (tab) await applyState(tab.id, tab.url);
    return { ok: true, binding };
  }

  async function updateBinding(id, patch) {
    if (patch.keyCombo) {
      const validation = KeyCombo.validateCombo(patch.keyCombo);
      if (!validation.ok) return { ok: false, reason: validation.reason };
      const conflict = await Storage.findConflict(
        patch.profileId,
        patch.scopeType,
        patch.scopeValue,
        patch.keyCombo,
        id
      );
      if (conflict && !patch.replaceConflict) {
        return { ok: false, conflict, reason: `${patch.keyCombo} is already used for this scope.` };
      }
      if (conflict && patch.replaceConflict) {
        await Storage.deleteBinding(conflict.id);
      }
    }
    const binding = await Storage.updateBinding(id, patch);
    const tab = await activeTab();
    if (tab) await applyState(tab.id, tab.url);
    return { ok: true, binding };
  }

  async function startPicker(message) {
    const tab = await activeTab();
    if (!tab || !tab.url || !isAllowedUrl(tab.url)) {
      return { ok: false, reason: "This page does not allow element picking." };
    }
    try {
      await ensureContent(tab.id);
    } catch (_error) {
      return { ok: false, reason: "This page does not allow Firebinds to select elements." };
    }
    pendingPick = {
      tabId: tab.id,
      url: tab.url,
      bindingId: message.bindingId || "",
      mode: message.bindingId ? "reselect" : "create",
      startedAt: new Date().toISOString()
    };
    await browser.action.setBadgeText({ text: "..." });
    await browser.action.setTitle({ title: "Firebinds: pick an element on the page" });
    await browser.tabs.sendMessage(tab.id, { type: M.START_PICKER, bindingId: message.bindingId || "" });
    return { ok: true };
  }

  async function handlePickerResult(message, sender) {
    if (!sender.tab || !pendingPick || sender.tab.id !== pendingPick.tabId) {
      return { ok: false, reason: "Picker result did not match the active picker." };
    }
    pendingPick = {
      ...pendingPick,
      target: message.target,
      completedAt: new Date().toISOString()
    };
    await browser.action.setBadgeText({ text: "1" });
    await browser.action.setTitle({ title: "Firebinds: finish the keybind in the popup" });
    try {
      await browser.action.openPopup();
    } catch (_error) {
      // Firefox may reject this in some contexts; the badge/title gives a clear fallback.
    }
    return { ok: true };
  }

  async function handleMessage(message, sender) {
    switch (message.type) {
      case M.PING:
        return { ok: true };
      case M.GET_ACTIVE_PAGE_STATE:
        return activePageState();
      case M.GET_CONTENT_STATE:
        return stateForUrl(sender.tab && sender.tab.url ? sender.tab.url : message.url);
      case M.START_PICKER:
        return startPicker(message);
      case M.CANCEL_PICKER:
      case M.PICKER_CANCELLED:
        pendingPick = null;
        await browser.action.setBadgeText({ text: "" });
        return { ok: true };
      case M.PICKER_RESULT:
        return handlePickerResult(message, sender);
      case M.GET_PENDING_PICK:
        return { ok: true, pendingPick };
      case M.CLEAR_PENDING_PICK:
        pendingPick = null;
        await browser.action.setBadgeText({ text: "" });
        return { ok: true };
      case M.SAVE_BINDING:
        return saveBinding(message.binding);
      case M.UPDATE_BINDING:
        return updateBinding(message.id, message.patch);
      case M.DELETE_BINDING: {
        await Storage.deleteBinding(message.id);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true };
      }
      case M.TOGGLE_BINDING: {
        const binding = await Storage.updateBinding(message.id, { enabled: Boolean(message.enabled) });
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true, binding };
      }
      case M.SET_INDICATORS_VISIBLE: {
        await Storage.setIndicatorsVisible(message.profileId, message.scopeType, message.scopeValue, message.visible);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true };
      }
      case M.SET_DEBUG_KEYS: {
        await Storage.setDebugKeys(message.enabled);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true };
      }
      case M.BINDING_STATUS:
        await Storage.updateBinding(message.id, { status: message.status });
        return { ok: true };
      case M.LIST_PROFILES:
        return {
          ok: true,
          profiles: await Storage.listProfiles(),
          activeProfile: await Storage.getActiveProfile()
        };
      case M.SAVE_PROFILE: {
        const profile = await Storage.saveProfile(message.profile || {});
        return { ok: true, profile, profiles: await Storage.listProfiles() };
      }
      case M.DELETE_PROFILE: {
        const activeProfile = await Storage.deleteProfile(message.id);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true, activeProfile, profiles: await Storage.listProfiles() };
      }
      case M.DUPLICATE_PROFILE: {
        const profile = await Storage.duplicateProfile(message.id);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true, profile, profiles: await Storage.listProfiles() };
      }
      case M.SET_ACTIVE_PROFILE: {
        const activeProfile = await Storage.setActiveProfile(message.id);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true, activeProfile, profiles: await Storage.listProfiles() };
      }
      case M.DUPLICATE_BINDING: {
        const binding = await Storage.duplicateBinding(message.id);
        const tab = await activeTab();
        if (tab) await applyState(tab.id, tab.url);
        return { ok: true, binding };
      }
      case M.TEST_TARGET: {
        const tab = await activeTab();
        if (!tab || !tab.url || !isAllowedUrl(tab.url)) {
          return { ok: false, reason: "No normal webpage is available for testing." };
        }
        try {
          await ensureContent(tab.id);
          return browser.tabs.sendMessage(tab.id, { type: M.CHECK_TARGET, target: message.target });
        } catch (_error) {
          return { ok: false, reason: "Could not test this target on the current page." };
        }
      }
      default:
        return { ok: false, reason: `Unknown message: ${message.type}` };
    }
  }

  browser.runtime.onMessage.addListener((message, sender) => handleMessage(message, sender));
})(globalThis);
