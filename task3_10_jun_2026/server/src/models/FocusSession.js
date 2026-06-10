const mongoose = require("mongoose");

const focusSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    localSessionId: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    itemCount: { type: Number, default: 0 },
    startedBy: { type: String, enum: ["manual", "schedule"], default: "manual" },
  },
  { timestamps: true }
);

focusSessionSchema.index({ userId: 1, localSessionId: 1 }, { unique: true });

module.exports = mongoose.model("FocusSession", focusSessionSchema);
