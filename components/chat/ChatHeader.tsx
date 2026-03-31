"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";

export function ChatHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
      <Link 
        href="/" 
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Retour</span>
      </Link>
      
      <div className="flex-1 flex items-center justify-center gap-2">
        <MessageSquare className="w-5 h-5 text-orange-500" />
        <h1 className="text-lg font-semibold text-gray-900">
          Assistant Événementiel
        </h1>
      </div>
      
      <div className="w-16" /> {/* Spacer pour centrer le titre */}
    </header>
  );
}