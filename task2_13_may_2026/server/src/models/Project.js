const mongoose = require("mongoose");

const clarificationQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    text: { type: String, required: true },
    options: {
      type: [String],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length === 4 && v.every((s) => typeof s === "string" && s.trim());
        },
        message: "options must be exactly 4 non-empty strings",
      },
    },
  },
  { _id: false }
);

const clarificationAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    choice: {
      type: String,
      required: true,
      enum: ["option_0", "option_1", "option_2", "option_3", "other"],
    },
    otherText: { type: String, default: "" },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ["Story", "Task", "Bug"] },
    priority: { type: String, required: true, enum: ["low", "medium", "high"] },
    labels: { type: [String], default: [] },
    dependencies: { type: [String], default: [] },
    acceptanceCriteria: { type: [String], default: [] },
    implementationNotes: { type: String, default: "" },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const sourceFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    requirementsRaw: { type: String, required: true },
    sourceFile: { type: sourceFileSchema, default: undefined },
    status: {
      type: String,
      required: true,
      enum: ["pending_clarification", "ready", "failed"],
      default: "pending_clarification",
    },
    clarificationQuestions: { type: [clarificationQuestionSchema], default: [] },
    clarificationAnswers: { type: [clarificationAnswerSchema], default: [] },
    tickets: { type: [ticketSchema], default: [] },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
