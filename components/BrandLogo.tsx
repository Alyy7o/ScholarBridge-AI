import Image from "next/image";

/**
 * ScholarBridge brand mark.
 *
 * - `app` — rounded dark tile + cyan glyph. Use for nav, footer, login,
 *   dashboard, favicons. Has its own background — do not wrap in a cyan box.
 * - `mark` — transparent glyph only. Use on dark surfaces when you already
 *   provide a contrasting plate, or need a soft overlay without a tile.
 */
export type BrandLogoVariant = "app" | "mark";

const SRC: Record<BrandLogoVariant, string> = {
  app: "/brand/logos/logo-app.png",
  mark: "/brand/logos/logo-mark.png",
};

export default function BrandLogo({
  variant = "app",
  size = 32,
  className,
  priority = false,
}: {
  variant?: BrandLogoVariant;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  const radius = variant === "app" ? Math.round(size * 0.22) : 0;
  return (
    <Image
      src={SRC[variant]}
      alt="ScholarBridge"
      width={size}
      height={size}
      className={className}
      priority={priority}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}
