const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    order: { type: Number },
    priority: { type: String },
    acceptanceCriteria: { type: [String], default: [] },
    implementationNotes: { type: String, default: "" },
    dependencies: { type: [String], default: [] },
    outOfScope: { type: String, default: "" },
    /** Exact `name` values from roadmap.apisToBuild this ticket implements (BE) or consumes (FE) */
    apisNeeded: { type: [String], default: [] },
  },
  { _id: false }
);

const queryParamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const apiItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    method: { type: String },
    path: { type: String },
    queryParams: { type: [queryParamSchema], default: [] },
  },
  { _id: false }
);

const pageItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    purpose: { type: String, default: "" },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    techStacks: {
      frontend: { type: String, default: "" },
      backend: { type: String, default: "" },
    },
    apisToBuild: { type: [apiItemSchema], default: [] },
    frontendPages: { type: [pageItemSchema], default: [] },
    tickets: {
      frontend: { type: [ticketSchema], default: [] },
      backend: { type: [ticketSchema], default: [] },
    },
    model: { type: String },
    generatedAt: { type: Date },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 200, trim: true },
    instructions: { type: String, required: true, trim: true },
    roadmap: { type: roadmapSchema, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
