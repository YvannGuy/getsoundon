/**
 * Extractors robustes pour dates absolues et relatives en français
 */

import { DateMention, DateData, DatePrecision } from "./nlp-types";

// ============================================================================
// CONSTANTES ET MAPPINGS
// ============================================================================

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const MONTHS_SHORT_FR = [
  'jan', 'fév', 'mar', 'avr', 'mai', 'jun',
  'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'
];

const WEEKDAYS_FR = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'
];

const SEASONS_FR: Record<string, { months: number[]; description: string }> = {
  'printemps': { months: [2, 3, 4], description: 'spring' },
  'été': { months: [5, 6, 7], description: 'summer' },
  'automne': { months: [8, 9, 10], description: 'autumn' },
  'hiver': { months: [11, 0, 1], description: 'winter' }
};

const MONTH_PERIODS: Record<string, { start: number; end: number; description: string }> = {
  'début': { start: 1, end: 10, description: 'early' },
  'mi': { start: 11, end: 20, description: 'mid' },
  'milieu': { start: 11, end: 20, description: 'mid' },
  'fin': { start: 21, end: 31, description: 'late' },
  'courant': { start: 1, end: 31, description: 'during' }
};

// ============================================================================
// EXTRACTORS PRINCIPAUX
// ============================================================================

export function extractDateMentions(text: string, referenceDate?: Date): DateMention[] {
  const reference = referenceDate || new Date();
  const mentions: DateMention[] = [];
  
  // 1. Dates absolues (12 avril, 12/04/2026, etc.)
  mentions.push(...extractAbsoluteDates(text));
  
  // 2. Dates relatives (demain, vendredi prochain, etc.)
  mentions.push(...extractRelativeDates(text, reference));
  
  // 3. Périodes (début juin, fin septembre, etc.)
  mentions.push(...extractDatePeriods(text, reference));
  
  // 4. Week-ends et plages
  mentions.push(...extractWeekendReferences(text, reference));
  
  // 5. Expressions temporelles spéciales
  mentions.push(...extractSpecialTemporalExpressions(text, reference));
  
  return deduplicateAndSortDates(mentions);
}

function extractAbsoluteDates(text: string): DateMention[] {
  const mentions: DateMention[] = [];
  
  // Pattern 1: "12 avril 2026" ou "le 12 avril"
  const longDatePattern = /\b(?:le\s+)?(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?\b/gi;
  let match;
  
  while ((match = longDatePattern.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
    const monthIndex = MONTHS_FR.indexOf(monthName);
    
    if (monthIndex >= 0 && day >= 1 && day <= 31) {
      const date = new Date(year, monthIndex, day);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: date.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0].trim(),
          inferredYear: !match[3],
          isRelative: false
        },
        confidence: match[3] ? 0.95 : 0.85 // Plus de confiance avec année explicite
      });
    }
  }
  
  // Pattern 2: "12/04/2026" ou "12-04-2026"
  const numericDatePattern = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](20\d{2})\b/g;
  
  while ((match = numericDatePattern.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1; // 0-based
    const year = parseInt(match[3]);
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(year, month, day);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: date.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0],
          inferredYear: false,
          isRelative: false
        },
        confidence: 0.9
      });
    }
  }
  
  // Pattern 3: "12/04" (sans année)
  const shortNumericDatePattern = /\b(\d{1,2})[\/\-.](\d{1,2})\b/g;
  
  while ((match = shortNumericDatePattern.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const currentYear = new Date().getFullYear();
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const date = new Date(currentYear, month, day);
      
      // Si la date est passée, assumer l'année suivante
      if (date < new Date()) {
        date.setFullYear(currentYear + 1);
      }
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: date.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0],
          inferredYear: true,
          isRelative: false
        },
        confidence: 0.75
      });
    }
  }
  
  return mentions;
}

