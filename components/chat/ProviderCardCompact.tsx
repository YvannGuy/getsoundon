"use client";

import { MapPin, Star, User } from "lucide-react";
import Link from "next/link";
import { MatchingProvider } from "@/lib/event-assistant/types";

interface ProviderCardCompactProps {
  provider: MatchingProvider;
  matchScore?: number;
}

export function ProviderCardCompact({ provider, matchScore }: ProviderCardCompactProps) {
  const categories = provider.capabilities?.categories ?? [];
  const services = provider.capabilities?.services;

  const badges: string[] = [
    ...categories,
    ...(services?.delivery ? ["livraison"] : []),
    ...(services?.installation ? ["installation"] : []),
    ...(services?.technician ? ["technicien"] : []),
  ];

  return (
    <Link
      href={`/prestataires/${provider.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all duration-200 hover:border-orange-300"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {provider.image ? (
            <img
              src={provider.image}
              alt={provider.title}
              className="w-12 h-12 object-cover rounded-lg"
            />
          ) : (
            <User className="w-6 h-6 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-900 truncate">
            {provider.title}
          </h4>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{provider.location}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {badges.slice(0, 4).map((badge) => (
          <span
            key={badge}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
          >
            {badge}
          </span>
        ))}
        {badges.length > 4 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            +{badges.length - 4}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          {provider.rating != null && (
            <>
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span>
                {provider.rating.toFixed(1)}
                {provider.ratingCount != null && ` (${provider.ratingCount})`}
              </span>
            </>
          )}
        </div>
        {matchScore != null && (
          <span className="text-green-600 font-medium">
            {Math.round(matchScore)}% compatible
          </span>
        )}
      </div>
    </Link>
  );
}