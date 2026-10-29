/**
 * Goal4Me design tokens. The app is dark-first (spec: Key screens): high
 * contrast, one energetic brand colour, large numbers readable mid-workout.
 * Components read from here only; no hex values elsewhere in the app.
 */
export const colors = {
  background: "#0B0D12",
  surface: "#151922",
  surfaceRaised: "#1D2230",
  border: "#2A3142",
  text: "#F5F7FA",
  textMuted: "#9AA3B2",
  textSubtle: "#6B7385",
  brand: "#C6F432",
  brandPressed: "#A9D61E",
  onBrand: "#0B0D12",
  danger: "#FF6B6B",
  warning: "#FFB547",
  success: "#3DDC97",
  info: "#5AA9FF",
  overlay: "rgba(11, 13, 18, 0.72)",
  /** Near-opaque backdrop for full-screen viewers (photos). */
  scrim: "rgba(11, 13, 18, 0.96)",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: "800" },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800" },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 1.2 },
} as const;

export type TypographyVariant = keyof typeof typography;
export type ColorToken = keyof typeof colors;

/** Content never stretches wider than this on tablets and the web. */
export const MAX_CONTENT_WIDTH = 560;
