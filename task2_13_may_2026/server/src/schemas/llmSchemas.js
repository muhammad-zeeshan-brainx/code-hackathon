const { z } = require("zod");

const clarificationQuestionLlmSchema = z.object({
  text: z.string().min(1),
  options: z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
  ]),
});

const clarificationLlmResponseSchema = z.object({
  questions: z.array(clarificationQuestionLlmSchema).min(1).max(24),
});

const answerItemSchema = z.object({
  questionId: z.string().min(1),
  choice: z.enum(["option_0", "option_1", "option_2", "option_3", "other"]),
  otherText: z.string().optional(),
});

const clarificationAnswersBodySchema = z
  .object({
    answers: z.array(answerItemSchema).min(1),
  })
  .strict()
  .superRefine((data, ctx) => {
    data.answers.forEach((a, i) => {
      if (a.choice === "other" && !(a.otherText && String(a.otherText).trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "otherText is required when choice is other",
          path: ["answers", i, "otherText"],
        });
      }
    });
  });

const ticketLlmItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(["Story", "Task", "Bug"]),
  priority: z.enum(["low", "medium", "high"]),
  labels: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).min(2).max(24),
  implementationNotes: z.string().optional().default(""),
});

const ticketsLlmResponseSchema = z.object({
  tickets: z.array(ticketLlmItemSchema).min(1),
});

module.exports = {
  clarificationLlmResponseSchema,
  clarificationAnswersBodySchema,
  ticketsLlmResponseSchema,
  answerItemSchema,
};
