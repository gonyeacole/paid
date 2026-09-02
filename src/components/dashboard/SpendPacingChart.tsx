"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { formatBidMicros, formatCompactMicros } from "@/lib/format";

export type SpendPacingPoint = {
  day: number;
  label: string;
  actualCumulativeMicros: number | null;
  budgetCumulativeMicros: number;
};

const WIDTH = 720;
const HEIGHT = 260;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 58 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
}

export default function SpendPacingChart({
  points,
  currency,
}: {
  points: SpendPacingPoint[];
  currency: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const daysInMonth = points.length;
  const maxValue = useMemo(() => {
    const raw = Math.max(
      1,
      ...points.map((p) => p.budgetCumulativeMicros),
      ...points.map((p) => p.actualCumulativeMicros ?? 0)
    );
    return niceCeil(raw);
  }, [points]);

  const xForDay = (day: number) =>
    daysInMonth > 1 ? MARGIN.left + ((day - 1) / (daysInMonth - 1)) * PLOT_W : MARGIN.left;
  const yForValue = (value: number) => MARGIN.top + PLOT_H - (value / maxValue) * PLOT_H;

  const actualPoints = points.filter((p) => p.actualCumulativeMicros !== null);
  const lastActual = actualPoints[actualPoints.length - 1] ?? null;

  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xForDay(p.day).toFixed(1)} ${yForValue(p.actualCumulativeMicros!).toFixed(1)}`)
    .join(" ");
  const actualAreaPath =
    actualPoints.length > 0
      ? `${actualPath} L ${xForDay(actualPoints[actualPoints.length - 1].day).toFixed(1)} ${(MARGIN.top + PLOT_H).toFixed(1)} L ${xForDay(actualPoints[0].day).toFixed(1)} ${(MARGIN.top + PLOT_H).toFixed(1)} Z`
      : "";
  const budgetPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xForDay(p.day).toFixed(1)} ${yForValue(p.budgetCumulativeMicros).toFixed(1)}`)
    .join(" ");

  const yTicks = [0, maxValue / 4, maxValue / 2, (maxValue * 3) / 4, maxValue];

  const xLabelStep = Math.max(1, Math.ceil(daysInMonth / 6));
  const xTickDays = points
    .map((p) => p.day)
    .filter((day) => day === 1 || day === daysInMonth || (day - 1) % xLabelStep === 0);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || daysInMonth < 2) return;
    const scale = rect.width / WIDTH;
    const internalX = (e.clientX - rect.left) / scale;
    const fraction = (internalX - MARGIN.left) / PLOT_W;
    const day = Math.round(1 + Math.min(1, Math.max(0, fraction)) * (daysInMonth - 1));
    setHoverDay(Math.min(daysInMonth, Math.max(1, day)));
  }

  const hoverPoint = hoverDay ? points[hoverDay - 1] : null;
  const hoverXPct = hoverPoint ? (xForDay(hoverPoint.day) / WIDTH) * 100 : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-5 text-xs">
        <span className="flex items-center gap-1.5 text-(--text-secondary)">
          <span className="inline-block h-0.5 w-4 rounded-full bg-(--series-1)" />
          Actual spend
        </span>
        <span className="flex items-center gap-1.5 text-(--text-secondary)">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-(--axis)"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--axis) 0 4px, transparent 4px 7px)" }}
          />
          Budget pace
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverDay(null)}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto block" role="img" aria-label="Cumulative spend versus budget pace this month">
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yForValue(tick)}
                y2={yForValue(tick)}
                stroke="var(--gridline)"
                strokeWidth={1}
              />
              <text x={MARGIN.left - 8} y={yForValue(tick)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--text-muted)">
                {formatCompactMicros(tick, currency)}
              </text>
            </g>
          ))}

          {xTickDays.map((day) => (
            <text key={day} x={xForDay(day)} y={HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
              {points[day - 1]?.label}
            </text>
          ))}

          {actualAreaPath && <path d={actualAreaPath} fill="var(--series-1-fill)" />}
          <path d={budgetPath} fill="none" stroke="var(--axis)" strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />
          {actualPath && <path d={actualPath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

          {lastActual && (
            <>
              <circle cx={xForDay(lastActual.day)} cy={yForValue(lastActual.actualCumulativeMicros!)} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
              <text
                x={xForDay(lastActual.day)}
                y={yForValue(lastActual.actualCumulativeMicros!) - 12}
                textAnchor={lastActual.day / daysInMonth > 0.8 ? "end" : "middle"}
                fontSize={11}
                fontWeight={600}
                fill="var(--text-primary)"
              >
                {formatBidMicros(lastActual.actualCumulativeMicros, currency)}
              </text>
            </>
          )}

          {hoverPoint && (
            <line
              x1={xForDay(hoverPoint.day)}
              x2={xForDay(hoverPoint.day)}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_H}
              stroke="var(--axis)"
              strokeWidth={1}
            />
          )}
          {hoverPoint && hoverPoint.actualCumulativeMicros !== null && (
            <circle cx={xForDay(hoverPoint.day)} cy={yForValue(hoverPoint.actualCumulativeMicros)} r={4} fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth={2} />
          )}
          {hoverPoint && (
            <circle cx={xForDay(hoverPoint.day)} cy={yForValue(hoverPoint.budgetCumulativeMicros)} r={4} fill="var(--axis)" stroke="var(--surface-1)" strokeWidth={2} />
          )}
        </svg>

        {hoverPoint && hoverXPct !== null && (
          <div
            className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg border border-black/10 dark:border-white/15 bg-(--surface-1) px-3 py-2 shadow-sm text-xs"
            style={{ left: `${Math.min(88, Math.max(12, hoverXPct))}%` }}
          >
            <p className="font-medium text-(--text-primary) mb-1">{hoverPoint.label}</p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 rounded-full bg-(--series-1)" />
              <span className="text-(--text-secondary)">Actual</span>
              <span className="font-semibold ml-auto">
                {hoverPoint.actualCumulativeMicros !== null
                  ? formatBidMicros(hoverPoint.actualCumulativeMicros, currency)
                  : "—"}
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 rounded-full bg-(--axis)" />
              <span className="text-(--text-secondary)">Budget pace</span>
              <span className="font-semibold ml-auto">{formatBidMicros(hoverPoint.budgetCumulativeMicros, currency)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
