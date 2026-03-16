import { memo } from "react";

interface RingGaugeProps {
  value: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  warnAt?: number;
  criticalAt?: number;
  className?: string;
}

export const RingGauge = memo(function RingGauge({
  value,
  label,
  size = 40,
  strokeWidth = 3.5,
  color = "var(--color-blue)",
  warnAt = 70,
  criticalAt = 90,
  className,
}: RingGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  const strokeColor =
    clamped >= criticalAt ? "var(--color-red)" : clamped >= warnAt ? "var(--color-yellow)" : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Fill arc */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          transition: "stroke-dashoffset 0.5s ease",
        }}
      />
      {/* Center label */}
      {label != null && (
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize={size * 0.26}
          fontWeight={700}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {label}
        </text>
      )}
    </svg>
  );
});
