import { z } from "zod";

export const draftCreateSchema = z.object({}).strict();

/** Texto do rascunho: vazio vira null (autosave parcial). Obrigatório só no Continuar. */
const draftText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return value.length === 0 ? null : value;
    });

export const draftUpdateSchema = z
  .object({
    name1: draftText(80),
    name2: draftText(80),
    /** ISO date YYYY-MM-DD */
    startedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** HH:mm opcional; default 00:00 */
    startedTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .nullable(),
    message: draftText(500),
    youtubeVideoId: z.string().trim().min(1).max(32).optional().nullable(),
    youtubeTitle: z.string().trim().max(200).optional().nullable(),
    youtubeThumbnail: z.string().url().optional().nullable(),
    buyerEmail: z.string().trim().email().optional(),
    termsAccepted: z.boolean().optional(),
  })
  .strict();

export const checkoutCoreSchema = z.object({
  draftId: z.string().uuid(),
  buyerEmail: z.string().trim().email(),
  termsAccepted: z.literal(true),
});

export const youtubeSearchSchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export const youtubeValidateSchema = z.object({
  videoId: z.string().trim().min(1).max(32),
});

export type DraftUpdateInput = z.infer<typeof draftUpdateSchema>;