function extractRelativeDates(text: string, reference: Date): DateMention[] {
  const mentions: DateMention[] = [];
  
  // Mots-clés temporels simples
  const simpleRelative: Record<string, number> = {
    "aujourd'hui": 0,
    'demain': 1,
    'après-demain': 2,
    'hier': -1,
    'avant-hier': -2
  };
  
  for (const [keyword, dayOffset] of Object.entries(simpleRelative)) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const targetDate = new Date(reference);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: targetDate.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0],
          isRelative: true
        },
        confidence: 0.95
      });
    }
  }
  
  // Jours de la semaine
  for (let i = 0; i < WEEKDAYS_FR.length; i++) {
    const dayName = WEEKDAYS_FR[i];
    
    // "vendredi" (le prochain vendredi)
    const simpleDayPattern = new RegExp(`\\b(${dayName})\\b(?!\\s+(?:dernier|passé))`, 'gi');
    let match;
    
    while ((match = simpleDayPattern.exec(text)) !== null) {
      const targetDate = getNextWeekday(reference, i);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: targetDate.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0],
          isRelative: true
        },
        confidence: 0.8
      });
    }
    
    // "vendredi prochain"
    const nextDayPattern = new RegExp(`\\b(${dayName}\\s+prochain)\\b`, 'gi');
    
    while ((match = nextDayPattern.exec(text)) !== null) {
      const nextWeek = new Date(reference);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const targetDate = getNextWeekday(nextWeek, i);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: targetDate.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0],
          isRelative: true
        },
        confidence: 0.9
      });
    }
    
    // "ce vendredi"
    const thisDayPattern = new RegExp(`\\b(ce\\s+${dayName})\\b`, 'gi');
    
    while ((match = thisDayPattern.exec(text)) !== null) {
      const targetDate = getThisWeekday(reference, i);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: targetDate.toISOString().split('T')[0],
          precision: "day",
          rawLabel: match[0],
          isRelative: true
        },
        confidence: 0.85
      });
    }
  }
  
  // "dans X jours/semaines"
  const inTimePattern = /\bdans\s+(\d{1,2})\s+(jours?|semaines?|mois)\b/gi;
  let match;
  
  while ((match = inTimePattern.exec(text)) !== null) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const targetDate = new Date(reference);
    
    if (unit.startsWith('jour')) {
      targetDate.setDate(targetDate.getDate() + amount);
    } else if (unit.startsWith('semaine')) {
      targetDate.setDate(targetDate.getDate() + (amount * 7));
    } else if (unit.startsWith('mois')) {
      targetDate.setMonth(targetDate.getMonth() + amount);
    }
    
    mentions.push({
      rawText: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      interpretation: {
        isoStart: targetDate.toISOString().split('T')[0],
        precision: unit.startsWith('jour') ? "day" : "week",
        rawLabel: match[0],
        isRelative: true
      },
      confidence: 0.8
    });
  }
  
  return mentions;
}

function extractDatePeriods(text: string, reference: Date): DateMention[] {
  const mentions: DateMention[] = [];
  
  // Périodes dans des mois : "début juin", "fin septembre"
  for (const [period, { start, end, description }] of Object.entries(MONTH_PERIODS)) {
    for (const monthName of MONTHS_FR) {
      const pattern = new RegExp(`\\b(${period}\\s+${monthName})(?:\\s+(\\d{4}))?\\b`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        const year = match[2] ? parseInt(match[2]) : reference.getFullYear();
        const monthIndex = MONTHS_FR.indexOf(monthName);
        
        const startDate = new Date(year, monthIndex, start);
        const endDate = new Date(year, monthIndex, Math.min(end, getDaysInMonth(year, monthIndex)));
        
        mentions.push({
          rawText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          interpretation: {
            isoStart: startDate.toISOString().split('T')[0],
            isoEnd: endDate.toISOString().split('T')[0],
            precision: "week",
            rawLabel: match[0],
            inferredYear: !match[2],
            isRelative: false
          },
          confidence: 0.8
        });
      }
    }
  }
  
  return mentions;
}

