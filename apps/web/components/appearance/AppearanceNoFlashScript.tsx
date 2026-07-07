"use client";

import { useServerInsertedHTML } from "next/navigation";
import { appearanceNoFlashScript } from "@/lib/appearance/no-flash-script";

/**
 * Injects the blocking appearance script via useServerInsertedHTML so it lands
 * in the document head during SSR without React 19 client-render script warnings.
 */
export function AppearanceNoFlashScript() {
  useServerInsertedHTML(() => (
    <script
      id="appearance-no-flash"
      dangerouslySetInnerHTML={{ __html: appearanceNoFlashScript }}
    />
  ));

  return null;
}
