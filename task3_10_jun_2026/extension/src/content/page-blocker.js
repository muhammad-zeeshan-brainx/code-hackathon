const BLOCKER_SOURCE = "focus-blocker-extension";

(function initPageBlocker() {
  if (window.__focusBlockerInstalled) return;
  window.__focusBlockerInstalled = true;

  let isActive = false;
  let whitelist = [];

  const OriginalNotification = window.Notification;
  const originalOpen = window.open;
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  const originalPrompt = window.prompt;
  const originalRequestPermission = OriginalNotification?.requestPermission?.bind(OriginalNotification);

  function isWhitelistedHost(hostname) {
    const host = hostname.toLowerCase().replace(/^www\./, "");
    return whitelist.some((entry) => {
      const normalized = entry.toLowerCase().replace(/^www\./, "");
      return host === normalized || host.endsWith(`.${normalized}`);
    });
  }

  function captureSource(targetUrl) {
    let targetDomain = null;
    if (targetUrl) {
      try {
        targetDomain = new URL(targetUrl, location.href).hostname;
      } catch {
        targetDomain = null;
      }
    }
    return {
      domain: location.hostname,
      origin: location.origin,
      pageUrl: location.href,
      targetDomain,
    };
  }

  function report(type, data) {
    window.postMessage({ source: BLOCKER_SOURCE, type, ...data }, "*");
  }

  function installOverrides() {
    if (!isActive) return;

    window.Notification = function NotificationOverride(title, options) {
      if (isWhitelistedHost(location.hostname)) {
        return new OriginalNotification(title, options);
      }
      report("notification", {
        title: String(title || ""),
        body: options?.body || "",
        payload: { title, options },
        source: captureSource(),
      });
      return { close() {}, addEventListener() {}, removeEventListener() {} };
    };

    window.Notification.requestPermission = function requestPermissionOverride(callback) {
      if (isWhitelistedHost(location.hostname)) {
        return originalRequestPermission
          ? originalRequestPermission(callback)
          : Promise.resolve("granted");
      }
      const result = Promise.resolve("denied");
      if (callback) result.then(callback);
      return result;
    };

    Object.defineProperty(window.Notification, "permission", {
      get() {
        return isWhitelistedHost(location.hostname) ? OriginalNotification.permission : "denied";
      },
    });

    window.open = function openOverride(url, ...args) {
      report("popup", {
        title: "",
        body: String(url || ""),
        payload: { url, args },
        source: captureSource(url),
      });
      return null;
    };

    window.alert = function alertOverride(message) {
      report("dialog", {
        title: "alert",
        body: String(message || ""),
        payload: { kind: "alert", message },
        source: captureSource(),
      });
    };

    window.confirm = function confirmOverride(message) {
      report("dialog", {
        title: "confirm",
        body: String(message || ""),
        payload: { kind: "confirm", message },
        source: captureSource(),
      });
      return false;
    };

    window.prompt = function promptOverride(message, defaultValue) {
      report("dialog", {
        title: "prompt",
        body: String(message || ""),
        payload: { kind: "prompt", message, defaultValue },
        source: captureSource(),
      });
      return null;
    };
  }

  function removeOverrides() {
    if (OriginalNotification) window.Notification = OriginalNotification;
    window.open = originalOpen;
    window.alert = originalAlert;
    window.confirm = originalConfirm;
    window.prompt = originalPrompt;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== BLOCKER_SOURCE) return;

    if (event.data.type === "FOCUS_ACTIVATE") {
      isActive = true;
      whitelist = event.data.whitelist || [];
      installOverrides();
    }

    if (event.data.type === "FOCUS_DEACTIVATE") {
      isActive = false;
      removeOverrides();
    }

    if (event.data.type === "WHITELIST_UPDATE") {
      whitelist = event.data.whitelist || [];
    }
  });
})();
