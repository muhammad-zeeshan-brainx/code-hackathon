import { MSG } from "../shared/constants.js";
import {
  getState,
  createActiveSession,
  appendBlockedItem,
  finalizeSession,
  updateSessionSync,
  deleteSessionLocal,
  generateId,
  getSettingsCache,
} from "../shared/storage.js";
import { syncFocusSession, deleteFocusSession } from "../shared/api.js";
import { aggregateSourceStats } from "../shared/sourceStats.js";
import { normalizeDomain } from "../shared/whitelist.js";
import { isWithinSchedule, getNextScheduleEvent } from "../shared/schedule.js";

let focusActive = false;

async function applyContentSettings(whitelist = []) {
  await chrome.contentSettings.notifications.set({
    primaryPattern: "<all_urls>",
    setting: "block",
  });
  await chrome.contentSettings.popups.set({
    primaryPattern: "<all_urls>",
    setting: "block",
  });

  for (const domain of whitelist) {
    const patterns = [`*://*.${domain}/*`, `*://${domain}/*`];
    for (const primaryPattern of patterns) {
      await chrome.contentSettings.notifications.set({
        primaryPattern,
        setting: "allow",
      });
    }
  }
}

async function clearContentSettings() {
  await chrome.contentSettings.notifications.clear({});
  await chrome.contentSettings.popups.clear({});
}

async function broadcastToTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        // Tab may not have content script yet
      }
    }
  }
}

async function activateBlockers() {
  const settings = await getSettingsCache();
  await broadcastToTabs({
    type: "FOCUS_ACTIVATE",
    whitelist: settings.notificationWhitelist || [],
  });
}

async function deactivateBlockers() {
  await broadcastToTabs({ type: "FOCUS_DEACTIVATE" });
}

async function startFocusSession(startedBy = "manual") {
  const state = await getState();
  if (state.activeSession || focusActive) {
    return { ok: false, error: "Session already active." };
  }

  await createActiveSession(startedBy);
  focusActive = true;

  const settings = await getSettingsCache();
  await applyContentSettings(settings.notificationWhitelist);
  await activateBlockers();

  await chrome.action.setBadgeText({ text: "ON" });
  await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });

  return { ok: true };
}

async function syncSessionToBackend(session, items, userId) {
  const payload = {
    userId,
    localSessionId: session.id,
    startedAt: new Date(session.startedAt).toISOString(),
    endedAt: new Date(session.endedAt).toISOString(),
    startedBy: session.startedBy || "manual",
    items,
  };
  return syncFocusSession(payload);
}

async function stopFocusSession() {
  const state = await getState();
  if (!state.activeSession || !focusActive) {
    return { ok: false, error: "No active session." };
  }

  const endedAt = Date.now();
  const items = state.activeSession.items.map((item) => ({
    ...item,
    source: {
      ...item.source,
      domain: normalizeDomain(item.source?.domain || ""),
    },
  }));

  const sourceStats = aggregateSourceStats(items);
  const sessionSummary = {
    id: state.activeSession.id,
    startedAt: state.activeSession.startedAt,
    endedAt,
    itemCount: items.length,
    synced: false,
    backendId: null,
    sourceStats,
    startedBy: state.activeSession.startedBy || "manual",
  };

  await finalizeSession(sessionSummary, items);
  focusActive = false;

  await clearContentSettings();
  await deactivateBlockers();
  await chrome.action.setBadgeText({ text: "" });

  if (state.user?.userId) {
    try {
      const result = await syncSessionToBackend(
        { ...state.activeSession, endedAt },
        items,
        state.user.userId
      );
      await updateSessionSync(sessionSummary.id, {
        synced: true,
        backendId: result.sessionId,
      });
      return { ok: true, synced: true };
    } catch (error) {
      return { ok: true, synced: false, error: error.message };
    }
  }

  return { ok: true, synced: false };
}

async function handleBlockedItem(message, sender) {
  const state = await getState();
  if (!state.activeSession || !focusActive) return;

  let tabTitle = "";
  let pageUrl = message.item.source?.pageUrl || "";

  if (sender.tab?.id) {
    try {
      const tab = await chrome.tabs.get(sender.tab.id);
      tabTitle = tab.title || "";
      if (sender.frameId === 0) {
        pageUrl = tab.url || pageUrl;
      }
    } catch {
      // ignore
    }
  }

  const item = {
    id: generateId("item"),
    type: message.item.type,
    title: message.item.title || "",
    body: message.item.body || "",
    payload: message.item.payload || {},
    blockedAt: Date.now(),
    source: {
      ...message.item.source,
      domain: normalizeDomain(message.item.source?.domain || ""),
      tabTitle,
      pageUrl,
    },
  };

  await appendBlockedItem(item);

  const updated = await getState();
  const count = updated.activeSession?.items.length || 0;
  await chrome.action.setBadgeText({ text: String(count) });
}

