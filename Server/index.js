const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());

// In-memory storage
let shapes = [];
let pages = [
  { id: 'page_1', name: 'Page 1', createdAt: Date.now() }
];

// --- SHAPE ENDPOINTS ---
// Get all shapes
app.get("/api/shapes", (req, res) => {
  res.json(shapes);
});

// Add a shape
app.post("/api/shapes", (req, res) => {
  const shape = req.body;
  shapes.push(shape);
  res.status(201).json(shape);
});

// Update a shape
app.put("/api/shapes/:id", (req, res) => {
  const { id } = req.params;
  const idx = shapes.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).send("Shape not found");
  shapes[idx] = { ...shapes[idx], ...req.body };
  res.json(shapes[idx]);
});

// Delete a shape
app.delete("/api/shapes/:id", (req, res) => {
  shapes = shapes.filter(s => s.id !== req.params.id);
  res.status(204).send();
});

// Delete all shapes (optionally by pageId)
app.delete("/api/shapes", (req, res) => {
  const { pageId } = req.query;
  if (pageId) {
    shapes = shapes.filter(s => s.pageId !== pageId);
  } else {
    shapes = [];
  }
  res.status(204).send();
});

// --- PAGE ENDPOINTS ---
// Get all pages
app.get("/api/pages", (req, res) => {
  res.json(pages);
});

// Create new page
app.post("/api/pages", (req, res) => {
  const { name } = req.body;
  const newPage = {
    id: Date.now().toString(),
    name: name || `Page ${pages.length + 1}`,
    createdAt: Date.now()
  };
  pages.push(newPage);
  res.status(201).json(newPage);
});

// Get shapes by pageId
app.get("/api/pages/:id/shapes", (req, res) => {
  const { id } = req.params;
  const pageShapes = shapes.filter(s => s.pageId === id);
  res.json(pageShapes);
});

// Delete a page and its shapes
app.delete("/api/pages/:id", (req, res) => {
  const { id } = req.params;
  pages = pages.filter(p => p.id !== id);
  shapes = shapes.filter(s => s.pageId !== id);
  res.status(204).send();
});

// Rename page
app.put("/api/pages/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const page = pages.find(p => p.id === id);
  if (!page) return res.status(404).send("Page not found");
  page.name = name;
  res.json(page);
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
