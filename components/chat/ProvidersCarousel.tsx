"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchingProvider } from "@/lib/event-assistant/types";
import { ProviderCardCompact } from "./ProviderCardCompact";

interface ProvidersCarouselProps {
  providers: MatchingProvider[];
}

export function ProvidersCarousel({ providers }: ProvidersCarouselProps) {
  const [startIndex, setStartIndex] = useState(0);
  const CARDS_PER_PAGE = 2; // Afficher 2 cartes à la fois
  
  const canScrollLeft = startIndex > 0;
  const canScrollRight = startIndex + CARDS_PER_PAGE < providers.length;
  
  const scrollLeft = () => {
    setStartIndex(Math.max(0, startIndex - CARDS_PER_PAGE));
  };
  
  const scrollRight = () => {
    setStartIndex(Math.min(providers.length - CARDS_PER_PAGE, startIndex + CARDS_PER_PAGE));
  };
  
  const visibleProviders = providers.slice(startIndex, startIndex + CARDS_PER_PAGE);
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">
            Prestataires compatibles
          </h3>
          <p className="text-xs text-gray-500">
            {providers.length} prestataire{providers.length > 1 ? "s" : ""} trouvé{providers.length > 1 ? "s" : ""}
          </p>
        </div>
        
        {/* Navigation si plus de CARDS_PER_PAGE */}
        {providers.length > CARDS_PER_PAGE && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollLeft}
              disabled={!canScrollLeft}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollRight}
              disabled={!canScrollRight}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Cards carousel */}
      <div className="flex gap-3 overflow-hidden">
        {visibleProviders.map((provider) => (
          <div key={provider.id} className="flex-1 min-w-0">
            <ProviderCardCompact provider={provider} />
          </div>
        ))}
      </div>
      
      {/* Indicators */}
      {providers.length > CARDS_PER_PAGE && (
        <div className="flex justify-center gap-1 pt-2">
          {Array.from({ length: Math.ceil(providers.length / CARDS_PER_PAGE) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setStartIndex(index * CARDS_PER_PAGE)}
              className={`w-2 h-2 rounded-full transition-colors ${
                Math.floor(startIndex / CARDS_PER_PAGE) === index
                  ? "bg-orange-500"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}