async function deleteSession(sessionId) {
  const state = await getState();
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) return { ok: false, error: "Session not found." };

  if (session.backendId) {
    try {
      await deleteFocusSession(session.backendId);
    } catch (error) {
      await deleteSessionLocal(sessionId);
      return { ok: true, warning: error.message };
    }
  }

  await deleteSessionLocal(sessionId);
  return { ok: true };
}

async function retrySync(sessionId) {
  const state = await getState();
  const session = state.sessions.find((s) => s.id === sessionId);
  const items = state.sessionItems[sessionId];
  if (!session || !items || !state.user?.userId) {
    return { ok: false, error: "Cannot retry sync." };
  }

  try {
    const result = await syncSessionToBackend(session, items, state.user.userId);
    await updateSessionSync(sessionId, { synced: true, backendId: result.sessionId });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function scheduleNextAlarms() {
  await chrome.alarms.clear("focus-start");
  await chrome.alarms.clear("focus-end");

  const settings = await getSettingsCache();
  const schedule = settings.focusSchedule;
  if (!schedule?.enabled) return;

  const next = getNextScheduleEvent(schedule);
  if (!next) return;

  const name = next.type === "start" ? "focus-start" : "focus-end";
  await chrome.alarms.create(name, { when: next.time.getTime() });
}

async function handleScheduleOnStartup() {
  const settings = await getSettingsCache();
  const schedule = settings.focusSchedule;
  if (!schedule?.enabled) {
    await scheduleNextAlarms();
    return;
  }

  const state = await getState();
  if (!state.activeSession && isWithinSchedule(schedule)) {
    await startFocusSession("schedule");
  }
  await scheduleNextAlarms();
}

async function applySettingsUpdate() {
  const settings = await getSettingsCache();
  if (focusActive) {
    await applyContentSettings(settings.notificationWhitelist);
    await broadcastToTabs({
      type: "WHITELIST_UPDATE",
      whitelist: settings.notificationWhitelist,
    });
  }
  await scheduleNextAlarms();
}

chrome.runtime.onInstalled.addListener(() => {
  handleScheduleOnStartup();
});

chrome.runtime.onStartup.addListener(() => {
  handleScheduleOnStartup();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "focus-start") {
    await startFocusSession("schedule");
  }
  if (alarm.name === "focus-end") {
    await stopFocusSession();
  }
  await scheduleNextAlarms();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!focusActive) return;
  if (changeInfo.status === "loading" || changeInfo.status === "complete") {
    const settings = await getSettingsCache();
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "FOCUS_ACTIVATE",
        whitelist: settings.notificationWhitelist,
      });
    } catch {
      // content script not ready
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handle = async () => {
    switch (message.type) {
      case MSG.START_SESSION:
        return startFocusSession("manual");
      case MSG.STOP_SESSION:
        return stopFocusSession();
      case MSG.DELETE_SESSION:
        return deleteSession(message.sessionId);
      case MSG.RETRY_SYNC:
        return retrySync(message.sessionId);
      case MSG.BLOCKED_ITEM:
        await handleBlockedItem(message, sender);
        return { ok: true };
      case MSG.GET_STATE:
        return getState();
      case MSG.SETTINGS_UPDATED:
      case MSG.WHITELIST_UPDATED:
      case MSG.SCHEDULE_UPDATED:
        await applySettingsUpdate();
        return { ok: true };
      case MSG.SWITCH_USER:
        focusActive = false;
        await clearContentSettings();
        await deactivateBlockers();
        await chrome.action.setBadgeText({ text: "" });
        return { ok: true };
      default:
        return { ok: false, error: "Unknown message type." };
    }
  };

  handle().then(sendResponse).catch((err) => sendResponse({ ok: false, error: err.message }));
  return true;
});

async function restoreActiveSession() {
  const state = await getState();
  if (state.activeSession) {
    focusActive = true;
    const settings = await getSettingsCache();
    await applyContentSettings(settings.notificationWhitelist);
    await activateBlockers();
    const count = state.activeSession.items.length;
    await chrome.action.setBadgeText({ text: count ? String(count) : "ON" });
    await chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
  }
}

handleScheduleOnStartup();
restoreActiveSession();
