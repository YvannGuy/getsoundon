/**
 * Pipeline de normalisation robuste pour le français
 */

import { NormalizedText, NumericMention, DateMention, LocationMention, NegationContext } from "./nlp-types";

// ============================================================================
// ÉTAPES DE NORMALISATION
// ============================================================================

export function cleanWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\n+/g, ' ');
}

export function normalizePunctuation(text: string): string {
  return text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/\s*[,;]\s*/g, ', ')
    .replace(/\s*[.!?]\s*/g, '. ');
}

export function normalizeApostrophes(text: string): string {
  return text
    .replace(/'/g, "'")
    .replace(/d'([aeiouyhâàéèêëîïôöùûü])/gi, "de $1")
    .replace(/l'([aeiouyhâàéèêëîïôöùûü])/gi, "le $1")
    .replace(/n'([aeiouyhâàéèêëîïôöùûü])/gi, "ne $1")
    .replace(/c'est/gi, "ce est")
    .replace(/qu'il/gi, "que il")
    .replace(/qu'elle/gi, "que elle");
}

export function removeDiacriticsVariant(text: string): string {
  // Garde une version avec diacritiques pour certains mots où c'est important
  return text
    .replace(/[àâä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u')
    .replace(/[ÿ]/g, 'y')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n');
}

export function detectNegations(text: string): NegationContext[] {
  const negations: NegationContext[] = [];
  const negationPatterns = [
    // Négations simples
    /\b(ne\s+(?:pas|point|jamais|plus|rien|personne|aucun|guère))\b/gi,
    /\b(pas\s+(?:de|d'|du|des))\b/gi,
    /\b(aucun|aucune)\b/gi,
    /\b(sans)\b/gi,
    /\b(pas\s+besoin)\b/gi,
    /\b(pas\s+nécessaire)\b/gi,
    
    // Négations avec mots spécifiques
    /\b(juste|seulement|uniquement)\b/gi,
    /\b(on\s+gère|nous\s+gérons)\b/gi,
    /\b(non\s+finalement|finalement\s+non)\b/gi,
  ];
  
  for (const pattern of negationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const negationText = match[0];
      const position = { start: match.index, end: match.index + negationText.length };
      
      // Déterminer la portée de la négation
      const scopeEnd = findNegationScope(text, position.end);
      const scope = { start: position.start, end: scopeEnd };
      
      negations.push({
        negationWords: negationText.split(/\s+/),
        position,
        scope,
        affectedConcepts: extractAffectedConcepts(text.substring(scope.start, scope.end))
      });
    }
  }
  
  return negations;
}

function findNegationScope(text: string, startPos: number): number {
  // Cherche jusqu'à la prochaine ponctuation forte ou fin de phrase
  const remaining = text.substring(startPos);
  const match = remaining.match(/[.!?;]|\bet\b|\bou\b|\bmais\b/);
  const idx = match?.index;
  return idx !== undefined ? startPos + idx : text.length;
}

function extractAffectedConcepts(scopeText: string): string[] {
  const concepts = [];
  const conceptPatterns = [
    /\b(dj|micro|son|lumière|écran|installation|livraison|technicien)\b/gi,
  ];
  
  for (const pattern of conceptPatterns) {
    let match;
    while ((match = pattern.exec(scopeText)) !== null) {
      concepts.push(match[1].toLowerCase());
    }
  }
  
  return [...new Set(concepts)];
}

export function normalizeSynonyms(text: string): string {
  const synonymMap = {
    // Nombres
    'une centaine': '100',
    'une cinquantaine': '50',
    'une trentaine': '30',
    'une vingtaine': '20',
    'une dizaine': '10',
    
    // Événements
    'afterwork': 'corporate',
    'teambuilding': 'corporate',
    'team building': 'corporate',
    'pots': 'cocktail',
    'vernissage': 'cocktail',
    'inauguration': 'corporate',
    
    // Équipements
    'sono': 'sonorisation',
    'hp': 'haut parleur',
    'hf': 'sans fil',
    'retour': 'monitor',
    'caisson': 'subwoofer',
    'lyre': 'projecteur motorisé',
    'par': 'projecteur',
    
    // Lieux
    'domicile': 'maison',
    'chez moi': 'maison',
    'boîte': 'entreprise',
    'taf': 'bureau',
    'resto': 'restaurant',
  };
  
  let normalized = text;
  for (const [synonym, replacement] of Object.entries(synonymMap)) {
    const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
    normalized = normalized.replace(regex, replacement);
  }
  
  return normalized;
}

export function normalizeNumbersInLetters(text: string): string {
  const numberMap: Record<string, string> = {
    // Unités
    'zéro': '0', 'un': '1', 'une': '1', 'deux': '2', 'trois': '3', 'quatre': '4',
    'cinq': '5', 'six': '6', 'sept': '7', 'huit': '8', 'neuf': '9', 'dix': '10',
    
    // Dizaines
    'onze': '11', 'douze': '12', 'treize': '13', 'quatorze': '14', 'quinze': '15',
    'seize': '16', 'dix-sept': '17', 'dix-huit': '18', 'dix-neuf': '19',
    'vingt': '20', 'trente': '30', 'quarante': '40', 'cinquante': '50',
    'soixante': '60', 'soixante-dix': '70', 'quatre-vingt': '80', 'quatre-vingts': '80',
    'quatre-vingt-dix': '90', 'nonante': '90',
    
    // Centaines
    'cent': '100', 'cents': '100', 'deux-cents': '200', 'trois-cents': '300',
    'quatre-cents': '400', 'cinq-cents': '500',
    
    // Approximations
    'environ': 'environ', 'autour de': 'environ', 'à peu près': 'environ',
    'approximativement': 'environ', 'dans les': 'environ',
  };
  
  let normalized = text;
  
  // Remplacer les nombres composés d'abord
  for (const [letters, digits] of Object.entries(numberMap)) {
    const regex = new RegExp(`\\b${letters}\\b`, 'gi');
    normalized = normalized.replace(regex, digits);
  }
  
  // Gérer les combinaisons comme "vingt-cinq"
  normalized = normalized.replace(/\b(\d+)-(\d+)\b/g, (match, tens, units) => {
    return (parseInt(tens) + parseInt(units)).toString();
  });
  
  return normalized;
}

export function normalizeDatePhrases(text: string): string {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  const dateMap: Record<string, string> = {
    'aujourd\'hui': formatDate(today),
    'demain': formatDate(addDays(today, 1)),
    'après-demain': formatDate(addDays(today, 2)),
    'hier': formatDate(addDays(today, -1)),
    'avant-hier': formatDate(addDays(today, -2)),
  };
  
  // Jours de la semaine
  const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const currentDay = today.getDay();
  
  for (let i = 0; i < 7; i++) {
    const dayName = weekdays[i];
    const daysFromNow = (i - currentDay + 7) % 7;
    const targetDate = addDays(today, daysFromNow === 0 ? 7 : daysFromNow);
    dateMap[dayName] = formatDate(targetDate);
    dateMap[`${dayName} prochain`] = formatDate(addDays(targetDate, 7));
    dateMap[`ce ${dayName}`] = formatDate(targetDate);
  }
  
  let normalized = text;
  for (const [phrase, replacement] of Object.entries(dateMap)) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    normalized = normalized.replace(regex, replacement);
  }
  
  return normalized;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// PIPELINE PRINCIPAL
// ============================================================================

export function normalizeText(text: string): NormalizedText {
  let processed = text;
  
  // Étapes de normalisation séquentielles
  processed = cleanWhitespace(processed);
  processed = normalizePunctuation(processed);
  processed = normalizeApostrophes(processed);
  processed = normalizeSynonyms(processed);
  processed = normalizeNumbersInLetters(processed);
  processed = normalizeDatePhrases(processed);
  
  // Version nettoyée pour l'analyse
  const cleaned = removeDiacriticsVariant(processed.toLowerCase());
  const tokens = cleaned.split(' ').filter(t => t.length > 1);
  const sentences = processed.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Détection des éléments structurels
  const negations = detectNegations(processed);
  const numbers = extractNumbers(processed);
  const dates = extractDates(processed);
  const locations = extractLocations(processed);
  const semanticSignals = generateSemanticSignals(cleaned, tokens);
  
  return {
    original: text,
    cleaned,
    tokens,
    sentences,
    numbers,
    dates,
    locations,
    negations,
    semanticSignals
  };
}

// ============================================================================
// EXTRACTORS BASIQUES (sera enrichi dans les fichiers suivants)
// ============================================================================

function extractNumbers(text: string): NumericMention[] {
  // Implémentation basique, sera enrichie dans numeric-extractors.ts
  const mentions: NumericMention[] = [];
  
  // Nombres exacts
  const exactPattern = /\b(\d{1,4})\s*(?:personnes?|pers\.?|invités?|guests?|participants?|€|euros?)\b/gi;
  let match;
  
  while ((match = exactPattern.exec(text)) !== null) {
    mentions.push({
      rawText: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      interpretation: { kind: "exact", value: parseInt(match[1]) },
      confidence: 0.9,
      context: match[0].includes('€') ? 'generic' : 'people'
    });
  }
  
  return mentions;
}

function extractDates(text: string): DateMention[] {
  // Implémentation basique, sera enrichie dans date-extractors.ts
  return [];
}

function extractLocations(text: string): LocationMention[] {
  // Implémentation basique, sera enrichie dans location-extractors.ts
  return [];
}

function generateSemanticSignals(text: string, tokens: string[]): Record<string, number> {
  // Réutilise la logique existante mais améliora dans semantic-analyzers.ts
  const signals: Record<string, number> = {};
  
  // Event type signals basiques
  if (text.includes('conference') || text.includes('seminaire')) signals.conference = 0.8;
  if (text.includes('anniversaire') || text.includes('birthday')) signals.birthday = 0.8;
  if (text.includes('mariage') || text.includes('wedding')) signals.wedding = 0.8;
  
  return signals;
}