function extractWeekendReferences(text: string, reference: Date): DateMention[] {
  const mentions: DateMention[] = [];
  
  // "week-end du 14 juin"
  const weekendPattern = /\bweek[-\s]?end\s+du\s+(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+(\d{4}))?\b/gi;
  let match;
  
  while ((match = weekendPattern.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = match[3] ? parseInt(match[3]) : reference.getFullYear();
    const monthIndex = MONTHS_FR.indexOf(monthName);
    
    if (monthIndex >= 0) {
      const startDate = new Date(year, monthIndex, day);
      
      // Trouver le samedi le plus proche
      const dayOfWeek = startDate.getDay();
      const daysToSaturday = (6 - dayOfWeek) % 7;
      const saturday = new Date(startDate);
      saturday.setDate(saturday.getDate() + daysToSaturday);
      
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: saturday.toISOString().split('T')[0],
          isoEnd: sunday.toISOString().split('T')[0],
          precision: "weekend",
          rawLabel: match[0],
          inferredYear: !match[3],
          isRelative: false
        },
        confidence: 0.9
      });
    }
  }
  
  // "ce week-end", "le week-end prochain"
  const relativeWeekendPatterns = [
    { pattern: /\bce\s+week[-\s]?end\b/gi, offset: 0 },
    { pattern: /\bweek[-\s]?end\s+prochain\b/gi, offset: 7 },
    { pattern: /\ble\s+week[-\s]?end\b/gi, offset: 0 }
  ];
  
  for (const { pattern, offset } of relativeWeekendPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const saturday = getNextWeekday(reference, 6);
      saturday.setDate(saturday.getDate() + offset);
      
      const sunday = new Date(saturday);
      sunday.setDate(sunday.getDate() + 1);
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: saturday.toISOString().split('T')[0],
          isoEnd: sunday.toISOString().split('T')[0],
          precision: "weekend",
          rawLabel: match[0],
          isRelative: true
        },
        confidence: 0.85
      });
    }
  }
  
  return mentions;
}

function extractSpecialTemporalExpressions(text: string, reference: Date): DateMention[] {
  const mentions: DateMention[] = [];
  
  // Saisons
  for (const [seasonName, { months }] of Object.entries(SEASONS_FR)) {
    const pattern = new RegExp(`\\b${seasonName}(?:\\s+(\\d{4}))?\\b`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const year = match[1] ? parseInt(match[1]) : reference.getFullYear();
      const [startMonth, , endMonth] = months;
      
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, endMonth, getDaysInMonth(year, endMonth));
      
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          isoStart: startDate.toISOString().split('T')[0],
          isoEnd: endDate.toISOString().split('T')[0],
          precision: "month",
          rawLabel: match[0],
          inferredYear: !match[1],
          isRelative: false
        },
        confidence: 0.6
      });
    }
  }
  
  return mentions;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function getNextWeekday(fromDate: Date, targetDayOfWeek: number): Date {
  const result = new Date(fromDate);
  const currentDay = fromDate.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0) {
    // Si c'est le même jour, prendre le prochain
    result.setDate(result.getDate() + 7);
  } else {
    result.setDate(result.getDate() + daysUntilTarget);
  }
  
  return result;
}

function getThisWeekday(fromDate: Date, targetDayOfWeek: number): Date {
  const result = new Date(fromDate);
  const currentDay = fromDate.getDay();
  const daysUntilTarget = (targetDayOfWeek - currentDay + 7) % 7;
  
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function deduplicateAndSortDates(mentions: DateMention[]): DateMention[] {
  // Supprimer les doublons par position
  const unique = mentions.filter((mention, index) => {
    return mentions.findIndex(other => 
      Math.abs(other.position.start - mention.position.start) < 10
    ) === index;
  });
  
  // Trier par confiance décroissante
  return unique.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

export function extractBestDateValue(text: string, referenceDate?: Date): DateData | null {
  const mentions = extractDateMentions(text, referenceDate);
  return mentions.length > 0 ? mentions[0].interpretation : null;
}

export function extractAllDateValues(text: string, referenceDate?: Date): DateData[] {
  const mentions = extractDateMentions(text, referenceDate);
  return mentions.map(m => m.interpretation);
}

export function formatDateForDisplay(dateData: DateData): string {
  if (!dateData.isoStart) return dateData.rawLabel;
  
  const date = new Date(dateData.isoStart);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  let formatted = date.toLocaleDateString('fr-FR', options);
  
  if (dateData.isoEnd && dateData.isoEnd !== dateData.isoStart) {
    const endDate = new Date(dateData.isoEnd);
    formatted += ` au ${endDate.toLocaleDateString('fr-FR', options)}`;
  }
  
  return formatted;
}