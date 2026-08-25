import type React from "react";

/**
 * The ElevenLabs widget is a custom element, so JSX needs to be told it exists.
 * Attribute names are the kebab-case ones the embed script reads.
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "agent-id": string;
          "dynamic-variables"?: string;
          "override-first-message"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export {};
