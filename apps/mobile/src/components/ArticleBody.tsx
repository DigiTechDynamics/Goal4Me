import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { parseLessonBody } from "@/features/money/lessonBody";
import { spacing } from "@/theme/tokens";

/**
 * Renders the app's tiny article format (paragraphs and "- " bullets), used
 * by money lessons and running guides.
 */
export function ArticleBody({ body }: { body: string }) {
  return (
    <>
      {parseLessonBody(body).map((block, i) =>
        block.type === "paragraph" ? (
          <AppText key={i} style={styles.body}>
            {block.text}
          </AppText>
        ) : (
          <View key={i} style={styles.list}>
            {block.items.map((item) => (
              <View key={item} style={styles.bullet}>
                <AppText color="brand">•</AppText>
                <AppText style={[styles.body, styles.flex]}>{item}</AppText>
              </View>
            ))}
          </View>
        ),
      )}
    </>
  );
}

const styles = StyleSheet.create({
  body: { lineHeight: 24 },
  list: { gap: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
});
