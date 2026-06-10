# Focus Blocker — Developer Setup

Chrome extension (Manifest V3) + Express/MongoDB backend for blocking notifications and popups during focus sessions.

**Install method:** Load unpacked in Chrome (no Web Store account required).

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (20+ recommended)
- [MongoDB](https://www.mongodb.com/) running locally **or** a [MongoDB Atlas](https://www.mongodb.com/atlas) connection string
- [Google Chrome](https://www.google.com/chrome/) (or Chromium-based browser with extension support)

---

## Project structure

```
task3_10_jun_2026/
├── extension/     # Chrome extension (load extension/dist in Chrome)
├── server/        # Express API + MongoDB
└── client/        # Unused in v1 (extension has its own UI)
```

---

## 1. Start the backend

The extension talks to the API at `http://localhost:5000` by default.

```bash
cd server
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/focus-blocker
```

`OPENAI_API_KEY` is optional and not used by the extension in v1.

```bash
npm install
npm run dev
```

Verify the server is running:

```bash
curl http://localhost:5000/helth
# {"status":"ok","message":"Server is healthy"}
```

---

## 2. Build the extension

```bash
cd extension
npm install
npm run build
```

For development with auto-rebuild on file changes:

```bash
npm run dev
```

Build output goes to **`extension/dist/`** — this is the folder you load in Chrome.

---

## 3. Load the extension in Chrome

1. Open **`chrome://extensions`**
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the **`extension/dist`** folder (full path example):

   ```
   .../code-hackathon/task3_10_jun_2026/extension/dist
   ```

5. Pin the extension from the puzzle icon in the toolbar for easy access

After code changes:

- **Extension:** click the **Reload** icon on the extension card at `chrome://extensions`, or use `npm run dev` in `extension/` for watch mode
- **Server:** nodemon restarts automatically when using `npm run dev`

---

## 4. First-time use in the browser

1. Ensure the **server is running** (`npm run dev` in `server/`)
2. Click the **Focus Blocker** extension icon
3. Complete onboarding: enter **name** and **email**
4. Click **Start Focus** to begin a session
5. Open **Settings** (footer link or right-click extension → **Options**) to configure:
   - **Notification whitelist** — domains whose notifications are allowed during focus
   - **Scheduled focus** — auto start/stop times via daily slots

---

## 5. Manual testing checklist

### Focus mode

- [ ] Start focus → badge shows **ON**
- [ ] Visit a site and trigger a notification or `window.open` → item appears in popup count
- [ ] Stop focus → session appears in past sessions list with **Synced** badge (server must be running)

### Whitelist

- [ ] Settings → add a domain (e.g. `web.dev`) → **Save settings**
- [ ] Start focus → notifications from that domain should pass through; popups still blocked

### Session history

- [ ] Past session → **View details** opens full tab with source breakdown and blocked item list
- [ ] **Delete** removes session locally and from MongoDB

### Schedule

- [ ] Settings → enable schedule, add a slot → **Save settings**
- [ ] Focus should auto-start/stop at scheduled times (Chrome must be open)

### API (optional)

```bash
# Register user
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dev User","email":"dev@example.com"}'

# Update settings (replace USER_ID)
curl -X PATCH http://localhost:5000/api/users/USER_ID/settings \
  -H "Content-Type: application/json" \
  -d '{"notificationWhitelist":["slack.com"]}'
```

---

## Troubleshooting

| Issue | Fix |
|---|---|
| Onboarding / save fails | Confirm server is running on port 5000 and MongoDB is reachable |
| Sessions show **Sync failed** | Start the server, then click **Retry** on the session row |
| Extension not updating after code change | Reload at `chrome://extensions` or run `npm run build` again |
| `Load unpacked` greyed out | Select the **`dist`** folder, not `extension/` root |
| CORS / network errors | Extension expects API at `http://localhost:5000` (see `extension/src/shared/constants.js`) |

---

## API reference (summary)

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/users/register` | Register / upsert user by email |
| `PATCH` | `/api/users/:userId/settings` | Save whitelist + schedule to MongoDB |
| `POST` | `/api/focus-sessions` | Sync completed session + blocked items |
| `DELETE` | `/api/focus-sessions/:id` | Delete session from MongoDB |

---

## Notes for internal distribution

- **No Chrome Web Store** or developer account is needed for load unpacked
- Each developer repeats steps 1–3 on their machine
- For a shared API, change `API_BASE_URL` in `extension/src/shared/constants.js` and rebuild
- To roll out to many employees later, use Chrome Enterprise policy (`ExtensionInstallForcelist`)
