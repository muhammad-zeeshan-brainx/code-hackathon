const mongoose = require("mongoose");

const scheduleSlotSchema = new mongoose.Schema(
  {
    days: { type: [Number], default: [] },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false }
);

const focusScheduleSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    slots: { type: [scheduleSlotSchema], default: [] },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    notificationWhitelist: { type: [String], default: [] },
    focusSchedule: { type: focusScheduleSchema, default: () => ({ enabled: false, slots: [] }) },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
