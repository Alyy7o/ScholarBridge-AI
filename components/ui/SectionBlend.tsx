"use client";

/**
 * Soft vertical gradient between sections.
 * Multi-stop ease + optional overlap so seams don't show as hard lines.
 */
export default function SectionBlend({
  from,
  to,
  height = 200,
  overlap = 64,
}: {
  from: string;
  to: string;
  height?: number;
  /** Pull into neighboring sections so the fade straddles the seam */
  overlap?: number;
}) {
  return (
    <div
      aria-hidden
      className="section-blend"
      style={{
        height,
        width: "100%",
        marginTop: -overlap,
        marginBottom: -overlap,
        position: "relative",
        zIndex: 2,
        pointerEvents: "none",
        background: `linear-gradient(
          to bottom,
          ${from} 0%,
          color-mix(in srgb, ${from} 82%, ${to}) 18%,
          color-mix(in srgb, ${from} 55%, ${to}) 42%,
          color-mix(in srgb, ${from} 28%, ${to}) 68%,
          color-mix(in srgb, ${from} 8%, ${to}) 88%,
          ${to} 100%
        )`,
      }}
    />
  );
}
