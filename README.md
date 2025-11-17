 README.md 

# Mini Excalidraw Web App

## Project Structure
- **/client** — React frontend (exclude `node_modules` folder)
- **/server** — Node.js + Express backend
- **README.md** — This file with instructions

##How to Run

### 1. Backend
1. Open a terminal in the `/server` folder.
2. Run:

npm install
 npm start
3. The server will start on `http://localhost:5000`.

### 2. Frontend
1. Open a terminal in the `/client` folder.
2. Run:

npm install
 npm run dev
3. The app will open in your browser at `http://localhost:3000`.

> **Note:** We do **not include `node_modules`** in this submission. All dependencies are listed in `package.json`. Running `npm install` will fetch them automatically.

## API Documentation
### Shapes
- `GET /api/shapes` — Get all shapes
- `POST /api/shapes` — Add a new shape
- `PUT /api/shapes/:id` — Update a shape
- `DELETE /api/shapes/:id` — Delete a shape
- `DELETE /api/shapes?pageId=<id>` — Delete all shapes of a page

### Pages
- `GET /api/pages` — List all pages
- `POST /api/pages` — Create a new page
- `GET /api/pages/:id/shapes` — Get shapes of a page
- `PUT /api/pages/:id` — Rename a page
- `DELETE /api/pages/:id` — Delete a page and its shapes

## Assumptions
- Each shape belongs to a page (`pageId` property).
- The app will fetch dependencies via `npm install`, so no `node_modules` is needed in submission.
- The app is tested with Node.js v18+ and npm v9+.



