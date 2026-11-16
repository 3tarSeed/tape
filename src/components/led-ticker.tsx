import { useEffect, useRef } from "react";
import { formatChange, formatPrice, type Quote } from "@/lib/instruments";
import { glyphRows } from "@/lib/led-font";
import { SPEED_PX, type Speed } from "@/lib/tape-settings";

type Column = { on: boolean[]; color: string };

type Piece = { columns: Column[] };

function ledText(raw: string) {
  return raw
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9 .,%+\-/: ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pricePieces(
  quotes: Quote[],
  colors: { white: string; red: string; green: string; yellow: string; blue: string },
  status: string,
): Piece[] {
  const cycle = [colors.green, colors.yellow, colors.blue, colors.white, colors.red];
  if (quotes.length === 0) return [{ columns: glyphs(status, colors.green) }];
  let cursor = 0;
  const next = () => cycle[cursor++ % cycle.length]!;
  return quotes.map((quote) => ({
    columns: [
      ...glyphs(quote.symbol, next()),
      ...glyphs("  ", colors.white),
      ...glyphs(formatPrice(quote.price, quote.digits), next()),
      ...glyphs("  ", colors.white),
      ...glyphs(formatChange(quote.changePct), next()),
    ],
  }));
}

function newsColumns(
  headlines: string[],
  colors: { white: string; red: string },
  status: string,
): Column[] {
  const lines = headlines.map(ledText).filter((line) => line.length > 0);
  const source = lines.length > 0 ? lines : [status];
  const columns: Column[] = [];
  source.forEach((line, index) => {
    const color = index % 2 === 0 ? colors.white : colors.red;
    columns.push(...glyphs(line, color));
    columns.push(...glyphs("   //   ", color));
  });
  return columns;
}

function readColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function glyphs(text: string, color: string): Column[] {
  const columns: Column[] = [];
  for (const char of text) {
    const rows = glyphRows(char);
    for (let x = 0; x < 5; x += 1) {
      columns.push({
        on: rows.map((row) => row[x] === "1"),
        color,
      });
    }
    columns.push({ on: [false, false, false, false, false, false, false], color });
  }
  return columns;
}

function paintBoard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  pitch: number,
  dot: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 1;
  const cols = Math.ceil(width / pitch);
  const rows = Math.ceil(height / pitch);
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      ctx.fillRect(x * pitch, y * pitch, dot, dot);
    }
  }
}

function paintOnGrid(
  ctx: CanvasRenderingContext2D,
  columns: Column[],
  originX: number,
  originRow: number,
  scaleX: number,
  scaleY: number,
  pitch: number,
  dot: number,
  width: number,
  brightness: number,
) {
  const colW = pitch * scaleX;
  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i];
    if (!column) continue;
    const x = originX + i * colW;
    if (x > width || x + colW < 0) continue;
    for (let row = 0; row < 7; row += 1) {
      if (!column.on[row]) continue;
      const y = (originRow + row * scaleY) * pitch;
      ctx.fillStyle = column.color;
      for (let sy = 0; sy < scaleY; sy += 1) {
        for (let sx = 0; sx < scaleX; sx += 1) {
          const px = x + sx * pitch;
          const py = y + sy * pitch;
          ctx.globalAlpha = brightness;
          ctx.fillRect(px, py, dot, dot);
        }
      }
    }
  }
}

export function LedTicker({
  quotes,
  headlines,
  speed,
  brightness,
  paused,
  status,
}: {
  quotes: Quote[];
  headlines: string[];
  speed: Speed;
  brightness: number;
  paused: boolean;
  status: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = {
      white: readColor("--color-led-white", "#f4f7fb"),
      red: readColor("--color-alert", "#ff3b30"),
      green: readColor("--color-phosphor", "#3dff6e"),
      yellow: readColor("--color-led-yellow", "#ffe14a"),
      blue: readColor("--color-led-blue", "#3ec2ff"),
      pixel: readColor("--color-pixel", "#3a342c"),
    };
    const pieces = pricePieces(quotes, colors, status);
    const news = newsColumns(headlines, colors, status);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let priceOffset = 0;
    let newsOffset = 0;
    let last = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const rows = 32;
      const pitch = height / rows;
      const dot = Math.max(1, pitch * 0.82);
      const topRow = 1;
      const botRow = 10;
      const topScale = 1;
      const botScaleX = 2;
      const botScaleY = 3;

      paintBoard(ctx, width, height, pitch, dot, colors.pixel);

      let priceTotal = 0;
      const placed = pieces.map((piece) => {
        const widthPx = piece.columns.length * pitch * botScaleX + pitch * botScaleX * 3;
        const at = priceTotal;
        priceTotal += widthPx;
        return { ...piece, at, widthPx };
      });
      priceTotal = Math.max(priceTotal, width + pitch);
      const newsTotal = Math.max(news.length * pitch * topScale, width + pitch);
      if (!pausedRef.current && !reduce) {
        priceOffset = (priceOffset + SPEED_PX[speed] * dt) % priceTotal;
        newsOffset = (newsOffset + SPEED_PX[speed] * 0.72 * dt) % newsTotal;
      }
      const priceShift = Math.round(priceOffset / pitch) * pitch;
      const newsShift = Math.round(newsOffset / pitch) * pitch;

      for (const piece of placed) {
        for (const start of [piece.at - priceShift, piece.at - priceShift + priceTotal]) {
          if (start > width || start + piece.widthPx < 0) continue;
          paintOnGrid(
            ctx,
            piece.columns,
            start,
            botRow,
            botScaleX,
            botScaleY,
            pitch,
            dot,
            width,
            brightness,
          );
        }
      }
      for (const start of [-newsShift, -newsShift + newsTotal]) {
        paintOnGrid(ctx, news, start, topRow, topScale, topScale, pitch, dot, width, brightness);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [quotes, headlines, speed, brightness, status]);

  const spoken = [
    headlines.slice(0, 3).join(". "),
    quotes.length === 0
      ? status
      : quotes
          .map((quote) => `${quote.name} ${formatPrice(quote.price, quote.digits)} ${formatChange(quote.changePct)}`)
          .join(", "),
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <>
      <canvas ref={canvasRef} className="tape-canvas" aria-hidden="true" />
      <p className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </>
  );
}
