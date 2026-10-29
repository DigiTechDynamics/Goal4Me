import { PHOTO_POSES, type PhotoPose } from "@goal4me/schemas";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Card, Screen, SegmentedControl } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import {
  PhotoValidationError,
  useDeletePhoto,
  useProgressPhotos,
  useUploadPhoto,
  type ProgressPhoto,
} from "@/features/progress/photos";
import { toUserMessage } from "@/lib/errors";
import { formatDate, localToday } from "@/lib/format";
import { colors, radii, spacing } from "@/theme/tokens";

const POSE_LABEL: Record<PhotoPose, string> = { front: "Front", side: "Side", back: "Back" };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: true,
  aspect: [3, 4],
  // ~0.7 keeps a full-screen photo well under 1 MB on mobile data.
  quality: 0.7,
  exif: false,
};

/** Private progress photos by pose, with a first-vs-latest comparison. */
export default function Photos() {
  const userId = useUserId();
  const photos = useProgressPhotos(userId);
  const upload = useUploadPhoto(userId);
  const remove = useDeletePhoto(userId);
  const [pose, setPose] = useState<PhotoPose>("front");
  const [viewing, setViewing] = useState<ProgressPhoto | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  if (photos.isPending) return <LoadingView />;
  if (photos.isError) {
    return (
      <ErrorView message={toUserMessage(photos.error)} onRetry={() => void photos.refetch()} />
    );
  }

  const forPose = photos.data.filter((photo) => photo.pose === pose);
  // Newest first from the API; the comparison wants oldest vs newest.
  const newest = forPose[0];
  const oldest = forPose.at(-1);

  const pick = async (source: "camera" | "library") => {
    setPickError(null);
    upload.reset();
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPickError("Allow camera access for Goal4Me in your phone's Settings to take photos.");
        return;
      }
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    upload.mutate({ uri: asset.uri, mimeType: asset.mimeType, pose, takenOn: localToday() });
  };

  const addPhoto = () => {
    // The web has no camera flow worth offering; the file picker covers it.
    if (Platform.OS === "web") {
      void pick("library");
      return;
    }
    Alert.alert(`Add a ${POSE_LABEL[pose].toLowerCase()} photo`, undefined, [
      { text: "Take photo", onPress: () => void pick("camera") },
      { text: "Choose from library", onPress: () => void pick("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const confirmDelete = (photo: ProgressPhoto) => {
    const run = () =>
      remove.mutate(photo, {
        onSuccess: () => setViewing(null),
      });
    if (Platform.OS === "web") {
      if (window.confirm("Delete this photo? This can't be undone.")) run();
      return;
    }
    Alert.alert("Delete this photo?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  const uploadError =
    upload.error instanceof PhotoValidationError
      ? upload.error.message
      : upload.isError
        ? toUserMessage(upload.error)
        : null;

  return (
    <Screen
      footer={
        <Button
          label={`Add ${POSE_LABEL[pose].toLowerCase()} photo`}
          loading={upload.isPending}
          onPress={addPhoto}
        />
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={16}
        >
          <AppText variant="heading">←</AppText>
        </Pressable>
      </View>
      <AppText variant="title" accessibilityRole="header">
        Progress photos
      </AppText>
      <AppText color="textMuted">
        Only you can see these. Same spot, same light, every two weeks works best.
      </AppText>
      <SegmentedControl
        options={PHOTO_POSES.map((value) => ({ value, label: POSE_LABEL[value] }))}
        value={pose}
        onChange={setPose}
        accessibilityLabel="Pose"
      />
      {pickError ? <Banner tone="info" message={pickError} /> : null}
      {uploadError ? <Banner message={uploadError} /> : null}

      {newest && oldest && newest.id !== oldest.id ? (
        <Card>
          <AppText variant="overline" color="textMuted">
            Then and now
          </AppText>
          <View style={styles.compare}>
            <CompareSide photo={oldest} />
            <CompareSide photo={newest} />
          </View>
        </Card>
      ) : null}

      {forPose.length === 0 ? (
        <Card style={styles.emptyCard}>
          <AppText variant="heading" align="center">
            No {POSE_LABEL[pose].toLowerCase()} photos yet
          </AppText>
          <AppText color="textMuted" align="center">
            Your first photo is your baseline. In a month you'll be glad you took it.
          </AppText>
        </Card>
      ) : (
        <View style={styles.grid}>
          {forPose.map((photo) => (
            <Pressable
              key={photo.id}
              style={styles.cell}
              onPress={() => setViewing(photo)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo from ${formatDate(photo.takenOn)}`}
            >
              <PhotoImage photo={photo} />
              <AppText variant="caption" color="textMuted" style={styles.cellDate}>
                {formatDate(photo.takenOn)}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      <Modal
        visible={viewing !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setViewing(null)}
      >
        <View style={styles.viewer}>
          {viewing ? (
            <>
              <View style={styles.viewerImage}>
                <PhotoImage photo={viewing} />
              </View>
              <AppText variant="bodyStrong" align="center">
                {POSE_LABEL[viewing.pose]} · {formatDate(viewing.takenOn)}
              </AppText>
              {remove.isError ? <Banner message={toUserMessage(remove.error)} /> : null}
              <View style={styles.viewerActions}>
                <Button
                  label="Close"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() => {
                    remove.reset();
                    setViewing(null);
                  }}
                />
                <Button
                  label="Delete"
                  variant="danger"
                  style={styles.flex}
                  loading={remove.isPending}
                  onPress={() => confirmDelete(viewing)}
                />
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

function PhotoImage({ photo }: { photo: ProgressPhoto }) {
  return photo.url ? (
    <Image
      source={{ uri: photo.url }}
      // Signed URLs change on refresh; cache by the stable storage path instead.
      recyclingKey={photo.storagePath}
      style={styles.image}
      contentFit="cover"
      transition={150}
    />
  ) : (
    <View style={[styles.image, styles.missing]}>
      <AppText variant="caption" color="textSubtle" align="center">
        Photo unavailable
      </AppText>
    </View>
  );
}

function CompareSide({ photo }: { photo: ProgressPhoto }) {
  return (
    <View style={styles.flex}>
      <View style={styles.compareImage}>
        <PhotoImage photo={photo} />
      </View>
      <AppText variant="caption" color="textMuted" align="center">
        {formatDate(photo.takenOn)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", paddingTop: spacing.sm },
  flex: { flex: 1, gap: spacing.xs },
  compare: { flexDirection: "row", gap: spacing.sm },
  compareImage: {
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
  },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xxl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cell: { width: "31.5%", gap: spacing.xs },
  cellDate: { textAlign: "center" },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  missing: { justifyContent: "center", padding: spacing.sm },
  viewer: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  viewerImage: { width: "100%", maxWidth: 420, alignSelf: "center" },
  viewerActions: {
    flexDirection: "row",
    gap: spacing.md,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
});
