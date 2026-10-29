import { useState } from "react";
import type { z } from "zod";
import { isCancellation, toUserMessage } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fieldErrors } from "./validation";

/**
 * Small form helper for the auth screens: validates with a Zod schema,
 * tracks field errors, a form-level error and the submitting state.
 */
export function useAuthForm<S extends z.ZodTypeAny>(
  schema: S,
  submit: (values: z.output<S>) => Promise<void>,
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (raw: z.input<S>) => {
    if (submitting) return;
    setFormError(null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await submit(parsed.data);
    } catch (error) {
      if (!isCancellation(error)) {
        logger.warn("Auth request failed", { error: String(error) });
        setFormError(toUserMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return { errors, formError, submitting, handleSubmit };
}
