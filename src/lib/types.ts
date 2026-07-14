export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "core_paid"
  | "upsell_offered"
  | "upsell_paid"
  | "downsell_offered"
  | "downsell_paid"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  public_id: string;
  status: OrderStatus;
  buyer_email: string | null;
  name1: string | null;
  name2: string | null;
  started_at: string | null;
  message: string | null;
  youtube_video_id: string | null;
  youtube_title: string | null;
  youtube_thumbnail: string | null;
  edit_token: string | null;
  edit_expires_at: string | null;
  mp_preference_core_id: string | null;
  mp_payment_core_id: string | null;
  mp_preference_upsell_id: string | null;
  mp_payment_upsell_id: string | null;
  mp_preference_downsell_id: string | null;
  mp_payment_downsell_id: string | null;
  qr_storage_path: string | null;
  polaroid_pdf_path: string | null;
  letter_pdf_path: string | null;
  terms_accepted_at: string | null;
  physical_shipping: unknown;
  physical_shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderPhoto = {
  id: string;
  order_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
};

/** Statuses que já liberam a página pública */
export const PAID_STATUSES: OrderStatus[] = [
  "core_paid",
  "upsell_offered",
  "upsell_paid",
  "downsell_offered",
  "downsell_paid",
  "completed",
];

export const MUTABLE_DRAFT_STATUSES: OrderStatus[] = [
  "draft",
  "pending_payment",
];

export function isPubliclyVisible(status: OrderStatus): boolean {
  return PAID_STATUSES.includes(status);
}

export function canMutateDraft(status: OrderStatus): boolean {
  return MUTABLE_DRAFT_STATUSES.includes(status);
}
