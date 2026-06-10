import { useEffect, useState } from "react";
import { MSG } from "../../shared/constants.js";
import { getState, updateSettingsCache } from "../../shared/storage.js";
import { updateUserSettings } from "../../shared/api.js";
import { getNextScheduleEvent, formatNextEvent } from "../../shared/schedule.js";
import WhitelistManager from "../../components/WhitelistManager.jsx";
import ScheduleManager from "../../components/ScheduleManager.jsx";

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [whitelist, setWhitelist] = useState([]);
  const [schedule, setSchedule] = useState({ enabled: false, slots: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getState().then((state) => {
      setUser(state.user);
      setWhitelist(state.settingsCache?.notificationWhitelist || []);
      setSchedule(state.settingsCache?.focusSchedule || { enabled: false, slots: [] });
    });
  }, []);

  async function handleSave() {
    if (!user?.userId) {
      setError("Please register in the extension popup first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateUserSettings(user.userId, {
        notificationWhitelist: whitelist,
        focusSchedule: schedule,
      });

      await updateSettingsCache({
        notificationWhitelist: result.notificationWhitelist,
        focusSchedule: result.focusSchedule,
      });

      await chrome.runtime.sendMessage({ type: MSG.SETTINGS_UPDATED });

      setSuccess("Settings saved to server.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const nextEvent = formatNextEvent(getNextScheduleEvent(schedule));

  if (!user) {
    return (
      <div className="app-page">
        <h1>Settings</h1>
        <p className="muted">Open the extension popup and register first.</p>
      </div>
    );
  }

  return (
    <div className="app-page">
      <h1>Settings</h1>
      <p className="muted">{user.name} · {user.email}</p>

      <WhitelistManager whitelist={whitelist} onChange={setWhitelist} />
      <ScheduleManager schedule={schedule} onChange={setSchedule} />

      <div className="card">
        <p className="muted">{nextEvent}</p>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}
        <button type="button" className="btn btn-primary btn-block" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
