import { useEffect, useRef, useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import type { WhiteboardPoint, WhiteboardStroke } from "~/lib/rtc";

interface WhiteboardModalProps {
  strokes: WhiteboardStroke[];
  selfId: string;
  onAddStroke: (stroke: WhiteboardStroke) => void;
  onClear: () => void;
  onClose: () => void;
}

const COLORS = ["#4687ED", "#F24D5F", "#1EC26A", "#F8AE1A", "#FFFFFF"];

export function WhiteboardModal({ strokes, selfId, onAddStroke, onClear, onClose }: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<WhiteboardPoint[] | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#040404";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const s of strokes) {
      if (s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * canvas.width, s.points[0].y * canvas.height);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * canvas.width, s.points[i].y * canvas.height);
      }
      ctx.stroke();
    }
  }, [strokes]);

  const toNorm = (e: React.PointerEvent<HTMLCanvasElement>): WhiteboardPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = [toNorm(e)];
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = toNorm(e);
    const prev = drawingRef.current[drawingRef.current.length - 1];
    drawingRef.current.push(pt);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx && prev) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
      ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
      ctx.stroke();
    }
  };

  const handleUp = () => {
    const pts = drawingRef.current;
    drawingRef.current = null;
    if (!pts || pts.length < 2) return;
    onAddStroke({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author_id: selfId,
      color,
      width,
      points: pts,
    });
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "nova-whiteboard.png";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-[8px] border border-[#3D3D3D] bg-[#141414] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292929] px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Whiteboard</h2>
            <div className="ml-3 flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={`h-5 w-5 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#141414]" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <input
              type="range"
              min={2}
              max={10}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              aria-label="Stroke width"
              className="ml-2 w-20 accent-[#246FE5]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#292929] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#3D3D3D]"
            >
              <Download className="h-3.5 w-3.5" /> PNG
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#CB2233]/25 px-2.5 py-1.5 text-xs font-medium text-[#F24D5F] hover:bg-[#CB2233]/40"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close whiteboard"
              className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          className="aspect-video w-full cursor-crosshair touch-none bg-[#040404]"
        />
      </div>
    </div>
  );
}
