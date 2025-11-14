import { useState, useRef, useEffect } from "react";
import axios from "axios";

interface Point { x: number; y: number; }
interface Shape {
  id?: string;
  type: "line" | "circle" | "arrow" | "pencil" | "text";
  points: Point[];
  color: string;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  pageId?: string;
}
interface Page { id: string; name: string; }

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);

  const [tool, setTool] = useState<"pencil" | "line" | "circle" | "arrow" | "text">("pencil");
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#2563eb");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState("Arial");

  // Load pages
  useEffect(() => {
    const fetchPages = async () => {
      const res = await axios.get("http://localhost:5000/api/pages");
      const data = res.data || [];
      if (data.length > 0) {
        setPages(data);
        setCurrentPage(data[0]);
      } else {
        const newPage = await axios.post("http://localhost:5000/api/pages", { name: "Page 1" });
        setPages([newPage.data]);
        setCurrentPage(newPage.data);
      }
    };
    fetchPages();
  }, []);

  // Load shapes for current page
  useEffect(() => {
    if (!currentPage) return;
    axios
      .get(`http://localhost:5000/api/pages/${currentPage.id}/shapes`)
      .then((res) => setShapes(res.data || []))
      .catch(console.error);
  }, [currentPage]);

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Draw shapes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";

    shapes.forEach((shape, i) => {
      ctx.strokeStyle = shape.color;
      ctx.fillStyle = shape.color;

      if (shape.type === "pencil") {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let p of shape.points) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else if (shape.type === "line") {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        ctx.lineTo(shape.points[1].x, shape.points[1].y);
        ctx.stroke();
      } else if (shape.type === "circle") {
        if (shape.points.length < 2) return;
        const r = Math.hypot(shape.points[1].x - shape.points[0].x, shape.points[1].y - shape.points[0].y);
        ctx.beginPath();
        ctx.arc(shape.points[0].x, shape.points[0].y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape.type === "arrow") {
        if (shape.points.length < 2) return;
        ctx.beginPath();
        drawArrow(ctx, shape.points[0], shape.points[1]);
        ctx.stroke();
      } else if (shape.type === "text") {
        if (!shape.points[0]) return;
        ctx.font = `${shape.fontSize || 18}px ${shape.fontFamily || "Arial"}`;
        ctx.fillText(shape.content || "", shape.points[0].x, shape.points[0].y);
      }

      // draw selection box
      if (selectedIndex === i) {
        const box = getBoundingBox(shape);
        if (box) {
          ctx.save();
          ctx.strokeStyle = "rgba(59,130,246,0.9)";
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(box.x, box.y, box.w, box.h);
          ctx.restore();
        }
      }
    });
  }, [shapes, selectedIndex]);

  const getBoundingBox = (shape: Shape) => {
    if (!shape.points || shape.points.length === 0) return null;
    if (shape.type === "text") {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const ctx = canvas.getContext("2d")!;
      ctx.font = `${shape.fontSize || 18}px ${shape.fontFamily || "Arial"}`;
      const text = shape.content || "";
      const width = ctx.measureText(text).width;
      const height = (shape.fontSize || 18) * 1.2;
      const x = shape.points[0].x;
      const y = shape.points[0].y - height;
      return { x, y, w: width, h: height };
    } else {
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
    }
  };

  // Mouse down
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (!currentPage) return;
    const pos = getMousePos(e);

    // Find shape under mouse (all types)
    const hitIndex = shapes.findIndex(shape => {
      if (shape.type === "text" && shape.points[0]) {
        return Math.abs(shape.points[0].x - pos.x) < 100 && Math.abs(shape.points[0].y - pos.y) < 50;
      } else {
        return shape.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 10);
      }
    });

    if (hitIndex !== -1) {
      const now = Date.now();
      if (shapes[hitIndex].type === "text" && now - lastClickTime < 300) {
        // edit text
        const newText = prompt("Edit text:", shapes[hitIndex].content || "");
        if (newText !== null) {
          const updated = [...shapes];
          updated[hitIndex].content = newText;
          updated[hitIndex].fontSize = fontSize;
          updated[hitIndex].fontFamily = fontFamily;
          updated[hitIndex].color = color;
          setShapes(updated);
          await axios.put(`http://localhost:5000/api/shapes/${updated[hitIndex].id}`, updated[hitIndex]);
        }
        setLastClickTime(0);
        return;
      }

      // select for dragging
      setSelectedIndex(hitIndex);
      setLastClickTime(now);
      const first = shapes[hitIndex].points[0];
      setDragOffset({ x: pos.x - first.x, y: pos.y - first.y });
      setIsDrawing(false);
      return;
    }

    // Add new text
    if (tool === "text") {
      const text = prompt("Enter text:");
      if (!text) return;
      const newShape: Shape = {
        id: Date.now().toString(),
        type: "text",
        points: [pos],
        color,
        fontSize,
        fontFamily,
        content: text,
        pageId: currentPage.id
      };
      setShapes(prev => [...prev, newShape]);
      await axios.post("http://localhost:5000/api/shapes", newShape);
      return;
    }

    // Start drawing other shapes
    setIsDrawing(true);
    const newShape: Shape = { id: Date.now().toString(), type: tool, points: [pos], color, pageId: currentPage.id };
    setShapes(prev => [...prev, newShape]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);

    // Dragging selected shape
    if (selectedIndex !== null && dragOffset && !isDrawing) {
      setShapes(prev => {
        const updated = [...prev];
        const shape = { ...updated[selectedIndex] };
        const dx = pos.x - shape.points[0].x - dragOffset.x;
        const dy = pos.y - shape.points[0].y - dragOffset.y;
        shape.points = shape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        updated[selectedIndex] = shape;
        return updated;
      });
      return;
    }

    // Drawing new shape
    if (!isDrawing) return;
    setShapes(prev => {
      const updated = [...prev];
      const shape = updated[updated.length - 1];
      if (!shape) return updated;
      if (tool === "pencil") shape.points.push(pos);
      else {
        if (shape.points.length === 1) shape.points.push(pos);
        else shape.points[1] = pos;
      }
      updated[updated.length - 1] = shape;
      return updated;
    });
  };

  const handleMouseUp = async () => {
    if (isDrawing && shapes.length > 0) {
      const last = shapes[shapes.length - 1];
      await axios.post("http://localhost:5000/api/shapes", last);
    }

    if (selectedIndex !== null) {
      const shape = shapes[selectedIndex];
      if (shape.id) await axios.put(`http://localhost:5000/api/shapes/${shape.id}`, shape);
    }

    setIsDrawing(false);
    setSelectedIndex(null);
    setDragOffset(null);
  };

  const handleClear = async () => {
    if (!currentPage) return;
    await axios.delete("http://localhost:5000/api/shapes", { params: { pageId: currentPage.id } });
    setShapes([]);
  };

  const handleAddPage = async () => {
    const newPage = await axios.post("http://localhost:5000/api/pages", { name: `Page ${pages.length + 1}` });
    setPages(prev => [...prev, newPage.data]);
    setCurrentPage(newPage.data);
    setShapes([]);
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, start: Point, end: Point) => {
    const headlen = 10;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="flex items-center gap-3 bg-white p-3 rounded shadow-md mb-3">
        <h1 className="font-bold text-gray-700">Mini Excalidraw </h1>
        {["pencil", "line", "circle", "arrow", "text"].map(t => (
          <button
            key={t}
            onClick={() => setTool(t as any)}
            className={`px-3 py-1 rounded ${tool === t ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          >
            {t}
          </button>
        ))}
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <select value={fontFamily} onChange={e => setFontFamily(e.target.value)}>
          <option value="Arial">Arial</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Courier New">Courier New</option>
        </select>
        <input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} min={8} max={72} />
        <button onClick={handleClear} className="px-3 py-1 bg-red-500 text-white rounded">Clear</button>
        <button onClick={handleAddPage} className="px-3 py-1 bg-green-500 text-white rounded">+ Page</button>
        <select
          value={currentPage?.id || ""}
          onChange={e => {
            const page = pages.find(p => p.id === e.target.value);
            if (page) setCurrentPage(page);
          }}
          className="border px-2 py-1 rounded"
        >
          {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="bg-white border border-gray-300 rounded shadow cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
}
