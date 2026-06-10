const mongoose = require("mongoose");
const FocusSession = require("../models/FocusSession");
const BlockedItem = require("../models/BlockedItem");

async function createSession(req, res) {
  try {
    const { userId, localSessionId, startedAt, endedAt, items = [], startedBy = "manual" } = req.body;

    if (!userId || !localSessionId || !startedAt || !endedAt) {
      return res.status(400).json({ message: "userId, localSessionId, startedAt, and endedAt are required." });
    }

    let session = await FocusSession.findOne({ userId, localSessionId });

    if (session) {
      await BlockedItem.deleteMany({ sessionId: session._id });
    } else {
      session = new FocusSession({
        userId,
        localSessionId,
        startedAt: new Date(startedAt),
        endedAt: new Date(endedAt),
        itemCount: items.length,
        startedBy,
      });
      await session.save();
    }

    session.startedAt = new Date(startedAt);
    session.endedAt = new Date(endedAt);
    session.itemCount = items.length;
    session.startedBy = startedBy;
    await session.save();

    if (items.length > 0) {
      const blockedDocs = items.map((item) => ({
        sessionId: session._id,
        localItemId: item.id,
        type: item.type,
        title: item.title || "",
        body: item.body || "",
        payload: item.payload || {},
        blockedAt: new Date(item.blockedAt),
        source: item.source || {},
      }));
      await BlockedItem.insertMany(blockedDocs);
    }

    return res.status(201).json({
      sessionId: session._id.toString(),
      localSessionId: session.localSessionId,
      itemCount: session.itemCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function listSessions(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "userId query param is required." });
    }

    const sessions = await FocusSession.find({ userId }).sort({ startedAt: -1 });
    return res.status(200).json(sessions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getSessionItems(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid session id." });
    }

    const items = await BlockedItem.find({ sessionId: id }).sort({ blockedAt: 1 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid session id." });
    }

    const session = await FocusSession.findByIdAndDelete(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    await BlockedItem.deleteMany({ sessionId: id });
    return res.status(200).json({ message: "Session deleted." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { createSession, listSessions, getSessionItems, deleteSession };
