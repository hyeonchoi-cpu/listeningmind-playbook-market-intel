import { notFound } from "next/navigation";
import { cardBySlug } from "@/data/cards";
import { CardDetail } from "@/components/CardDetail";
import { Modal } from "@/components/Modal";

export default function CardModalPage({ params }: { params: { slug: string } }) {
  const card = cardBySlug(params.slug);
  if (!card) notFound();
  return (
    <Modal>
      <CardDetail card={card} />
    </Modal>
  );
}
