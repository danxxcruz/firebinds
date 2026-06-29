(function initKeyCombos(global) {
  const Firebinds = global.Firebinds || (global.Firebinds = {});

  const MODIFIER_KEYS = new Set(["Control", "Alt", "Shift", "Meta"]);
  const CODE_KEY_NAMES = {
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/"
  };
  const RESERVED = new Set([
    "Ctrl+L",
    "Ctrl+T",
    "Ctrl+W",
    "Ctrl+N",
    "Ctrl+R",
    "Ctrl+Shift+R",
    "Ctrl+Tab",
    "Ctrl+Shift+Tab",
    "Alt+Left",
    "Alt+Right",
    "F5",
    "F6",
    "F11",
    "F12",
    "Meta+L",
    "Meta+T",
    "Meta+W"
  ]);

  function keyName(event) {
    if (!event || MODIFIER_KEYS.has(event.key)) return "";
    if (event.code && event.code.startsWith("Key")) return event.code.slice(3);
    if (event.code && event.code.startsWith("Digit")) return event.code.slice(5);
    if (event.code && event.code.startsWith("Numpad")) {
      const key = event.code.slice(6);
      return /^\d$/.test(key) ? `Num${key}` : `Num${key}`;
    }
    if (event.code && CODE_KEY_NAMES[event.code]) return CODE_KEY_NAMES[event.code];
    if (event.key === " ") return "Space";
    if (event.key === "Esc") return "Escape";
    if (event.key && event.key.length === 1) return event.key.toUpperCase();
    if (event.key && event.key.startsWith("Arrow")) return event.key.replace("Arrow", "");
    return event.key || "";
  }

  function eventToCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");

    const key = keyName(event);
    if (key) parts.push(key);
    return parts.join("+");
  }

  function hasPrimaryKey(combo) {
    if (!combo) return false;
    const last = combo.split("+").pop();
    return !!last && !["Ctrl", "Alt", "Shift", "Meta"].includes(last);
  }

  function validateCombo(combo) {
    if (!combo || !hasPrimaryKey(combo)) {
      return { ok: false, reason: "Press a letter, number, function key, or navigation key." };
    }
    if (combo === "Escape") {
      return { ok: false, reason: "Escape is reserved for canceling picker mode." };
    }
    if (RESERVED.has(combo)) {
      return { ok: false, reason: `${combo} is reserved by Firefox or common browser navigation.` };
    }
    return { ok: true, reason: "" };
  }

  function isEditableTarget(target) {
    if (!target) return false;
    const tag = target.tagName ? target.tagName.toLowerCase() : "";
    return (
      target.isContentEditable ||
      tag === "input" ||
      tag === "textarea" ||
      tag === "select"
    );
  }

  Firebinds.KeyCombo = Object.freeze({
    eventToCombo,
    validateCombo,
    isEditableTarget
  });
})(globalThis);
