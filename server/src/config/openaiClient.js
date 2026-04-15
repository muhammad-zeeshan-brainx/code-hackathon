const OpenAI = require("openai");

let clientInstance = null;

const getOpenAIClient = () => {
  if (clientInstance) {
    return clientInstance;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in environment variables.");
  }

  clientInstance = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return clientInstance;
};

module.exports = getOpenAIClient;
