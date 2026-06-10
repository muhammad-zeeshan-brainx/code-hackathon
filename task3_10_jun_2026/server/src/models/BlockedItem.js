const mongoose = require("mongoose");

const sourceSchema = new mongoose.Schema(
  {
    domain: { type: String, default: "" },
    origin: { type: String, default: "" },
    pageUrl: { type: String, default: "" },
    tabTitle: { type: String, default: "" },
    targetDomain: { type: String, default: null },
  },
  { _id: false }
);

const blockedItemSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "FocusSession", required: true, index: true },
    localItemId: { type: String, required: true },
    type: { type: String, enum: ["notification", "popup", "dialog"], required: true },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    blockedAt: { type: Date, required: true },
    source: { type: sourceSchema, default: () => ({}) },
  },
  { timestamps: true }
);

blockedItemSchema.index({ sessionId: 1, "source.domain": 1 });

module.exports = mongoose.model("BlockedItem", blockedItemSchema);
