"use client";

// Visionneuse de carrousel : les slides défilent SUR PLACE, et le
// téléchargement se fait par deux boutons sous le carrousel (le PDF prêt à
// publier, ou toutes les images en PNG dans un zip).
//
// Pourquoi ce parti pris (demande Béné) : le kit contient les DEUX formats
// du même carrousel. Les afficher côte à côte donnait l'impression de deux
// visuels différents, et l'affilié téléchargeait les deux pour rien.
//
// Défilement natif plutôt qu'une librairie : un conteneur scroll-snap
// donne le swipe tactile gratuitement sur mobile, et l'Atelier n'embarque
// pas de moteur de carrousel. Une dépendance de plus pour six images
// n'aurait rien apporté.

import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CarouselViewer({
  postId,
  slides,
  captions,
  pdf,
  alt,
}: {
  postId: string;
  slides: string[];
  captions: string[];
  pdf: string;
  alt: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(0);

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, el.children.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }, []);

  // L'index vient de la position réelle du scroll : le swipe tactile et les
  // flèches passent donc par le même chemin, et les puces ne peuvent pas
  // désigner une autre slide que celle affichée.
  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setCurrent(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto w-full max-w-sm">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-lg border border-border bg-muted [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((src, i) => (
            <div key={src} className="w-full shrink-0 snap-center">
              <div className="flex aspect-[4/5] items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`${alt}, image ${i + 1}`}
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Image précédente"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-1.5 shadow-sm transition hover:bg-background disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Image suivante"
          onClick={() => goTo(current + 1)}
          disabled={current >= slides.length - 1}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/90 p-1.5 shadow-sm transition hover:bg-background disabled:pointer-events-none disabled:opacity-0"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {slides.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Aller à l'image ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {captions[current] && (
        <p className="text-center text-xs text-muted-foreground">
          {current + 1}/{slides.length} · {captions[current]}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" asChild>
          <a href={pdf} download>
            <FileText className="size-4" />
            Télécharger en PDF
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a
            href={`/api/me/affiliate-carousel?post=${encodeURIComponent(postId)}`}
            download
          >
            <Images className="size-4" />
            Les {slides.length} PNG
          </a>
        </Button>
      </div>
    </div>
  );
}

export function SingleVisual({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="mx-auto flex aspect-[4/5] w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" />
      </div>
      <div className="flex justify-center">
        <Button size="sm" asChild>
          <a href={src} download>
            <Download className="size-4" />
            Télécharger en PNG
          </a>
        </Button>
      </div>
    </div>
  );
}
