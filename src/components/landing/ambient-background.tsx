export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-10%,oklch(0.4_0.12_198/0.35),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_40%,oklch(0.45_0.1_82/0.12),transparent_50%)]" />
      <div className="absolute top-1/4 -left-32 size-[420px] rounded-full bg-primary/20 blur-[100px] animate-float-soft" />
      <div
        className="absolute right-[-120px] bottom-0 size-[480px] rounded-full bg-accent/15 blur-[110px] animate-float-soft"
        style={{ animationDelay: "-4s" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,var(--background)_88%,var(--background)_100%)]" />
    </div>
  );
}
