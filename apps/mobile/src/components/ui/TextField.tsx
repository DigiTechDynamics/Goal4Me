import { useState, type ComponentRef, type Ref } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

/** react-native-web supports outlineStyle, but React Native's types don't include it. */
const WEB_NO_OUTLINE =
  Platform.OS === "web" ? ({ outlineStyle: "none" } as unknown as TextStyle) : null;

export type TextFieldRef = ComponentRef<typeof TextInput>;

interface TextFieldProps extends TextInputProps {
  ref?: Ref<TextFieldRef>;
  label: string;
  error?: string | undefined;
  /** Shown inside the field on the right, e.g. "kg". */
  suffix?: string;
}

export function TextField({
  label,
  error,
  suffix,
  style,
  ref,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  // The whole field gets a brand border on focus (instead of the browser's
  // inner outline on the web), so focus is visible on every platform.
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View
        style={[styles.field, focused && styles.fieldFocused, error ? styles.fieldError : null]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.brand}
          accessibilityLabel={label}
          accessibilityHint={error}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, WEB_NO_OUTLINE, style]}
        />
        {suffix ? (
          <AppText variant="bodyStrong" color="textMuted" style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  fieldFocused: { borderColor: colors.brand },
  fieldError: { borderColor: colors.danger },
  suffix: { flexShrink: 0 },
  input: {
    flex: 1,
    // Lets the input shrink below its intrinsic width (web) so a suffix never overflows.
    minWidth: 0,
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: spacing.md,
  },
});
