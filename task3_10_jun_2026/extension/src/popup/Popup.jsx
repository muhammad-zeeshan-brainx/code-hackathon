import { useCallback, useEffect, useState } from "react";
import { MSG } from "../shared/constants.js";
import { getState, clearUser } from "../shared/storage.js";
import Onboarding from "./Onboarding.jsx";
import ActiveSession from "./ActiveSession.jsx";
import SessionList from "./SessionList.jsx";

export default function Popup() {
  const [state, setState] = useState(null);

  const refresh = useCallback(async () => {
    const data = await chrome.runtime.sendMessage({ type: MSG.GET_STATE });
    setState(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSwitchUser() {
    await chrome.runtime.sendMessage({ type: MSG.SWITCH_USER });
    await clearUser();
    refresh();
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  if (!state) {
    return <div className="app-popup">Loading...</div>;
  }

  if (!state.user) {
    return (
      <div className="app-popup">
        <Onboarding onComplete={refresh} />
      </div>
    );
  }

  return (
    <div className="app-popup">
      <div className="row">
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>Focus Blocker</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Hi, {state.user.name}
          </p>
        </div>
      </div>

      <ActiveSession state={state} onRefresh={refresh} />
      {!state.activeSession && <SessionList state={state} onRefresh={refresh} />}

      <div className="footer-links">
        <button type="button" onClick={openSettings}>Settings</button>
        <button type="button" onClick={handleSwitchUser}>Switch user</button>
      </div>
    </div>
  );
}
