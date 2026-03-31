"use client";

import { MapPin, Star, Truck, Wrench, User } from "lucide-react";
import Link from "next/link";
import { MatchingProvider } from "@/lib/event-assistant/types";

interface ProviderCardCompactProps {
  provider: MatchingProvider;
}

export function ProviderCardCompact({ provider }: ProviderCardCompactProps) {
  return (
    <Link
      href={`/prestataires/${provider.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all duration-200 hover:border-orange-300"
    >
      {/* Header avec image et nom */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {provider.imageUrl ? (
            <img
              src={provider.imageUrl}
              alt={provider.name}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : (
            <User className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">
            {provider.name}
          </h4>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{provider.location}</span>
          </div>
        </div>
      </div>

      {/* Services badges - 2 par ligne maximum */}
      <div className="flex flex-wrap gap-1 mb-3">
        {provider.capabilities.slice(0, 4).map((capability) => (
          <span
            key={capability}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
          >
            {capability === "livraison" && <Truck className="w-3 h-3 mr-1" />}
            {capability === "installation" && <Wrench className="w-3 h-3 mr-1" />}
            {capability}
          </span>
        ))}
        {provider.capabilities.length > 4 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            +{provider.capabilities.length - 4}
          </span>
        )}
      </div>

      {/* Footer avec rating et score */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          <Star className="w-3 h-3 text-yellow-400 fill-current" />
          <span>4.8 (42)</span>
        </div>
        <div className="text-right">
          <span className="text-green-600 font-medium">
            {Math.round(provider.score.total)}% compatible
          </span>
        </div>
      </div>
    </Link>
  );
}