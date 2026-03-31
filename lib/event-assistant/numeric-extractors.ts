/**
 * Extractors robustes pour nombres, quantités et approximations en français
 */

import { NumericMention, NumericInterpretation } from "./nlp-types";

// ============================================================================
// PATTERNS ET MAPPINGS
// ============================================================================

const NUMBERS_IN_LETTERS: Record<string, number> = {
  // Unités
  'zéro': 0, 'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
  'cinq': 5, 'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
  
  // Dizaines
  'onze': 11, 'douze': 12, 'treize': 13, 'quatorze': 14, 'quinze': 15,
  'seize': 16, 'dix-sept': 17, 'dix-huit': 18, 'dix-neuf': 19,
  'vingt': 20, 'trente': 30, 'quarante': 40, 'cinquante': 50,
  'soixante': 60, 'soixante-dix': 70, 'quatre-vingt': 80, 'quatre-vingts': 80,
  'quatre-vingt-dix': 90, 'nonante': 90,
  
  // Centaines
  'cent': 100, 'cents': 100, 'mille': 1000
};

const APPROXIMATION_MARKERS = [
  'environ', 'autour de', 'à peu près', 'approximativement', 'dans les',
  'vers', 'proche de', 'aux alentours de', 'grosso modo', 'à vue d\'œil'
];

const RANGE_MARKERS = [
  'entre', 'de', 'à', 'jusqu\'à', 'maximum', 'max', 'minimum', 'min',
  'pas plus de', 'pas moins de', 'au moins', 'au maximum'
];

const QUANTITY_SUFFIXES = [
  'aine', 'aines', // trentaine, cinquantaine
];

const CONTEXT_MARKERS: Record<string, string> = {
  'personnes': 'people',
  'pers': 'people', 
  'invités': 'people',
  'guests': 'people',
  'participants': 'people',
  'convives': 'people',
  '€': 'money',
  'euros': 'money',
  'budget': 'money',
  'enceintes': 'equipment',
  'micros': 'equipment',
  'spots': 'equipment',
  'lyres': 'equipment'
};

// ============================================================================
// EXTRACTORS PRINCIPAUX
// ============================================================================

export function extractNumericMentions(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  // 1. Nombres exacts en chiffres
  mentions.push(...extractExactNumbers(text));
  
  // 2. Nombres en lettres
  mentions.push(...extractNumbersInLetters(text));
  
  // 3. Approximations
  mentions.push(...extractApproximations(text));
  
  // 4. Plages de valeurs  
  mentions.push(...extractRanges(text));
  
  // 5. Quantités avec suffixes (-aine)
  mentions.push(...extractQuantitySuffixes(text));
  
  // 6. Expressions spéciales
  mentions.push(...extractSpecialExpressions(text));
  
  // Dédupliquer et trier par confiance
  return deduplicateAndSort(mentions);
}

function extractExactNumbers(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  // Pattern pour nombres avec contexte
  const patterns = [
    /\b(\d{1,4})\s*(personnes?|pers\.?|invités?|guests?|participants?|convives?)\b/gi,
    /\b(\d{1,6})\s*€?(?:\s*euros?)?\b/gi,
    /\b(\d{1,3})\s*(enceintes?|micros?|spots?|lyres?|projecteurs?)\b/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseInt(match[1]);
      const context = determineContext(match[0]);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: { kind: "exact", value },
        confidence: 0.95,
        context
      });
    }
  }
  
  return mentions;
}

function extractNumbersInLetters(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  // Pattern pour nombres composés
  const compositePattern = /\b(?:(deux|trois|quatre|cinq|six|sept|huit|neuf)[-\s]?(cents?|cent)(?:[-\s](\w+))?)\b/gi;
  let match;
  
  while ((match = compositePattern.exec(text)) !== null) {
    const value = parseCompositeNumber(match[0]);
    if (value > 0) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: { kind: "exact", value },
        confidence: 0.85,
        context: "people"
      });
    }
  }
  
  // Pattern pour nombres simples en lettres
  for (const [letters, value] of Object.entries(NUMBERS_IN_LETTERS)) {
    const pattern = new RegExp(`\\b${letters}\\s*(personnes?|invités?|enceintes?)\\b`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: { kind: "exact", value },
        confidence: 0.8,
        context: determineContext(match[0])
      });
    }
  }
  
  return mentions;
}

function extractApproximations(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  // Approximations avec marqueurs explicites
  for (const marker of APPROXIMATION_MARKERS) {
    const pattern = new RegExp(`\\b${marker}\\s*(\\d{1,4})(?:\\s*(personnes?|invités?|€?))?`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const value = parseInt(match[1]);
      const tolerance = calculateTolerance(value);
      const context = match[2] ? determineContext(match[2]) : 'generic';
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: { kind: "approx", value, tolerance },
        confidence: 0.8,
        context
      });
    }
  }
  
  return mentions;
}

