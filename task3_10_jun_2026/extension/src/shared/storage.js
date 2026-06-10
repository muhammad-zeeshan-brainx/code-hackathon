import { STORAGE_KEY } from "./constants.js";

export function createDefaultState() {
  return {
    user: null,
    activeSession: null,
    sessions: [],
    sessionItems: {},
    settingsCache: {
      notificationWhitelist: [],
      focusSchedule: { enabled: false, slots: [] },
      lastSyncedAt: null,
    },
  };
}

export async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || createDefaultState();
}

export async function setState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

export async function updateState(updater) {
  const state = await getState();
  const next = typeof updater === "function" ? updater(state) : { ...state, ...updater };
  await setState(next);
  return next;
}

export function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveUser(user, settings) {
  await updateState((state) => ({
    ...state,
    user,
    settingsCache: {
      notificationWhitelist: settings.notificationWhitelist || [],
      focusSchedule: settings.focusSchedule || { enabled: false, slots: [] },
      lastSyncedAt: Date.now(),
    },
  }));
}

export async function clearUser() {
  await updateState((state) => ({
    ...createDefaultState(),
    sessions: state.sessions,
    sessionItems: state.sessionItems,
  }));
}

export async function updateSettingsCache(settings) {
  await updateState((state) => ({
    ...state,
    settingsCache: {
      notificationWhitelist: settings.notificationWhitelist ?? state.settingsCache.notificationWhitelist,
      focusSchedule: settings.focusSchedule ?? state.settingsCache.focusSchedule,
      lastSyncedAt: Date.now(),
    },
  }));
}

export async function getSettingsCache() {
  const state = await getState();
  return state.settingsCache;
}

export async function appendBlockedItem(item) {
  await updateState((state) => {
    if (!state.activeSession) return state;
    return {
      ...state,
      activeSession: {
        ...state.activeSession,
        items: [...state.activeSession.items, item],
      },
    };
  });
}

export async function finalizeSession(sessionSummary, items) {
  await updateState((state) => ({
    ...state,
    activeSession: null,
    sessions: [sessionSummary, ...state.sessions],
    sessionItems: {
      ...state.sessionItems,
      [sessionSummary.id]: items,
    },
  }));
}

export async function updateSessionSync(sessionId, { synced, backendId }) {
  await updateState((state) => ({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === sessionId ? { ...s, synced, backendId: backendId ?? s.backendId } : s
    ),
  }));
}

export async function deleteSessionLocal(sessionId) {
  await updateState((state) => {
    const { [sessionId]: _, ...restItems } = state.sessionItems;
    return {
      ...state,
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      sessionItems: restItems,
    };
  });
}

export async function createActiveSession(startedBy = "manual") {
  const id = generateId("local_sess");
  const session = {
    id,
    startedAt: Date.now(),
    startedBy,
    items: [],
  };
  await updateState((state) => ({ ...state, activeSession: session }));
  return session;
}
