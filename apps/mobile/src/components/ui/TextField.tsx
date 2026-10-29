import type { ComponentRef, Ref } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "@/theme/tokens";
import { AppText } from "./AppText";

export type TextFieldRef = ComponentRef<typeof TextInput>;

interface TextFieldProps extends TextInputProps {
  ref?: Ref<TextFieldRef>;
  label: string;
  error?: string | undefined;
  /** Shown inside the field on the right, e.g. "kg". */
  suffix?: string;
}

export function TextField({ label, error, suffix, style, ref, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View style={[styles.field, error ? styles.fieldError : null]}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.brand}
          accessibilityLabel={label}
          accessibilityHint={error}
          {...rest}
          style={[styles.input, style]}
        />
        {suffix ? (
          <AppText variant="bodyStrong" color="textMuted">
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
  fieldError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: spacing.md,
  },
});
