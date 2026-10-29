import type { ExerciseInfo } from "@goal4me/core";
import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { env } from "@/lib/env";
import { MOTIONS } from "../motion/motions";
import { ExerciseMotion } from "./ExerciseMotion";
import { colors, radii, spacing } from "@/theme/tokens";

/**
 * How the exercise is demonstrated, best first:
 * 1. a looping, muted licensed video clip (`video_path` set and a CDN configured);
 * 2. otherwise our original animated figure for the exercise's slug;
 * 3. otherwise (a new exercise with neither yet) a card with its initials.
 * Form tips are listed under it either way. `playing` pauses the animation
 * while the workout is paused.
 */
export function ExerciseVisual({
  exercise,
  playing = true,
}: {
  exercise: ExerciseInfo;
  playing?: boolean;
}) {
  const cdn = env?.EXPO_PUBLIC_VIDEO_CDN_URL;
  const uri = cdn && exercise.videoPath ? `${cdn.replace(/\/$/, "")}/${exercise.videoPath}` : null;
  if (uri) return <ExerciseVideo key={uri} uri={uri} />;
  const motion = MOTIONS[exercise.slug];
  if (motion) {
    return (
      <View
        style={[styles.media, styles.animation]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Animated demonstration of ${exercise.name}`}
      >
        <ExerciseMotion key={exercise.slug} motion={motion} playing={playing} />
      </View>
    );
  }
  return <ExerciseCard exercise={exercise} />;
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
  animation: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
