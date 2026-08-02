export function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: "#05070d", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, padding: size * 0.12,
    }}>
      <img src="/sm-icon.png" alt="Strategic Markets logo" style={{ width: "100%", height: "auto" }} />
    </div>
  );
}

export function LogoWithText({ iconSize = 28, textSize = 18 }: { iconSize?: number; textSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoIcon size={iconSize} />
      <span style={{ fontSize: textSize, fontWeight: 800, letterSpacing: "-0.01em" }}>
        <span style={{ color: "#3b82f6" }}>Strategic</span>{" "}
        <span style={{ opacity: 0.6 }}>Markets</span>
      </span>
    </div>
  );
}
