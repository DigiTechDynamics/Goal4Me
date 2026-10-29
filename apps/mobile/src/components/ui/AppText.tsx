import { Text, type TextProps } from "react-native";
import { colors, typography, type ColorToken, type TypographyVariant } from "@/theme/tokens";

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: "left" | "center" | "right";
}

/** The only text component screens use, so typography stays consistent. */
export function AppText({ variant = "body", color = "text", align, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color: colors[color] },
        variant === "overline" && { textTransform: "uppercase" },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
