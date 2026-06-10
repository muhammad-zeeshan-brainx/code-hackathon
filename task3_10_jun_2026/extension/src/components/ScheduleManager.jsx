import { DAY_LABELS } from "../shared/schedule.js";

const emptySlot = () => ({ days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00" });

export default function ScheduleManager({ schedule, onChange }) {
  function updateSchedule(patch) {
    onChange({ ...schedule, ...patch });
  }

  function updateSlot(index, patch) {
    const slots = schedule.slots.map((slot, i) => (i === index ? { ...slot, ...patch } : slot));
    updateSchedule({ slots });
  }

  function toggleDay(index, day) {
    const slot = schedule.slots[index];
    const days = slot.days.includes(day)
      ? slot.days.filter((d) => d !== day)
      : [...slot.days, day].sort();
    updateSlot(index, { days });
  }

  function addSlot() {
    updateSchedule({ slots: [...schedule.slots, emptySlot()] });
  }

  function removeSlot(index) {
    updateSchedule({ slots: schedule.slots.filter((_, i) => i !== index) });
  }

  return (
    <div className="card">
      <h3>Scheduled focus</h3>
      <label className="row">
        <span>Enable scheduled focus</span>
        <input
          type="checkbox"
          checked={schedule.enabled}
          onChange={(e) => updateSchedule({ enabled: e.target.checked })}
        />
      </label>

      {schedule.slots.map((slot, index) => (
        <div key={index} className="list-item">
          <div className="row" style={{ marginBottom: 8 }}>
            <strong>Slot {index + 1}</strong>
            <button type="button" className="btn btn-danger" onClick={() => removeSlot(index)}>
              Remove
            </button>
          </div>
          <div className="row">
            <input type="time" value={slot.start} onChange={(e) => updateSlot(index, { start: e.target.value })} />
            <span>to</span>
            <input type="time" value={slot.end} onChange={(e) => updateSlot(index, { end: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {DAY_LABELS.map((label, day) => (
              <button
                key={label}
                type="button"
                className={`tab ${slot.days.includes(day) ? "active" : ""}`}
                onClick={() => toggleDay(index, day)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button type="button" className="btn btn-secondary" onClick={addSlot}>
        Add time slot
      </button>
    </div>
  );
}
