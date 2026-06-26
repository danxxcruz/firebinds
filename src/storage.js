(function initStorage(global) {
  const Firebinds = global.Firebinds || (global.Firebinds = {});
  const BINDINGS_KEY = "firebinds.bindings";
  const SETTINGS_KEY = "firebinds.settings";
  const PROFILES_KEY = "firebinds.profiles";
  const ACTIVE_PROFILE_KEY = "firebinds.activeProfileId";
  const DEFAULT_PROFILE_ID = "profile-default";
  const GLOBAL_SCOPE_VALUE = "*";

  let initPromise = null;

  function now() {
    return new Date().toISOString();
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function defaultProfile() {
    return {
      id: DEFAULT_PROFILE_ID,
      name: "Default",
      createdAt: now(),
      updatedAt: now()
    };
  }

  function scopeKey(profileId, scopeType, scopeValue) {
    return `${profileId}:${scopeType}:${scopeValue}`;
  }

  async function rawGet(keys) {
    return browser.storage.local.get(keys);
  }

  async function ensureInitialized() {
    if (!initPromise) initPromise = migrateStorage();
    return initPromise;
  }

  async function migrateStorage() {
    const result = await rawGet([BINDINGS_KEY, SETTINGS_KEY, PROFILES_KEY, ACTIVE_PROFILE_KEY]);
    let profiles = Array.isArray(result[PROFILES_KEY]) ? result[PROFILES_KEY] : [];
    let activeProfileId = result[ACTIVE_PROFILE_KEY];
    let bindings = Array.isArray(result[BINDINGS_KEY]) ? result[BINDINGS_KEY] : [];
    const settings = result[SETTINGS_KEY] || {};
    let changed = false;

    if (!profiles.length) {
      profiles = [defaultProfile()];
      changed = true;
    }
    if (!activeProfileId || !profiles.some((profile) => profile.id === activeProfileId)) {
      activeProfileId = profiles[0].id;
      changed = true;
    }

    bindings = bindings.map((binding) => {
      let next = binding;
      if (!next.profileId) {
        next = { ...next, profileId: activeProfileId };
        changed = true;
      }
      if (!next.target || !next.target.mode) {
        next = { ...next, target: { ...(next.target || {}), mode: "picker" } };
        changed = true;
      }
      if (next.scopeType === "global" && next.scopeValue !== GLOBAL_SCOPE_VALUE) {
        next = { ...next, scopeValue: GLOBAL_SCOPE_VALUE };
        changed = true;
      }
      return next;
    });

    settings.indicatorVisibility = settings.indicatorVisibility || {};

    if (changed) {
      await browser.storage.local.set({
        [BINDINGS_KEY]: bindings,
        [SETTINGS_KEY]: settings,
        [PROFILES_KEY]: profiles,
        [ACTIVE_PROFILE_KEY]: activeProfileId
      });
    }
  }

  async function getAllBindings() {
    await ensureInitialized();
    const result = await rawGet(BINDINGS_KEY);
    return Array.isArray(result[BINDINGS_KEY]) ? result[BINDINGS_KEY] : [];
  }

  async function writeAllBindings(bindings) {
    await ensureInitialized();
    await browser.storage.local.set({ [BINDINGS_KEY]: bindings });
    return bindings;
  }

  async function listProfiles() {
    await ensureInitialized();
    const result = await rawGet(PROFILES_KEY);
    return Array.isArray(result[PROFILES_KEY]) ? result[PROFILES_KEY] : [defaultProfile()];
  }

  async function getActiveProfile() {
    await ensureInitialized();
    const result = await rawGet(ACTIVE_PROFILE_KEY);
    const profiles = await listProfiles();
    return profiles.find((profile) => profile.id === result[ACTIVE_PROFILE_KEY]) || profiles[0];
  }

  async function setActiveProfile(profileId) {
    const profiles = await listProfiles();
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) throw new Error("Profile not found.");
    await browser.storage.local.set({ [ACTIVE_PROFILE_KEY]: profileId });
    return profile;
  }

  async function saveProfile(input) {
    const profiles = await listProfiles();
    const timestamp = now();
    const name = String(input.name || "").trim() || "Untitled profile";
    let saved;
    let next;
    if (input.id) {
      next = profiles.map((profile) => {
        if (profile.id !== input.id) return profile;
        saved = { ...profile, name, updatedAt: timestamp };
        return saved;
      });
      if (!saved) throw new Error("Profile not found.");
    } else {
      saved = {
        id: makeId("profile"),
        name,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      next = [...profiles, saved];
    }
    await browser.storage.local.set({ [PROFILES_KEY]: next });
    return saved;
  }

  async function deleteProfile(profileId) {
    const profiles = await listProfiles();
    if (profiles.length <= 1) throw new Error("At least one profile is required.");
    const remaining = profiles.filter((profile) => profile.id !== profileId);
    if (remaining.length === profiles.length) throw new Error("Profile not found.");
    const bindings = await getAllBindings();
    await browser.storage.local.set({
      [PROFILES_KEY]: remaining,
      [BINDINGS_KEY]: bindings.filter((binding) => binding.profileId !== profileId),
      [ACTIVE_PROFILE_KEY]: remaining[0].id
    });
    return remaining[0];
  }

  async function duplicateProfile(profileId) {
    const profiles = await listProfiles();
    const source = profiles.find((profile) => profile.id === profileId);
    if (!source) throw new Error("Profile not found.");
    const timestamp = now();
    const copy = {
      id: makeId("profile"),
      name: `${source.name} Copy`,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const bindings = await getAllBindings();
    const copies = bindings
      .filter((binding) => binding.profileId === profileId)
      .map((binding) => ({
        ...binding,
        id: makeId("fb"),
        profileId: copy.id,
        createdAt: timestamp,
        updatedAt: timestamp
      }));
    await browser.storage.local.set({
      [PROFILES_KEY]: [...profiles, copy],
      [BINDINGS_KEY]: [...bindings, ...copies],
      [ACTIVE_PROFILE_KEY]: copy.id
    });
    return copy;
  }

  async function getSettings() {
    await ensureInitialized();
    const result = await rawGet(SETTINGS_KEY);
    return result[SETTINGS_KEY] || { indicatorVisibility: {} };
  }

  async function setIndicatorsVisible(profileId, scopeType, scopeValue, visible) {
    const settings = await getSettings();
    settings.indicatorVisibility = settings.indicatorVisibility || {};
    settings.indicatorVisibility[scopeKey(profileId, scopeType, scopeValue)] = Boolean(visible);
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
    return settings;
  }

  async function setDebugKeys(enabled) {
    const settings = await getSettings();
    settings.debugKeys = Boolean(enabled);
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
    return settings;
  }

  async function getDebugKeys() {
    const settings = await getSettings();
    return Boolean(settings.debugKeys);
  }

  async function getIndicatorsVisible(profileId, scopeType, scopeValue) {
    const settings = await getSettings();
    const value = settings.indicatorVisibility && settings.indicatorVisibility[scopeKey(profileId, scopeType, scopeValue)];
    return value !== false;
  }

  function matchesUrl(binding, url) {
    const pageScope = Firebinds.Targeting.normalizeScope(url, "page");
    const siteScope = Firebinds.Targeting.normalizeScope(url, "site");
    return (
      binding.scopeType === "global" ||
      (binding.scopeType === "page" && binding.scopeValue === pageScope) ||
      (binding.scopeType === "site" && binding.scopeValue === siteScope)
    );
  }

  function specificity(binding) {
    if (binding.scopeType === "page") return 3;
    if (binding.scopeType === "site") return 2;
    return 1;
  }

  function sortBySpecificity(bindings) {
    return [...bindings].sort((a, b) => {
      const specific = specificity(b) - specificity(a);
      if (specific) return specific;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });
  }

  async function getBindingsForUrl(url) {
    const activeProfile = await getActiveProfile();
    const bindings = await getAllBindings();
    return sortBySpecificity(
      bindings.filter((binding) => binding.profileId === activeProfile.id && matchesUrl(binding, url))
    );
  }

  async function saveBinding(input) {
    const bindings = await getAllBindings();
    const activeProfile = await getActiveProfile();
    const timestamp = now();
    const binding = {
      id: input.id || makeId("fb"),
      profileId: input.profileId || activeProfile.id,
      scopeType: input.scopeType,
      scopeValue: input.scopeType === "global" ? GLOBAL_SCOPE_VALUE : input.scopeValue,
      keyCombo: input.keyCombo,
      target: input.target,
      enabled: input.enabled !== false,
      showIndicator: input.showIndicator !== false,
      allowInEditable: Boolean(input.allowInEditable),
      status: input.status || "ready",
      createdAt: input.createdAt || timestamp,
      updatedAt: timestamp
    };
    const next = bindings.filter((item) => item.id !== binding.id);
    next.push(binding);
    await writeAllBindings(next);
    return binding;
  }

  async function updateBinding(id, patch) {
    const bindings = await getAllBindings();
    let updated = null;
    const next = bindings.map((binding) => {
      if (binding.id !== id) return binding;
      const scopeType = patch.scopeType || binding.scopeType;
      updated = {
        ...binding,
        ...patch,
        scopeType,
        scopeValue: scopeType === "global" ? GLOBAL_SCOPE_VALUE : (patch.scopeValue || binding.scopeValue),
        updatedAt: now()
      };
      return updated;
    });
    if (!updated) throw new Error("Binding not found.");
    await writeAllBindings(next);
    return updated;
  }

  async function deleteBinding(id) {
    const bindings = await getAllBindings();
    await writeAllBindings(bindings.filter((binding) => binding.id !== id));
  }

  async function duplicateBinding(id) {
    const bindings = await getAllBindings();
    const source = bindings.find((binding) => binding.id === id);
    if (!source) throw new Error("Binding not found.");
    const copy = {
      ...source,
      id: makeId("fb"),
      keyCombo: "",
      enabled: false,
      showIndicator: false,
      status: "ready",
      createdAt: now(),
      updatedAt: now()
    };
    await writeAllBindings([...bindings, copy]);
    return copy;
  }

  async function findConflict(profileId, scopeType, scopeValue, keyCombo, excludeId) {
    const activeProfile = profileId ? { id: profileId } : await getActiveProfile();
    const normalizedScopeValue = scopeType === "global" ? GLOBAL_SCOPE_VALUE : scopeValue;
    const bindings = await getAllBindings();
    return bindings.find(
      (binding) =>
        binding.id !== excludeId &&
        binding.profileId === activeProfile.id &&
        binding.scopeType === scopeType &&
        binding.scopeValue === normalizedScopeValue &&
        binding.keyCombo === keyCombo
    );
  }

  Firebinds.Storage = Object.freeze({
    GLOBAL_SCOPE_VALUE,
    getAllBindings,
    getBindingsForUrl,
    saveBinding,
    updateBinding,
    deleteBinding,
    duplicateBinding,
    findConflict,
    getIndicatorsVisible,
    setIndicatorsVisible,
    getDebugKeys,
    setDebugKeys,
    matchesUrl,
    listProfiles,
    getActiveProfile,
    saveProfile,
    deleteProfile,
    duplicateProfile,
    setActiveProfile
  });
})(globalThis);
