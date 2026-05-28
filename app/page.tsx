import { Cover } from "@/components/Cover";
import { PersonaSection } from "@/components/PersonaSection";
import { TopNav } from "@/components/TopNav";
import { personas } from "@/data/personas";

export default function HomePage() {
  return (
    <>
      <TopNav />
      <Cover />
      {personas.map((p) => (
        <PersonaSection key={p.slug} persona={p} />
      ))}
    </>
  );
}
