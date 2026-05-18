/** Keyboard-first: appears when tabbing from the browser chrome. */
export function SkipLinks() {
  return (
    <a
      href="#main-content"
      className="absolute left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-md opacity-0 transition-[opacity,transform] duration-150 focus:translate-y-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Skip to main content
    </a>
  );
}
