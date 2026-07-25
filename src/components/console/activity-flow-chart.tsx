"use client";

import {
    getActivityDirection,
    isSettledActivity,
    type PaymentActivityItem,
} from "@/lib/payment-activity";
import { useMemo, useState } from "react";

// Palette entrées/sorties : validée CVD (deutan ΔE 8.1) et accompagnée d'un encodage secondaire
// (libellés, signes +/-, légende) — cf. skill dataviz. NE PAS remplacer par du rouge/vert seul.
const IN_COLOR = "#10b981";
const OUT_COLOR = "#ef4444";

type FlowBucket = {
  key: string;
  label: string;
  inAmount: number;
  outAmount: number;
};

type ActivityFlowChartProps = {
  items: PaymentActivityItem[];
  currency?: string;
};

const VIEW_W = 720;
const VIEW_H = 240;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 16;
const PAD_B = 28;

function dayKey(value?: string): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString().slice(0, 10);
}

function buildBuckets(items: PaymentActivityItem[]): FlowBucket[] {
  const map = new Map<string, FlowBucket>();
  for (const item of items) {
    if (!isSettledActivity(item) || item.amount == null) continue;
    const direction = getActivityDirection(item);
    if (direction === "neutral") continue;
    const key = dayKey(item.createdAt);
    if (!key) continue;
    const bucket =
      map.get(key) ??
      ({
        key,
        label: new Date(`${key}T00:00:00`).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        }),
        inAmount: 0,
        outAmount: 0,
      } satisfies FlowBucket);
    if (direction === "in") bucket.inAmount += item.amount;
    else bucket.outAmount += item.amount;
    map.set(key, bucket);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(Math.round(value));
}

export function ActivityFlowChart({ items, currency }: ActivityFlowChartProps) {
  const buckets = useMemo(() => buildBuckets(items), [items]);
  const [hovered, setHovered] = useState<number | null>(null);

  const maxValue = useMemo(() => {
    const peak = buckets.reduce(
      (acc, b) => Math.max(acc, b.inAmount, b.outAmount),
      0,
    );
    return niceCeil(peak);
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <p className="yypay:py-8 yypay:text-center yypay:text-sm yypay:text-secondary">
        Pas encore assez d&apos;opérations réussies pour tracer une courbe.
      </p>
    );
  }

  const plotW = VIEW_W - PAD_L - PAD_R;
  const plotH = VIEW_H - PAD_T - PAD_B;
  // Un seul point : on le centre pour éviter une division par zéro.
  const x = (index: number) =>
    buckets.length === 1
      ? PAD_L + plotW / 2
      : PAD_L + (plotW * index) / (buckets.length - 1);
  const y = (value: number) => PAD_T + plotH - (plotH * value) / maxValue;

  const line = (pick: (b: FlowBucket) => number) =>
    buckets.map((b, i) => `${x(i)},${y(pick(b))}`).join(" ");

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelStep = Math.ceil(buckets.length / 6);

  const cur = currency ? ` ${currency}` : "";
  const hoveredBucket = hovered != null ? buckets[hovered] : null;

  return (
    <div className="yypay:text-secondary">
      <div className="yypay:mb-3 yypay:flex yypay:items-center yypay:gap-4 yypay:text-xs">
        <span className="yypay:inline-flex yypay:items-center yypay:gap-1.5">
          <span
            className="yypay:inline-block yypay:h-2.5 yypay:w-2.5 yypay:rounded-full"
            style={{ backgroundColor: IN_COLOR }}
          />
          Entrées
        </span>
        <span className="yypay:inline-flex yypay:items-center yypay:gap-1.5">
          <span
            className="yypay:inline-block yypay:h-2.5 yypay:w-2.5 yypay:rounded-full"
            style={{ backgroundColor: OUT_COLOR }}
          />
          Sorties
        </span>
      </div>

      <div className="yypay:relative">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="yypay:h-56 yypay:w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Courbe des entrées et sorties dans le temps"
        >
          {/* Grille horizontale récessive + graduations */}
          {gridLines.map((ratio) => {
            const gy = PAD_T + plotH - plotH * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={PAD_L}
                  x2={VIEW_W - PAD_R}
                  y1={gy}
                  y2={gy}
                  stroke="currentColor"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />
                <text
                  x={PAD_L}
                  y={gy - 3}
                  fontSize={10}
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  {compact(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          {/* Lignes de données : 2px, couleur = identité de la série */}
          <polyline
            points={line((b) => b.inAmount)}
            fill="none"
            stroke={IN_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={line((b) => b.outAmount)}
            fill="none"
            stroke={OUT_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Crosshair au survol */}
          {hovered != null && (
            <line
              x1={x(hovered)}
              x2={x(hovered)}
              y1={PAD_T}
              y2={PAD_T + plotH}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeWidth={1}
            />
          )}

          {/* Marqueurs (>=8px de diamètre effectif) */}
          {buckets.map((b, i) => (
            <g key={b.key}>
              <circle
                cx={x(i)}
                cy={y(b.inAmount)}
                r={hovered === i ? 5 : 3.5}
                fill={IN_COLOR}
                stroke="var(--color-background)"
                strokeWidth={1.5}
              />
              <circle
                cx={x(i)}
                cy={y(b.outAmount)}
                r={hovered === i ? 5 : 3.5}
                fill={OUT_COLOR}
                stroke="var(--color-background)"
                strokeWidth={1.5}
              />
            </g>
          ))}

          {/* Étiquettes d'axe X (sélectives) */}
          {buckets.map((b, i) =>
            i % labelStep === 0 || i === buckets.length - 1 ? (
              <text
                key={`lbl-${b.key}`}
                x={x(i)}
                y={VIEW_H - 8}
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.7}
                textAnchor="middle"
              >
                {b.label}
              </text>
            ) : null,
          )}

          {/* Zones de survol transparentes (cibles larges) */}
          {buckets.map((b, i) => {
            const bandW =
              buckets.length === 1 ? plotW : plotW / (buckets.length - 1);
            return (
              <rect
                key={`hit-${b.key}`}
                x={x(i) - bandW / 2}
                y={PAD_T}
                width={bandW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered((prev) => (prev === i ? null : prev))}
              />
            );
          })}
        </svg>

        {hoveredBucket && (
          <div
            className="yypay:pointer-events-none yypay:absolute yypay:top-0 yypay:rounded-md yypay:border yypay:border-border yypay:bg-background yypay:px-3 yypay:py-2 yypay:text-xs yypay:shadow-md"
            style={{
              left: `${(x(hovered ?? 0) / VIEW_W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="yypay:font-medium yypay:text-foreground">
              {hoveredBucket.label}
            </p>
            <p className="yypay:mt-1" style={{ color: IN_COLOR }}>
              Entrées : {hoveredBucket.inAmount.toLocaleString("fr-FR")}
              {cur}
            </p>
            <p style={{ color: OUT_COLOR }}>
              Sorties : {hoveredBucket.outAmount.toLocaleString("fr-FR")}
              {cur}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
