import { notFound } from "next/navigation";
import { cards, cardBySlug } from "@/data/cards";
import { CardDetail } from "@/components/CardDetail";

export function generateStaticParams() {
  return cards.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const card = cardBySlug(params.slug);
  if (!card) return {};
  return {
    title: `${card.title} · ListeningMind Playbook`,
    description: card.shortDesc,
  };
}

export default function CardFullPage({ params }: { params: { slug: string } }) {
  const card = cardBySlug(params.slug);
  if (!card) notFound();
  return (
    <main className="page" style={{ marginTop: 0 }}>
      <CardDetail card={card} />
    </main>
  );
}
