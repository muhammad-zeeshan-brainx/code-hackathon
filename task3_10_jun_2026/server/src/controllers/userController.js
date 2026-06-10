const User = require("../models/User");

function formatUserResponse(user, isReturningUser = false) {
  return {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    notificationWhitelist: user.notificationWhitelist || [],
    focusSchedule: user.focusSchedule || { enabled: false, slots: [] },
    isReturningUser,
  };
}

async function registerUser(req, res) {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    const user = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { name: name.trim(), email: normalizedEmail },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(formatUserResponse(user, Boolean(existing)));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function updateSettings(req, res) {
  try {
    const { userId } = req.params;
    const body = req.body || {};
    const { notificationWhitelist, focusSchedule } = body;

    if (notificationWhitelist === undefined && focusSchedule === undefined) {
      return res.status(400).json({ message: "No settings provided to update." });
    }

    const update = {};
    if (notificationWhitelist !== undefined) {
      update.notificationWhitelist = notificationWhitelist;
    }
    if (focusSchedule !== undefined) {
      update.focusSchedule = focusSchedule;
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      notificationWhitelist: user.notificationWhitelist,
      focusSchedule: user.focusSchedule,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = { registerUser, updateSettings };
