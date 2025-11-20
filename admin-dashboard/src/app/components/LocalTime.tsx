// src/app/components/LocalTime.tsx
"use client";

export default function LocalTime({ date }: { date?: string }) {
  if (!date) return <>—</>;

  return (
    <span suppressHydrationWarning>
      {new Date(date).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
    </span>
  );
}