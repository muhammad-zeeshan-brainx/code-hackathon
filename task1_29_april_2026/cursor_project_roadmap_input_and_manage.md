# Project roadmap input and management
_Exported on 4/15/2026 at 16:58:46 GMT+5 from Cursor (3.0.16)_

---

**User**

in my frontend create a page
which will take inputs from user
currently support  add a text area input allow user to give input by typing into text area

and in server create a model and an api to save these instructions.

actually these instructions in future will be use to create dev ready tasks/tickets or you can say that step by step roadmap for a developer to help him pickup tasks and build the product according to the given requirements.


you need to support multiple project builders roadmaps, so user can give requirement related to one product and you save it into db

then make a mechanism to allow user to give another project detail using text area and save this into db as well

and on frontend show these projects in detail and when user clicks on project to open detail you just currently need to open a page with comming soon text, this part will be develop later

---

**Cursor**

Exploring the frontend and server structure to draft a plan that matches existing patterns.



Noting: Express + Mongoose (MongoDB), no existing models; Vite + React with no router; no CORS configured (needed for separate dev ports). Creating the plan.



---

**User**

ok, also include in plan this thing

when user submits project detail they may submit it in an unclear way
so in backend API
you need to use open ai llm model gpt-4.1, open ai setup already done in @server/src/config/openaiClient.js 

so save the project development road map into database in a good structured way
You need to save the follwing things into project regarding each project

This project development road map needs to be dervice from open ai llm call, so you should carefully give prompt to llm call 

give in prompt the user requirement of product

and for output need folwing things from llm call
 Requirement user uploads 
- save brief description about tech stacks which are going to be used for frontend and backend
which API's need to be build for the project
which frontend pages need to be build for frontend
and then finally inteligentaly devide frontend and backend tasks into tickets and show all these details in Project Requeremen detail page

---

**Cursor**


Reviewing the OpenAI client setup and the current plan so we can integrate the LLM roadmap flow and update the plan document.




Updating the plan: integrating OpenAI (`gpt-4.1`) for structured roadmap generation, extending the Project schema, replacing the placeholder detail page with a full requirements view, and revising todos and the overview.




Here is what was added to the plan (the plan file is updated: [projects_instructions_crud_d597f7bf.plan.md](/Users/brainx/.cursor/plans/projects_instructions_crud_d597f7bf.plan.md)).

### New backend behavior

- **On `POST /api/projects`**, after validating `title` and `instructions`, the server calls **OpenAI `gpt-4.1`** using [`server/src/config/openaiClient.js`](server/src/config/openaiClient.js) (`getOpenAIClient()`).
- **Prompting**: System + user prompts include the **raw product requirement** (and title as context). The model is instructed to handle **unclear** input and still return **structured JSON** (recommended: JSON mode / schema described in the prompt) so parsing is reliable.
- **Persisted `roadmap`** on each project (MongoDB), including:
  - **User requirement** — stored as `instructions` (verbatim upload).
  - **`techStacks`** — short **frontend** and **backend** stack descriptions.
  - **`apisToBuild`** — list of APIs to implement.
  - **`frontendPages`** — list of pages/screens to build.
  - **`tickets`** — **frontend** and **backend** arrays of dev-ready tickets (intelligent split).

- **Failure handling**: If the LLM call or JSON validation fails, respond with **`502`/`503`/`422`** as appropriate; default stance is **do not save** a project without a valid roadmap (keeps DB clean).

### Frontend change

- **`/projects/:projectId`** is no longer a “coming soon” placeholder. It becomes the **Project Requirement detail** page: **`GET /api/projects/:id`** and render all sections above (requirement text, stacks, APIs, pages, FE/BE tickets).

### Todos

- Split into **model + API**, **LLM roadmap service**, **cors/proxy**, **full detail UI**, and **smoke tests** including **API failure** cases.

If you want this plan file mirrored under the repo (e.g. `.cursor/plans/`), say so and we can align on execution next.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**


Implementing the plan: starting with the Project model and API, then the LLM service, CORS/proxy, and frontend.




Creating the Project model, roadmap generator service, and project routes/controller.




Installing dependencies, adding CORS, improving OpenAI error handling, and wiring the Vite proxy.




Removing the unused `App.css` import, navigating to the new project after successful creation, and verifying the server loads.




Fixing the lint error by remounting the detail view when `projectId` changes so we don't call `setState` synchronously at the start of the effect.




Here is what was implemented:

