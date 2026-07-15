import { z } from "zod";

/**
 * Thumbnail do YouTube: aceita só URLs hospedadas nos domínios oficiais de
 * thumbnail (ytimg.com / img.youtube.com). `z.string().url()` sozinho deixava
 * salvar qualquer origem, virando vetor de tracking pixel / conteúdo externo
 * quando a URL é renderizada como <img> no wizard e nos e-mails.
 */
const youtubeThumbnailUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const host = new URL(value).hostname.toLowerCase();
      return (
        host === "img.youtube.com" ||
        host === "ytimg.com" ||
        host.endsWith(".ytimg.com")
      );
    } catch {
      return false;
    }
  }, "Thumbnail deve ser do YouTube.");

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
    youtubeThumbnail: youtubeThumbnailUrl.optional().nullable(),
    buyerEmail: z.string().trim().email().optional(),
    termsAccepted: z.boolean().optional(),
  })
  .strict();

/**
 * Variante do PATCH usada pelo edit magic link (/api/edit/[token]): não
 * permite trocar buyerEmail nem termos — um token vazado não pode
 * redirecionar os e-mails de entrega do pedido.
 */
export const editUpdateSchema = draftUpdateSchema.omit({
  buyerEmail: true,
  termsAccepted: true,
});

/** Payload completo do wizard, validado de uma vez só no clique em "Pagar". */
export const checkoutSubmitSchema = z.object({
  name1: z.string().trim().min(1).max(80),
  name2: z.string().trim().min(1).max(80),
  startedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  message: z.string().trim().min(1).max(500),
  youtubeVideoId: z.string().trim().min(1).max(32).optional(),
  youtubeTitle: z.string().trim().max(200).optional(),
  youtubeThumbnail: youtubeThumbnailUrl.optional(),
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
