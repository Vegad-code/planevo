"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // next-themes injects a blocking <script> for theme flash prevention.
  // React 19 warns when that tag is re-rendered on the client during hydration.
  // SSR keeps the default executable script; client hydration uses application/json
  // so React does not treat it as an executable script in the component tree.
  const scriptProps = React.useMemo(
    () =>
      typeof window === "undefined"
        ? undefined
        : ({ type: "application/json" } as const),
    [],
  );

  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
