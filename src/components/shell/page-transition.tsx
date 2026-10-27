import { ViewTransition, type ReactNode } from "react";

/**
 * Page content crossfades/rises on in-app navigation (links tagged "nav").
 * Refreshes, Suspense reveals and browser back/forward don't animate.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={{ nav: "page-nav", default: "none" }} exit={{ nav: "page-nav", default: "none" }} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
