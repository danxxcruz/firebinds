(function initApi(global) {
  if (global.browser) return;
  if (!global.chrome) return;

  function promisify(fn, context) {
    return (...args) =>
      new Promise((resolve, reject) => {
        fn.call(context, ...args, (result) => {
          const error = global.chrome.runtime && global.chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          resolve(result);
        });
      });
  }

  function passthrough(fn, context) {
    return (...args) => {
      const result = fn.call(context, ...args);
      return result && typeof result.then === "function" ? result : Promise.resolve(result);
    };
  }

  function maybePromisify(namespace, name) {
    if (!namespace || typeof namespace[name] !== "function") return undefined;
    return namespace[name].length ? promisify(namespace[name], namespace) : passthrough(namespace[name], namespace);
  }

  function messageEvent(event) {
    return {
      addListener(listener) {
        event.addListener((message, sender, sendResponse) => {
          try {
            const result = listener(message, sender);
            if (result && typeof result.then === "function") {
              result.then(sendResponse, (error) => {
                sendResponse({ ok: false, reason: error && error.message ? error.message : "Extension error." });
              });
              return true;
            }
            sendResponse(result);
            return undefined;
          } catch (error) {
            sendResponse({ ok: false, reason: error && error.message ? error.message : "Extension error." });
            return undefined;
          }
        });
      }
    };
  }

  const chromeApi = global.chrome;
  global.browser = {
    action: chromeApi.action && {
      openPopup: maybePromisify(chromeApi.action, "openPopup"),
      setBadgeText: maybePromisify(chromeApi.action, "setBadgeText"),
      setTitle: maybePromisify(chromeApi.action, "setTitle")
    },
    runtime: {
      getManifest: () => chromeApi.runtime.getManifest(),
      getURL: (path) => chromeApi.runtime.getURL(path),
      onMessage: messageEvent(chromeApi.runtime.onMessage),
      sendMessage: maybePromisify(chromeApi.runtime, "sendMessage")
    },
    scripting: chromeApi.scripting && {
      executeScript: maybePromisify(chromeApi.scripting, "executeScript"),
      insertCSS: maybePromisify(chromeApi.scripting, "insertCSS")
    },
    storage: {
      local: {
        get: maybePromisify(chromeApi.storage.local, "get"),
        set: maybePromisify(chromeApi.storage.local, "set")
      }
    },
    tabs: {
      create: maybePromisify(chromeApi.tabs, "create"),
      getCurrent: maybePromisify(chromeApi.tabs, "getCurrent"),
      query: maybePromisify(chromeApi.tabs, "query"),
      setZoom: maybePromisify(chromeApi.tabs, "setZoom"),
      sendMessage: maybePromisify(chromeApi.tabs, "sendMessage")
    },
    windows: {
      create: maybePromisify(chromeApi.windows, "create")
    }
  };
})(globalThis);
