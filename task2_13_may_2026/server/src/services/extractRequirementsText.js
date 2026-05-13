const mammoth = require("mammoth");
const path = require("path");

const ALLOWED_EXT = new Set([".txt", ".md", ".docx"]);

function getExtension(filename) {
  return path.extname(filename || "").toLowerCase();
}

async function extractTextFromUpload(file) {
  if (!file || !file.buffer) {
    throw new Error("Missing file");
  }
  const ext = getExtension(file.originalname);
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Only .txt, .md, and .docx files are allowed");
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    const text = (result.value || "").trim();
    if (!text) {
      throw new Error("Could not read text from docx file");
    }
    return text;
  }

  const text = file.buffer.toString("utf8").trim();
  if (!text) {
    throw new Error("File is empty");
  }
  return text;
}

function mergeRequirementsText({ pasted, fileText }) {
  const parts = [];
  if (pasted && pasted.trim()) parts.push(pasted.trim());
  if (fileText && fileText.trim()) parts.push(fileText.trim());
  return parts.join("\n\n---\n\n");
}

module.exports = {
  extractTextFromUpload,
  mergeRequirementsText,
  ALLOWED_EXT,
  getExtension,
};
