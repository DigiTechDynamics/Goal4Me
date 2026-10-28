import { monthStart, parseMoneyInput, type BudgetBucket } from "@goal4me/core";
import { budgetCategorySchema } from "@goal4me/schemas";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform } from "react-native";
import { BackButton } from "@/components/BackButton";
import { ErrorView, LoadingView } from "@/components/StateViews";
import { AppText, Banner, Button, Screen, SegmentedControl, TextField } from "@/components/ui";
import { useUserId } from "@/features/auth/AuthProvider";
import {
  useArchiveCategory,
  useBudgetMonth,
  useSaveCategory,
  type Category,
} from "@/features/money/api";
import { toUserMessage } from "@/lib/errors";
import { localToday } from "@/lib/format";

/** Add a budget category, or edit/archive one (`?id=`). */
export default function CategoryScreen() {
  const userId = useUserId();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const month = useBudgetMonth(userId, monthStart(localToday()));

  if (month.isPending) return <LoadingView />;
  if (month.isError) {
    return <ErrorView message={toUserMessage(month.error)} onRetry={() => void month.refetch()} />;
  }
  const existing = id ? month.data.categories.find((c) => c.id === id) : undefined;
  if (id && !existing) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Category not found</AppText>
        <AppText color="textMuted">It may have been archived on another device.</AppText>
      </Screen>
    );
  }
  return (
    <CategoryForm
      userId={userId}
      existing={existing}
      currency={month.data.budget?.currency ?? "USD"}
    />
  );
}

function CategoryForm({
  userId,
  existing,
  currency,
}: {
  userId: string;
  existing: Category | undefined;
  currency: string;
}) {
  const save = useSaveCategory(userId);
  const archive = useArchiveCategory(userId);
  const [name, setName] = useState(existing?.name ?? "");
  const [bucket, setBucket] = useState<BudgetBucket>(existing?.bucket ?? "needs");
  const [limit, setLimit] = useState(
    existing?.limitMinor != null ? String(existing.limitMinor / 100) : "",
  );
  const [errors, setErrors] = useState<{ name?: string; limit?: string }>({});

  const submit = () => {
    const limitMinor = limit.trim() === "" ? null : parseMoneyInput(limit);
    if (limit.trim() !== "" && limitMinor === null) {
      setErrors({ limit: "Enter an amount, or leave it empty for no limit" });
      return;
    }
    const parsed = budgetCategorySchema.safeParse({ name, bucket, limitMinor });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setErrors(issue?.path[0] === "name" ? { name: issue.message } : { limit: issue?.message });
      return;
    }
    setErrors({});
    save.mutate(
      { id: existing?.id ?? null, input: parsed.data },
      { onSuccess: () => router.back() },
    );
  };

  const confirmArchive = () => {
    if (!existing) return;
    const run = () => archive.mutate(existing.id, { onSuccess: () => router.back() });
    const message = "Past expenses stay in your history. You can't log new ones here.";
    if (Platform.OS === "web") {
      if (window.confirm(`Archive ${existing.name}? ${message}`)) run();
      return;
    }
    Alert.alert(`Archive ${existing.name}?`, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: run },
    ]);
  };

  const failure = save.error ?? archive.error;
  // Postgres unique (user_id, name) → a friendlier message than the generic one.
  const duplicate = failure && "code" in failure && failure.code === "23505";

  return (
    <Screen
      footer={
        <>
          <Button
            label={existing ? "Save changes" : "Add category"}
            loading={save.isPending}
            onPress={submit}
          />
          {existing ? (
            <Button
              label="Archive category"
              variant="ghost"
              loading={archive.isPending}
              onPress={confirmArchive}
            />
          ) : null}
        </>
      }
    >
      <BackButton variant="close" />
      <AppText variant="title" accessibilityRole="header">
        {existing ? "Edit category" : "New category"}
      </AppText>
      {failure ? (
        <Banner
          message={
            duplicate ? "You already have a category with that name." : toUserMessage(failure)
          }
        />
      ) : null}
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        maxLength={40}
        error={errors.name}
      />
      <SegmentedControl
        options={[
          { value: "needs", label: "Need" },
          { value: "wants", label: "Want" },
          { value: "savings", label: "Saving" },
        ]}
        value={bucket}
        onChange={setBucket}
        accessibilityLabel="Type of spending"
      />
      <TextField
        label="Monthly limit (optional)"
        value={limit}
        onChangeText={setLimit}
        keyboardType="decimal-pad"
        suffix={currency}
        error={errors.limit}
      />
    </Screen>
  );
}
