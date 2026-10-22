"use client";

import {
  getActivityDirection,
  getActivityStatusGroup,
  type PaymentActivityItem,
} from "@/lib/payment-activity";
import { useMemo, useState } from "react";

/**
 * Palette validee (scripts/validate_palette.js, modes light + dark) :
 * ecart CVD deutan 8.1 -> encodage secondaire obligatoire, assure ici par
 * la legende, les libelles directs et les signes +/- de la liste.
 */
const IN_COLOR = "#10b981";
const OUT_COLOR = "#ef4444";

const VIEW_W = 720;
const VIEW_H = 220;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 26;

type Bucket = {
  key: string;
  label: string;
  inbound: number;
  outbound: number;
};

type ActivityFlowChartProps = {
  items: PaymentActivityItem[];
  intlTag: string;
  currency?: string;
  labels: {
    inbound: string;
    outbound: string;
    empty: string;
  };
};

function bucketize(items: PaymentActivityItem[], intlTag: string): Bucket[] {
  const buckets = new Map<string, Bucket>();

  for (const item of items) {
    if (item.amount == null || !item.createdAt) continue;
    if (getActivityStatusGroup(item.status) !== "success") continue;

    const parsed = new Date(item.createdAt);
    if (Number.isNaN(parsed.getTime())) continue;

    const key = parsed.toISOString().slice(0, 10);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: parsed.toLocaleDateString(intlTag, {
          day: "2-digit",
          month: "short",
        }),
        inbound: 0,
        outbound: 0,
      };
      buckets.set(key, bucket);
    }

    if (getActivityDirection(item) === "in") {
      bucket.inbound += item.amount;
    } else {
      bucket.outbound += item.amount;
    }
  }

  return [...buckets.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

export function ActivityFlowChart({
  items,
  intlTag,
  currency,
  labels,
}: ActivityFlowChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const buckets = useMemo(() => bucketize(items, intlTag), [items, intlTag]);

  if (buckets.length === 0) {
    return (
      <p className="yypay:py-8 yypay:text-center yypay:text-sm yypay:text-secondary">
        {labels.empty}
      </p>
    );
  }

  const max = Math.max(
    1,
    ...buckets.map((bucket) => Math.max(bucket.inbound, bucket.outbound)),
  );
  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = VIEW_H - PAD_T - PAD_B;
  const step = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;

  const x = (index: number) =>
    buckets.length > 1 ? PAD_L + index * step : PAD_L + innerW / 2;
  const y = (value: number) => PAD_T + innerH - (value / max) * innerH;

  const path = (pick: (bucket: Bucket) => number) =>
    buckets
      .map(
        (bucket, index) =>
          `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(pick(bucket)).toFixed(1)}`,
      )
      .join(" ");

  const formatAmount = (value: number) =>
    `${Math.round(value).toLocaleString(intlTag)}${currency ? ` ${currency}` : ""}`;

  const active = hovered != null ? buckets[hovered] : null;

  return (
    <div className="yypay:space-y-3">
      <div className="yypay:flex yypay:flex-wrap yypay:items-center yypay:gap-4 yypay:text-xs yypay:text-secondary">
        <span className="yypay:inline-flex yypay:items-center yypay:gap-1.5">
          <span
            aria-hidden
            className="yypay:h-2 yypay:w-4 yypay:rounded-full"
            style={{ backgroundColor: IN_COLOR }}
          />
          {labels.inbound}
        </span>
        <span className="yypay:inline-flex yypay:items-center yypay:gap-1.5">
          <span
            aria-hidden
            className="yypay:h-2 yypay:w-4 yypay:rounded-full"
            style={{ backgroundColor: OUT_COLOR }}
          />
          {labels.outbound}
        </span>
      </div>

      <div className="yypay:relative">
        {/* Au clavier : Tab entre dans le graphique, les flèches parcourent les points. */}
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label={`${labels.inbound} / ${labels.outbound}`}
          preserveAspectRatio="none"
          onMouseLeave={() => setHovered(null)}
          tabIndex={0}
          onFocus={() => setHovered((h) => h ?? buckets.length - 1)}
          onBlur={() => setHovered(null)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Escape") return;
            event.preventDefault();
            if (event.key === "Escape") return setHovered(null);
            const pas = event.key === "ArrowLeft" ? -1 : 1;
            setHovered((h) => Math.min(buckets.length - 1, Math.max(0, (h ?? buckets.length - 1) + pas)));
          }}
          className="yypay:h-56 yypay:w-full yypay:rounded-md"
        >
          {/* Grille recessive */}
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1={PAD_L}
              x2={VIEW_W - PAD_R}
              y1={PAD_T + innerH * ratio}
              y2={PAD_T + innerH * ratio}
              className="yypay:stroke-border"
              strokeWidth={1}
            />
          ))}

          {active && hovered != null && (
            <line
              x1={x(hovered)}
              x2={x(hovered)}
              y1={PAD_T}
              y2={PAD_T + innerH}
              className="yypay:stroke-border"
              strokeWidth={1}
            />
          )}

          <path
            d={path((bucket) => bucket.outbound)}
            fill="none"
            stroke={OUT_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path((bucket) => bucket.inbound)}
            fill="none"
            stroke={IN_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {buckets.map((bucket, index) => (
            <g key={bucket.key}>
              <circle
                cx={x(index)}
                cy={y(bucket.outbound)}
                r={hovered === index ? 6 : 4}
                fill={OUT_COLOR}
                className="yypay:stroke-card"
                strokeWidth={2}
              />
              <circle
                cx={x(index)}
                cy={y(bucket.inbound)}
                r={hovered === index ? 6 : 4}
                fill={IN_COLOR}
                className="yypay:stroke-card"
                strokeWidth={2}
              />
              {/* Zone de survol large, independante des marques */}
              <rect
                x={x(index) - Math.max(step / 2, 12)}
                y={PAD_T}
                width={Math.max(step, 24)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHovered(index)}
              />
            </g>
          ))}

          {/* Libelles d'axe : premier, dernier, et le point survole */}
          {buckets.map((bucket, index) => {
            const isEdge = index === 0 || index === buckets.length - 1;
            if (!isEdge && hovered !== index) return null;
            return (
              <text
                key={`label-${bucket.key}`}
                x={x(index)}
                y={VIEW_H - 8}
                textAnchor={
                  index === 0
                    ? "start"
                    : index === buckets.length - 1
                      ? "end"
                      : "middle"
                }
                className="yypay:fill-muted-foreground"
                style={{ fontSize: 11 }}
              >
                {bucket.label}
              </text>
            );
          })}
        </svg>

        {/* Les mêmes données en tableau, pour les lecteurs d'écran (le SVG n'est qu'une image). */}
        <table className="yypay:sr-only">
          <thead>
            <tr><th scope="col"></th><th scope="col">{labels.inbound}</th><th scope="col">{labels.outbound}</th></tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={`sr-${bucket.key}`}>
                <th scope="row">{bucket.label}</th>
                <td>+{formatAmount(bucket.inbound)}</td>
                <td>-{formatAmount(bucket.outbound)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {active && (
          <div aria-live="polite" className="yypay:pointer-events-none yypay:absolute yypay:right-2 yypay:top-2 yypay:rounded-lg yypay:border yypay:border-border yypay:bg-card yypay:px-3 yypay:py-2 yypay:text-xs yypay:shadow-md">
            <p className="yypay:font-medium yypay:text-foreground">
              {active.label}
            </p>
            <p className="yypay:mt-1 yypay:text-secondary">
              {labels.inbound} : +{formatAmount(active.inbound)}
            </p>
            <p className="yypay:text-secondary">
              {labels.outbound} : -{formatAmount(active.outbound)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