### Backend
- **[server/src/models/Project.js](server/src/models/Project.js)** — `title`, `instructions`, nested `roadmap` (tech stacks, APIs, pages, FE/BE tickets, `model`, `generatedAt`).
- **[server/src/services/generateProjectRoadmap.js](server/src/services/generateProjectRoadmap.js)** — `gpt-4.1` (override with `OPENAI_ROADMAP_MODEL`), `response_format: json_object`, system/user prompts, `JSON.parse` + `validateRoadmapPayload`.
- **[server/src/controllers/projectController.js](server/src/controllers/projectController.js)** — `POST /api/projects` (LLM then save; **502**/**503** on failure, no partial save), `GET /api/projects` (slim list + `instructionsPreview`), `GET /api/projects/:id` (full doc).
- **[server/src/routes/projectRoutes.js](server/src/routes/projectRoutes.js)** — mounted at **`/api/projects`** in [server/src/routes/routes.js](server/src/routes/routes.js).
- **[server/src/app.js](server/src/app.js)** — **`cors`** (`CLIENT_ORIGIN` or `http://localhost:5173`, plus localhost ports with regex).
- **`cors`** added to [server/package.json](server/package.json).

### Frontend
- **`react-router-dom`** — [client/src/main.jsx](client/src/main.jsx) wraps **`BrowserRouter`**; [client/src/App.jsx](client/src/App.jsx) routes `/` → `/projects`, `/projects`, `/projects/:projectId`.
- **[client/src/pages/ProjectsPage.jsx](client/src/pages/ProjectsPage.jsx)** — title + requirements textarea, submit with loading, **navigate to new project** after success, **list** with preview + links.
- **[client/src/pages/ProjectDetailPage.jsx](client/src/pages/ProjectDetailPage.jsx)** — full roadmap: requirements, stacks, APIs, pages, FE/BE tickets.
- **[client/src/api.js](client/src/api.js)** — `fetch` helpers for `/api/...`.
- **[client/src/projects.css](client/src/projects.css)** — layout and section styles.
- **[client/vite.config.js](client/vite.config.js)** — **`/api` → `http://localhost:5000`**.

### Checks
- **`npm run lint`** and **`npm run build`** (client) succeed.
- Server **GET `/api/projects`** returns `[]` when Mongo is up; **GET `/helth`** still works.

Run **`npm run dev`** in `server` and `client` (two terminals). Ensure **`MONGO_URI`** and **`OPENAI_API_KEY`** are set; optional **`OPENAI_ROADMAP_MODEL`** if you need a different model id than `gpt-4.1`.

---

**User**

I need some enhancements in tickets

add a little more detail in tickets to help out developer so that he has no confusion left

---

**Cursor**


Reviewing the ticket schema, LLM prompts, and detail UI so we can add richer developer-facing ticket fields.




Adding structured fields: acceptance criteria, implementation notes, and dependencies. Updating the Mongoose schema, LLM prompt/validator, and detail UI.




Fixing the prompt: the backend tickets example used invalid JSON (`"same shape as frontend tickets"`).




Adding UI components and styles for the new ticket fields.




Here is what changed:

### Data model ([server/src/models/Project.js](server/src/models/Project.js))
Each ticket can now store:
- **`acceptanceCriteria`** — string array (testable “done” checks)
- **`implementationNotes`** — concrete guidance (layers, files, APIs, edge cases)
- **`dependencies`** — string array (other tickets or prerequisites)
- **`outOfScope`** — explicit boundary so work does not creep

### LLM ([server/src/services/generateProjectRoadmap.js](server/src/services/generateProjectRoadmap.js))
- JSON shape and rules updated so the model returns those fields for **every** ticket.
- System prompt instructs: **acceptance criteria**, **implementation notes**, **dependencies**, **out of scope** to cut ambiguity.
- **`normalizeTicket`** maps and trims the new fields; old documents without them still validate (empty arrays / empty strings).

### UI ([client/src/pages/ProjectDetailPage.jsx](client/src/pages/ProjectDetailPage.jsx), [client/src/projects.css](client/src/projects.css))
- New **`TicketDetailItem`** renders: order `#`, title, priority, description, then **Acceptance criteria**, **Implementation notes**, **Dependencies**, **Out of scope** when present.
- Styling for subsections, lists, and out-of-scope emphasis.

**Note:** Roadmaps already saved in MongoDB only have `title` / `description` / `order` / `priority`. The detail page shows the new sections only when those fields exist; **create a new project** to get full ticket detail from the updated prompt.

---

**User**

in APIs to build make sure you provide gpt-4.1 llm call instrcution about also using query params where ever needed

---

**Cursor**


Updating the LLM prompt and schema so APIs include documented query parameters, and displaying them on the project detail page.




Here is what was updated:

### LLM instructions ([server/src/services/generateProjectRoadmap.js](server/src/services/generateProjectRoadmap.js))
- **`apisToBuild`** example now includes a **`queryParams`** array: `{ "name", "description" }` per entry.
- **`path`** hint: include path params in the path (e.g. `/api/items/:id`).
- **Rule added:** For endpoints where query strings are normal (pagination, filters, sort, search, dates, `include`/`expand`, etc.), **`queryParams` must be filled in** with clear names and short descriptions; use **`[]` only** when the API really has no query string (e.g. body-only `POST`).

### Persistence ([server/src/models/Project.js](server/src/models/Project.js))
- **`queryParamSchema`** and **`queryParams`** on each API item (default `[]`).

### Normalization
- **`normalizeQueryParams`** accepts objects `{ name, description }` or plain strings and stores consistent objects.

### UI ([client/src/pages/ProjectDetailPage.jsx](client/src/pages/ProjectDetailPage.jsx), [client/src/projects.css](client/src/projects.css))
- Under each API, a **Query params** subsection lists each name (as `code`) and description when present.

New projects generated after this change will get query param coverage from **gpt-4.1** per the new rules; older API rows without `queryParams` still render as before.

---

**User**

In tickets

need guidance for developer to pickout exact set of backend APIs needed from (APIs to build list)to complete the ticket

---

**Cursor**


Adding a ticket field that references API names from the roadmap's `apisToBuild` list, updating the LLM prompt and validator, and displaying it on the detail page.




Adding `apisNeeded` to tickets (references `apisToBuild` by exact name), normalizing against that list server-side, and rendering it on the detail page with matching API metadata.




Here is what was added:

### Schema ([server/src/models/Project.js](server/src/models/Project.js))
- **`apisNeeded`**: `string[]` — each value is the **`name`** of an item in **`apisToBuild`** (backend tickets: APIs this ticket implements; frontend tickets: APIs the UI should call).

### LLM ([server/src/services/generateProjectRoadmap.js](server/src/services/generateProjectRoadmap.js))
- JSON examples for **frontend** and **backend** tickets now include **`apisNeeded`**.
- Rules spell out that values must be **exact `apisToBuild[].name` strings** from the **same** response, with the right meaning for FE vs BE tickets.
- System prompt mentions **`apisNeeded`** so tickets stay aligned with the API list.
- **`normalizeApisNeeded`**: trims, dedupes, and maps names case-insensitively to the canonical **`apisToBuild` name** (unknown names are dropped).

### UI ([client/src/pages/ProjectDetailPage.jsx](client/src/pages/ProjectDetailPage.jsx))
- New block **“APIs from roadmap”** (when `apisNeeded` is non-empty): lists each name and, when it matches **`apisToBuild`**, shows **`method`**, **`path`**, and **`description`** so devs can map tickets to the API section above.

Older tickets without `apisNeeded` simply omit this block. New projects generated after deploy get **`apisNeeded`** from the model.

---

**User**

@server/src/services/generateProjectRoadmap.js:1-251 
In road map instruction assk llm to give  this output for auth related APIS

APIs in a break down manner
for example curently it only give 
User Signup/Login (POST /api/auth) — Handles user registration and authentication, saves session/source for persistence.

I want break down for each API like login, sigup , separatly and similarly for other sections APIs as well


---

**Cursor**


Updating roadmap instructions so the LLM emits one `apisToBuild` entry per distinct endpoint (e.g., separate signup, login, logout) and avoids combining multiple operations into a single API item.




Here is what changed in [server/src/services/generateProjectRoadmap.js](server/src/services/generateProjectRoadmap.js):

### Example `apisToBuild` shape
The template no longer suggests a single generic API row. It now shows **several separate objects**, including auth-style breakdowns:
- **Register user** — `POST /api/auth/register`
- **Login** — `POST /api/auth/login`
- **Logout** — `POST /api/auth/logout`
- Plus a **non-auth** example (**List items** with query params) so the same “one endpoint = one row” rule applies everywhere.

### New rules (in `Rules:`)
- **One row per HTTP endpoint** — no “mega-APIs” that mix multiple operations.
- Explicit **don’t**: avoid labels like “Signup/Login” or one row for “CRUD users” when those are different endpoints.
- **Auth / identity**: separate entries per flow (signup, login, logout, and when relevant refresh, password reset, verify email, OAuth callback, etc.), each with its own **`name`** and distinct **`path`** where it makes sense.
- **Other areas** (users, billing, resources, …): same idea — separate rows for list vs create vs get-by-id vs update vs delete when they are different routes.

### System prompt
Reinforces **granular `apisToBuild`** (no merging signup + login) while keeping the existing ticket / `apisNeeded` behavior.

No schema or validator changes were required; only prompt text. New roadmaps should list auth (and other areas) as separate APIs.

