export function LegalDoc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink [&_h2]:mt-8 [&_h2]:font-bold [&_h2]:text-lg [&_li]:ml-5 [&_li]:list-disc [&_p]:text-sub">
        {children}
      </div>
    </article>
  );
}
