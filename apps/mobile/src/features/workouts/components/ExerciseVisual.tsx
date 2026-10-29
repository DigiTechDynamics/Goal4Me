import type { ExerciseInfo } from "@goal4me/core";
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { env } from "@/lib/env";
import { colors, radii, spacing } from "@/theme/tokens";

/**
 * Looping, muted demo clip of the exercise. Until the stock videos are
 * licensed (no `video_path` or no CDN configured) it shows a styled card
 * with the exercise's initials instead; form tips are listed under it.
 */
export function ExerciseVisual({ exercise }: { exercise: ExerciseInfo }) {
  const cdn = env?.EXPO_PUBLIC_VIDEO_CDN_URL;
  const uri = cdn && exercise.videoPath ? `${cdn.replace(/\/$/, "")}/${exercise.videoPath}` : null;
  return uri ? <ExerciseVideo key={uri} uri={uri} /> : <ExerciseCard exercise={exercise} />;
}

function ExerciseVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="cover"
      nativeControls={false}
      accessibilityLabel="Exercise demonstration video"
    />
  );
}

function ExerciseCard({ exercise }: { exercise: ExerciseInfo }) {
  return (
    <View style={[styles.media, styles.card]}>
      <View style={styles.badge}>
        <AppText variant="title" color="onBrand">
          {exercise.name
            .split(/[\s-]+/)
            .map((word) => word[0]?.toUpperCase())
            .join("")
            .slice(0, 2)}
        </AppText>
      </View>
      <AppText variant="caption" color="textSubtle" align="center">
        Follow the cues below
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  card: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