function extractRanges(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  // Pattern pour "entre X et Y"
  const betweenPattern = /\bentre\s+(\d{1,4})(?:\s+et\s+(\d{1,4}))?\s*(personnes?|invités?|€?)?/gi;
  let match;
  
  while ((match = betweenPattern.exec(text)) !== null) {
    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min + calculateTolerance(min);
    const context = match[3] ? determineContext(match[3]) : 'generic';
    
    mentions.push({
      rawText: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      interpretation: { kind: "range", min, max },
      confidence: 0.9,
      context
    });
  }
  
  // Pattern pour "X à Y" ou "X-Y"
  const rangePattern = /\b(\d{1,4})(?:[-\s]?(?:à|\-)[-\s]?(\d{1,4}))\s*(personnes?|invités?|€?)?/gi;
  
  while ((match = rangePattern.exec(text)) !== null) {
    const min = parseInt(match[1]);
    const max = parseInt(match[2]);
    const context = match[3] ? determineContext(match[3]) : 'generic';
    
    if (max > min) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: { kind: "range", min, max },
        confidence: 0.85,
        context
      });
    }
  }
  
  // Pattern pour "maximum X" / "X max"
  const maxPattern = /\b(?:(?:maximum|max)\s+(\d{1,4})|(\d{1,4})\s+max)\s*(personnes?|invités?)?/gi;
  
  while ((match = maxPattern.exec(text)) !== null) {
    const value = parseInt(match[1] || match[2]);
    const context = match[3] ? determineContext(match[3]) : 'generic';
    
    mentions.push({
      rawText: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      interpretation: { kind: "range", min: 1, max: value },
      confidence: 0.75,
      context
    });
  }
  
  return mentions;
}

function extractQuantitySuffixes(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  const suffixMap: Record<string, { base: number; tolerance: number }> = {
    'dizaine': { base: 10, tolerance: 3 },
    'vingtaine': { base: 20, tolerance: 5 },
    'trentaine': { base: 30, tolerance: 8 },
    'quarantaine': { base: 40, tolerance: 10 },
    'cinquantaine': { base: 50, tolerance: 12 },
    'soixantaine': { base: 60, tolerance: 15 },
    'centaine': { base: 100, tolerance: 20 }
  };
  
  for (const [suffix, { base, tolerance }] of Object.entries(suffixMap)) {
    const pattern = new RegExp(`\\b(?:une?\\s+)?${suffix}\\s*(?:de\\s*)?(personnes?|invités?)?`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: { kind: "approx", value: base, tolerance },
        confidence: 0.75,
        context: 'people'
      });
    }
  }
  
  return mentions;
}

function extractSpecialExpressions(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  
  const specialExpressions: Record<string, NumericInterpretation> = {
    'pas énorme': { kind: "range", min: 20, max: 60 },
    'petit groupe': { kind: "range", min: 5, max: 20 },
    'grand groupe': { kind: "range", min: 50, max: 200 },
    'beaucoup de monde': { kind: "range", min: 100, max: 500 },
    'peu de monde': { kind: "range", min: 10, max: 40 },
    'quelques personnes': { kind: "range", min: 3, max: 15 },
    'plusieurs personnes': { kind: "range", min: 5, max: 30 },
    'foule': { kind: "range", min: 200, max: 1000 },
    'intime': { kind: "range", min: 5, max: 25 },
    'format intime': { kind: "range", min: 5, max: 25 }
  };
  
  for (const [expression, interpretation] of Object.entries(specialExpressions)) {
    const pattern = new RegExp(`\\b${expression}\\b`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation,
        confidence: 0.6,
        context: 'people'
      });
    }
  }
  
  return mentions;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function parseCompositeNumber(text: string): number {
  const cleaned = text.toLowerCase().replace(/[-\s]/g, ' ');
  let total = 0;
  
  // Gérer les centaines
  const hundredMatch = cleaned.match(/(deux|trois|quatre|cinq|six|sept|huit|neuf)?\s*(cents?|cent)/);
  if (hundredMatch) {
    const multiplier = hundredMatch[1] ? NUMBERS_IN_LETTERS[hundredMatch[1]] : 1;
    total += (multiplier || 1) * 100;
  }
  
  // Ajouter les unités/dizaines restantes
  const words = cleaned.split(/\s+/);
  for (const word of words) {
    if (NUMBERS_IN_LETTERS[word] && word !== 'cent' && word !== 'cents') {
      if (NUMBERS_IN_LETTERS[word] < 100) {
        total += NUMBERS_IN_LETTERS[word];
      }
    }
  }
  
  return total;
}

function calculateTolerance(value: number): number {
  if (value <= 20) return 3;
  if (value <= 50) return 8;
  if (value <= 100) return 15;
  if (value <= 500) return 30;
  return Math.round(value * 0.1);
}

function determineContext(text: string): "people" | "equipment" | "money" | "generic" {
  const lower = text.toLowerCase();
  
  for (const [marker, context] of Object.entries(CONTEXT_MARKERS)) {
    if (lower.includes(marker)) {
      return context as any;
    }
  }
  
  return 'generic';
}

function deduplicateAndSort(mentions: NumericMention[]): NumericMention[] {
  // Supprimer les doublons basés sur position
  const unique = mentions.filter((mention, index) => {
    return mentions.findIndex(other => 
      Math.abs(other.position.start - mention.position.start) < 5
    ) === index;
  });
  
  // Trier par confiance décroissante
  return unique.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

export function extractBestNumericValue(text: string, context?: 'people' | 'equipment' | 'money'): NumericInterpretation | null {
  const mentions = extractNumericMentions(text);
  
  if (mentions.length === 0) return null;
  
  // Filtrer par contexte si spécifié
  const filtered = context 
    ? mentions.filter(m => m.context === context)
    : mentions;
  
  if (filtered.length === 0) return null;
  
  // Retourner la meilleure interprétation
  return filtered[0].interpretation;
}

export function extractAllNumericValues(text: string): {
  people?: NumericInterpretation;
  equipment?: NumericInterpretation;
  money?: NumericInterpretation;
} {
  const mentions = extractNumericMentions(text);
  const result: any = {};
  
  for (const context of ['people', 'equipment', 'money'] as const) {
    const filtered = mentions.filter(m => m.context === context);
    if (filtered.length > 0) {
      result[context] = filtered[0].interpretation;
    }
  }
  
  return result;
}