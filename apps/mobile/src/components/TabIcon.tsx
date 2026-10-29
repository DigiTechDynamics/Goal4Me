import Svg, { Circle, Path, Rect } from "react-native-svg";

export type TabIconName = "today" | "workouts" | "progress" | "money" | "profile";

/** Line icons for the tab bar, drawn in the tab's tint colour. */
export function TabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabIconName;
  color: string;
  size?: number;
}) {
  const stroke = {
    stroke: color,
    strokeWidth: 2,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "today" ? (
        <>
          <Circle cx={12} cy={12} r={4} {...stroke} />
          <Path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            {...stroke}
          />
        </>
      ) : null}
      {name === "workouts" ? <Path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" {...stroke} /> : null}
      {name === "progress" ? <Path d="M3 17l5-5 4 4 8-9M15 7h5v5" {...stroke} /> : null}
      {name === "money" ? (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={3} {...stroke} />
          <Path d="M3 10h18M16 15h2" {...stroke} />
        </>
      ) : null}
      {name === "profile" ? (
        <>
          <Circle cx={12} cy={8} r={4} {...stroke} />
          <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}
