import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CouplePageView } from "@/components/couple-page/CouplePageView";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPubliclyVisible, type Order, type OrderPhoto } from "@/lib/types";

type Props = { params: Promise<{ publicId: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Nosso Tempo",
    robots: { index: false, follow: false },
  };
}

export default async function CouplePublicPage({ params }: Props) {
  const { publicId } = await params;

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();

  if (!order) notFound();
  const o = order as Order;
  if (!isPubliclyVisible(o.status)) notFound();
  if (!o.name1 || !o.name2 || !o.started_at || !o.message) notFound();

  const { data: photos } = await supabaseAdmin()
    .from("order_photos")
    .select("*")
    .eq("order_id", o.id)
    .order("sort_order", { ascending: true });

  const signed = await Promise.all(
    ((photos ?? []) as OrderPhoto[]).map(async (p) => {
      const { data } = await supabaseAdmin()
        .storage.from("couple-photos")
        .createSignedUrl(p.storage_path, 60 * 60);
      return data?.signedUrl
        ? { src: data.signedUrl, alt: `${o.name1} & ${o.name2}` }
        : null;
    }),
  );

  const photoList = signed.filter(Boolean) as { src: string; alt: string }[];
  if (photoList.length === 0) notFound();

  return (
    <CouplePageView
      data={{
        name1: o.name1,
        name2: o.name2,
        startedAt: o.started_at,
        message: o.message,
        photos: photoList,
        youtubeVideoId: o.youtube_video_id,
        youtubeTitle: o.youtube_title,
      }}
    />
  );
}
