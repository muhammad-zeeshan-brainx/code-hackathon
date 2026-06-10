const BLOCKER_SOURCE = "focus-blocker-extension";

function injectPageBlocker() {
  if (document.documentElement?.dataset?.focusBlockerInjected) return;
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/content/page-blocker.js");
  script.onload = () => script.remove();
  (document.documentElement || document.head).appendChild(script);
  if (document.documentElement) {
    document.documentElement.dataset.focusBlockerInjected = "true";
  }
}

injectPageBlocker();

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== BLOCKER_SOURCE) return;
  if (!["notification", "popup", "dialog"].includes(event.data.type)) return;

  chrome.runtime.sendMessage({
    type: "BLOCKED_ITEM",
    item: {
      type: event.data.type,
      title: event.data.title || "",
      body: event.data.body || "",
      payload: event.data.payload || {},
      source: event.data.source || {},
    },
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FOCUS_ACTIVATE") {
    window.postMessage(
      { source: BLOCKER_SOURCE, type: "FOCUS_ACTIVATE", whitelist: message.whitelist },
      "*"
    );
  }
  if (message.type === "FOCUS_DEACTIVATE") {
    window.postMessage({ source: BLOCKER_SOURCE, type: "FOCUS_DEACTIVATE" }, "*");
  }
  if (message.type === "WHITELIST_UPDATE") {
    window.postMessage(
      { source: BLOCKER_SOURCE, type: "WHITELIST_UPDATE", whitelist: message.whitelist },
      "*"
    );
  }
});
