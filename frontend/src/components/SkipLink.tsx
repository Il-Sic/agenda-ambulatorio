/** The first stop for keyboard users: jumps over the navigation to the page content. */
export function SkipLink() {
  return (
    <a
      href="#contenuto"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:bg-paper focus:p-3 focus:text-ink"
    >
      Vai al contenuto
    </a>
  );
}
