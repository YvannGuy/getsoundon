/**
 * Extractors pour équipement explicite avec quantités et spécifications
 */

import { EquipmentMention, ExplicitEquipmentRequest, EquipmentCategory, NumericInterpretation } from "./nlp-types";
import { extractNumericMentions } from "./numeric-extractors";

// ============================================================================
// MAPPINGS ÉQUIPEMENTS
// ============================================================================

const EQUIPMENT_CATEGORIES: Record<EquipmentCategory, {
  patterns: RegExp[];
  subcategories: Record<string, RegExp[]>;
  brands?: string[];
  quantityContext: "required" | "optional" | "rarely";
}> = {
  speakers: {
    patterns: [
      /\b(?:enceintes?|haut[\s\-]?parleurs?|hp|baffles?|monitors?)\b/gi,
      /\b(?:sono|sonorisation|sound\s+system)\b/gi
    ],
    subcategories: {
      'frontales': [/\b(?:enceintes?\s+(?:principales?|frontales?|façade))\b/gi],
      'retours': [/\b(?:retours?|monitors?|wedges?)\b/gi],
      'subwoofers': [/\b(?:caissons?|subs?|subwoofers?|graves?)\b/gi],
      'actives': [/\b(?:enceintes?\s+actives?|powered\s+speakers?)\b/gi],
      'passives': [/\b(?:enceintes?\s+passives?|passive\s+speakers?)\b/gi]
    },
    brands: ['JBL', 'QSC', 'Yamaha', 'RCF', 'EV', 'Mackie', 'Behringer'],
    quantityContext: "required"
  },

  microphones: {
    patterns: [
      /\b(?:micros?|microphones?|mic\b)\b/gi
    ],
    subcategories: {
      'hf': [/\b(?:micros?\s+(?:hf|sans\s+fil|wireless|radio))\b/gi],
      'filaire': [/\b(?:micros?\s+(?:filaires?|avec\s+fil))\b/gi],
      'main': [/\b(?:micros?\s+(?:(?:à\s+)?main|handheld))\b/gi],
      'cravate': [/\b(?:micros?\s+(?:cravates?|lavalier))\b/gi],
      'serre-tête': [/\b(?:micros?\s+serre[\s\-]?têtes?|headsets?)\b/gi],
      'pied': [/\b(?:micros?\s+(?:sur\s+)?pieds?|stands?)\b/gi]
    },
    brands: ['Shure', 'Sennheiser', 'Audio-Technica', 'AKG', 'Electro-Voice'],
    quantityContext: "required"
  },

  mixing: {
    patterns: [
      /\b(?:table(?:s?\s+de\s+mixage)?|consoles?\s+(?:de\s+mixage)?|mixers?)\b/gi,
      /\b(?:régie|mixage|mixing\s+desk)\b/gi
    ],
    subcategories: {
      'analogique': [/\b(?:table\s+analogique|analog\s+mixer)\b/gi],
      'numérique': [/\b(?:table\s+numérique|digital\s+mixer)\b/gi],
      'dj': [/\b(?:table\s+dj|dj\s+mixer)\b/gi]
    },
    brands: ['Allen & Heath', 'Yamaha', 'Soundcraft', 'Behringer', 'Mackie'],
    quantityContext: "rarely"
  },

  lighting: {
    patterns: [
      /\b(?:lumières?|éclairage|lights?|spots?)\b/gi,
      /\b(?:lyres?|pars?(?:\s+led)?|projecteurs?)\b/gi
    ],
    subcategories: {
      'par-led': [/\b(?:pars?\s+led|par\s+64)\b/gi],
      'lyres': [/\b(?:lyres?|moving\s+heads?|têtes\s+mobiles?)\b/gi],
      'spots': [/\b(?:spots?|projecteurs?\s+fixes?)\b/gi],
      'wash': [/\b(?:wash|flood)\b/gi],
      'stroboscopes': [/\b(?:strobos?|stroboscopes?|flashs?)\b/gi]
    },
    brands: ['Chauvet', 'ADJ', 'Showtec', 'Martin', 'Robe'],
    quantityContext: "optional"
  },

  screens: {
    patterns: [
      /\b(?:écrans?\s+led|murs?\s+led|led\s+walls?)\b/gi,
      /\b(?:écrans?\s+(?:géants?|vidéo))\b/gi
    ],
    subcategories: {
      'indoor': [/\b(?:écrans?\s+(?:intérieurs?|indoor))\b/gi],
      'outdoor': [/\b(?:écrans?\s+(?:extérieurs?|outdoor))\b/gi],
      'pitch': [/\b(?:pitch\s+\d+(?:mm)?)\b/gi]
    },
    quantityContext: "rarely"
  },

  dj_equipment: {
    patterns: [
      /\b(?:platines?|dj|turntables?|controllers?)\b/gi,
      /\b(?:cdj|pioneer|technics)\b/gi
    ],
    subcategories: {
      'platines-vinyle': [/\b(?:platines?\s+vinyles?|turntables?)\b/gi],
      'cdj': [/\b(?:cdjs?|lecteurs?\s+cd)\b/gi],
      'controllers': [/\b(?:controllers?|contrôleurs?)\b/gi]
    },
    brands: ['Pioneer', 'Technics', 'Numark', 'Native Instruments'],
    quantityContext: "optional"
  },

  video: {
    patterns: [
      /\b(?:projecteurs?|vidéoprojecteurs?|beamers?)\b/gi,
      /\b(?:écrans?\s+de\s+projection)\b/gi
    ],
    subcategories: {
      'courte-focale': [/\b(?:courte\s+focale|short\s+throw)\b/gi],
      'longue-focale': [/\b(?:longue\s+focale|long\s+throw)\b/gi]
    },
    quantityContext: "rarely"
  },

  rigging: {
    patterns: [
      /\b(?:structures?|portiques?|pieds?|supports?)\b/gi,
      /\b(?:trépieds?|stands?|perches?)\b/gi
    ],
    subcategories: {
      'portiques': [/\b(?:portiques?|structures?\s+alu)\b/gi],
      'pieds': [/\b(?:pieds?\s+(?:d'enceintes?|micros?))\b/gi],
      'trépieds': [/\b(?:trépieds?|tripods?)\b/gi]
    },
    quantityContext: "optional"
  },

  power: {
    patterns: [
      /\b(?:alimentations?|blocs?\s+secteur|multiprises?)\b/gi,
      /\b(?:rallonges?|câbles?\s+d'alimentation)\b/gi
    ],
    subcategories: {
      'multiprises': [/\b(?:multiprises?|power\s+strips?)\b/gi],
      'rallonges': [/\b(?:rallonges?|extensions?)\b/gi]
    },
    quantityContext: "optional"
  },

  accessories: {
    patterns: [
      /\b(?:câbles?|connectiques?|adaptateurs?)\b/gi,
      /\b(?:di[\s\-]?box|boîtiers?\s+di)\b/gi
    ],
    subcategories: {
      'xlr': [/\b(?:câbles?\s+xlr|xlr)\b/gi],
      'jack': [/\b(?:câbles?\s+jacks?|jacks?)\b/gi],
      'rca': [/\b(?:câbles?\s+rca|rca|cinch)\b/gi],
      'di-box': [/\b(?:di[\s\-]?box|boîtiers?\s+di)\b/gi]
    },
    quantityContext: "rarely"
  }
};

const EQUIPMENT_QUALIFIERS = [
  'professionnel', 'pro', 'semi-pro', 'amateur', 'haut de gamme', 'entrée de gamme',
  'puissant', 'compact', 'portable', 'fixe', 'mobile', 'léger', 'lourd',
  'bluetooth', 'wifi', 'filaire', 'sans fil', 'actif', 'passif',
  'numérique', 'analogique', 'vintage', 'moderne', 'neuf', 'occasion'
];

// ============================================================================
// EXTRACTORS PRINCIPAUX
// ============================================================================

export function extractEquipmentMentions(text: string): EquipmentMention[] {
  const mentions: EquipmentMention[] = [];
  
  // Extraire d'abord les mentions numériques pour les associer aux équipements
  const numericMentions = extractNumericMentions(text);
  
  for (const [category, config] of Object.entries(EQUIPMENT_CATEGORIES)) {
    mentions.push(...extractCategoryMentions(
      text, 
      category as EquipmentCategory, 
      config,
      numericMentions
    ));
  }
  
  return deduplicateAndSortEquipment(mentions);
}

function extractCategoryMentions(
  text: string,
  category: EquipmentCategory,
  config: any,
  numericMentions: any[]
): EquipmentMention[] {
  const mentions: EquipmentMention[] = [];
  
  // Patterns de base pour la catégorie
  for (const pattern of config.patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const equipment = extractDetailedEquipment(
        text,
        match,
        category,
        config,
        numericMentions
      );
      
      if (equipment) {
        mentions.push(equipment);
      }
    }
  }
  
  // Sous-catégories spécifiques
  for (const [subcategory, patterns] of Object.entries(config.subcategories) as [string, RegExp[]][]) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const equipment = extractDetailedEquipment(
          text,
          match,
          category,
          config,
          numericMentions,
          subcategory
        );
        
        if (equipment) {
          mentions.push(equipment);
        }
      }
    }
  }
  
  return mentions;
}

function extractDetailedEquipment(
  text: string,
  match: RegExpMatchArray,
  category: EquipmentCategory,
  config: any,
  numericMentions: any[],
  subcategory?: string
): EquipmentMention | null {
  const matchStart = match.index!;
  const matchEnd = matchStart + match[0].length;
  
  // Étendre la zone d'analyse autour du match
  const contextStart = Math.max(0, matchStart - 50);
  const contextEnd = Math.min(text.length, matchEnd + 50);
  const contextText = text.substring(contextStart, contextEnd);
  
  // Extraire quantité
  const quantity = extractQuantityNearMatch(numericMentions, matchStart, matchEnd);
  
  // Extraire qualificateurs
  const qualifiers = extractQualifiers(contextText);
  
  // Extraire marque/modèle
  const { brand, model } = extractBrandAndModel(contextText, config.brands || []);
  
  // Extraire spécifications techniques
  const specifications = extractSpecifications(contextText, category);
  
  const equipment: ExplicitEquipmentRequest = {
    category,
    subcategory,
    quantity,
    qualifiers,
    brand,
    model,
    specifications: Object.keys(specifications).length > 0 ? specifications : undefined
  };
  
  // Calculer la confiance
  let confidence = 0.8;
  if (subcategory) confidence += 0.1;
  if (quantity) confidence += 0.05;
  if (brand) confidence += 0.05;
  if (qualifiers.length > 0) confidence += 0.05;
  
  return {
    rawText: match[0],
    position: { start: matchStart, end: matchEnd },
    interpretation: equipment,
    confidence: Math.min(0.95, confidence)
  };
}

function extractQuantityNearMatch(
  numericMentions: any[],
  matchStart: number,
  matchEnd: number
): NumericInterpretation | undefined {
  // Chercher une mention numérique dans les 30 caractères avant ou après
  const nearby = numericMentions.filter(mention => {
    const mentionStart = mention.position.start;
    const mentionEnd = mention.position.end;
    
    // Quantité avant l'équipement (ex: "2 micros")
    const beforeDistance = matchStart - mentionEnd;
    if (beforeDistance >= 0 && beforeDistance <= 30) return true;
    
    // Quantité après l'équipement (ex: "micros : 2")
    const afterDistance = mentionStart - matchEnd;
    if (afterDistance >= 0 && afterDistance <= 30) return true;
    
    return false;
  });
  
  if (nearby.length > 0) {
    // Prendre la mention la plus proche
    const closest = nearby.reduce((best, current) => {
      const bestDistance = Math.min(
        Math.abs(best.position.start - matchEnd),
        Math.abs(matchStart - best.position.end)
      );
      const currentDistance = Math.min(
        Math.abs(current.position.start - matchEnd),
        Math.abs(matchStart - current.position.end)
      );
      
      return currentDistance < bestDistance ? current : best;
    });
    
    return closest.interpretation;
  }
  
  return undefined;
}

function extractQualifiers(contextText: string): string[] {
  const qualifiers: string[] = [];
  
  for (const qualifier of EQUIPMENT_QUALIFIERS) {
    const pattern = new RegExp(`\\b${qualifier}\\b`, 'gi');
    if (pattern.test(contextText)) {
      qualifiers.push(qualifier);
    }
  }
  
  return [...new Set(qualifiers)]; // Dédupliquer
}

function extractBrandAndModel(contextText: string, brands: string[]): { brand?: string; model?: string } {
  let brand: string | undefined;
  let model: string | undefined;
  
  // Chercher les marques connues
  for (const brandName of brands) {
    const pattern = new RegExp(`\\b${brandName}\\b`, 'gi');
    if (pattern.test(contextText)) {
      brand = brandName;
      break;
    }
  }
  
  // Chercher des modèles (patterns génériques)
  const modelPatterns = [
    /\b([A-Z]{2,4}[-\s]?\d{2,4}[A-Z]*)\b/g, // Ex: RCF-312A, QSC-K12
    /\b(\w+\s+\d{2,4})\b/g, // Ex: Beta 58, SM 57
  ];
  
  for (const pattern of modelPatterns) {
    const match = contextText.match(pattern);
    if (match) {
      model = match[1];
      break;
    }
  }
  
  return { brand, model };
}

function extractSpecifications(contextText: string, category: EquipmentCategory): Record<string, string> {
  const specs: Record<string, string> = {};
  
  switch (category) {
    case 'speakers':
      // Puissance
      const powerMatch = contextText.match(/(\d{2,4})\s*(?:w|watts?)\b/gi);
      if (powerMatch) specs.power = powerMatch[0];
      
      // Taille
      const sizeMatch = contextText.match(/(\d{1,2})\s*(?:pouces?|")\b/gi);
      if (sizeMatch) specs.size = sizeMatch[0];
      break;
      
    case 'microphones':
      // Type de capsule
      if (/\b(?:dynamique|condenser|ruban)\b/gi.test(contextText)) {
        const typeMatch = contextText.match(/\b(dynamique|condenser|ruban)\b/gi);
        if (typeMatch) specs.type = typeMatch[0];
      }
      break;
      
    case 'lighting':
      // Couleur LED
      if (/\b(?:rgb|rgbw|blanc)\b/gi.test(contextText)) {
        const colorMatch = contextText.match(/\b(rgb|rgbw|blanc)\b/gi);
        if (colorMatch) specs.color = colorMatch[0];
      }
      
      // Puissance LED
      const ledPowerMatch = contextText.match(/(\d{1,3})\s*(?:w|watts?)\s*led/gi);
      if (ledPowerMatch) specs.ledPower = ledPowerMatch[0];
      break;
      
    case 'screens':
      // Taille écran
      const screenSizeMatch = contextText.match(/(\d{1,3})\s*(?:m²|mètres?\s+carrés?)/gi);
      if (screenSizeMatch) specs.size = screenSizeMatch[0];
      
      // Pitch
      const pitchMatch = contextText.match(/pitch\s+(\d+(?:\.\d+)?)\s*mm/gi);
      if (pitchMatch) specs.pitch = pitchMatch[0];
      break;
  }
  
  return specs;
}

// ============================================================================
// DÉTECTION NÉGATIONS SUR ÉQUIPEMENT
// ============================================================================

export function detectEquipmentNegations(text: string): Array<{
  equipment: EquipmentCategory;
  polarity: "excluded" | "not_needed";
  confidence: number;
}> {
  const negations: Array<{
    equipment: EquipmentCategory;
    polarity: "excluded" | "not_needed";
    confidence: number;
  }> = [];
  
  // Patterns de négation spécifiques à l'équipement
  const negationPatterns = [
    { pattern: /\bpas\s+(?:besoin\s+)?(?:de|d')\s+(\w+)/gi, polarity: "not_needed" as const },
    { pattern: /\bsans\s+(\w+)/gi, polarity: "excluded" as const },
    { pattern: /\bpas\s+de\s+(\w+)/gi, polarity: "excluded" as const },
    { pattern: /\bjuste\s+(?:du|de\s+la|les?)\s+(\w+)/gi, polarity: "excluded" as const }, // "juste du son" = pas d'autre chose
    { pattern: /\buniquement\s+(?:du|de\s+la|les?)\s+(\w+)/gi, polarity: "excluded" as const },
    { pattern: /\bseulement\s+(?:du|de\s+la|les?)\s+(\w+)/gi, polarity: "excluded" as const }
  ];
  
  for (const { pattern, polarity } of negationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const equipmentWord = match[1].toLowerCase();
      
      // Mapper le mot à une catégorie d'équipement
      const category = mapWordToEquipmentCategory(equipmentWord);
      if (category) {
        negations.push({
          equipment: category,
          polarity,
          confidence: 0.8
        });
      }
    }
  }
  
  return negations;
}

function mapWordToEquipmentCategory(word: string): EquipmentCategory | null {
  const mapping: Record<string, EquipmentCategory> = {
    'dj': 'dj_equipment',
    'platine': 'dj_equipment',
    'platines': 'dj_equipment',
    'micro': 'microphones',
    'micros': 'microphones',
    'microphone': 'microphones',
    'microphones': 'microphones',
    'son': 'speakers',
    'sono': 'speakers',
    'enceinte': 'speakers',
    'enceintes': 'speakers',
    'lumière': 'lighting',
    'lumières': 'lighting',
    'éclairage': 'lighting',
    'spots': 'lighting',
    'écran': 'screens',
    'écrans': 'screens',
    'vidéo': 'video',
    'table': 'mixing',
    'mixage': 'mixing'
  };
  
  return mapping[word] || null;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function deduplicateAndSortEquipment(mentions: EquipmentMention[]): EquipmentMention[] {
  // Supprimer les doublons par position
  const unique = mentions.filter((mention, index) => {
    return mentions.findIndex(other => 
      Math.abs(other.position.start - mention.position.start) < 20
    ) === index;
  });
  
  // Trier par confiance décroissante puis par spécificité
  return unique.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    
    // Les mentions avec sous-catégorie sont plus spécifiques
    const aSpecificity = (a.interpretation.subcategory ? 1 : 0) + 
                        (a.interpretation.quantity ? 1 : 0) + 
                        (a.interpretation.brand ? 1 : 0);
    const bSpecificity = (b.interpretation.subcategory ? 1 : 0) + 
                        (b.interpretation.quantity ? 1 : 0) + 
                        (b.interpretation.brand ? 1 : 0);
    
    return bSpecificity - aSpecificity;
  });
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

export function extractEquipmentRequests(text: string): ExplicitEquipmentRequest[] {
  const mentions = extractEquipmentMentions(text);
  return mentions.map(m => m.interpretation);
}

export function extractEquipmentByCategory(text: string, category: EquipmentCategory): ExplicitEquipmentRequest[] {
  const mentions = extractEquipmentMentions(text);
  return mentions
    .filter(m => m.interpretation.category === category)
    .map(m => m.interpretation);
}

export function formatEquipmentForDisplay(equipment: ExplicitEquipmentRequest): string {
  const parts: string[] = [];
  
  if (equipment.quantity) {
    if (equipment.quantity.kind === "exact") {
      parts.push(equipment.quantity.value.toString());
    } else if (equipment.quantity.kind === "range") {
      parts.push(`${equipment.quantity.min}-${equipment.quantity.max}`);
    } else if (equipment.quantity.kind === "approx") {
      parts.push(`~${equipment.quantity.value}`);
    }
  }
  
  if (equipment.brand) {
    parts.push(equipment.brand);
  }
  
  if (equipment.subcategory) {
    parts.push(equipment.subcategory);
  } else {
    // Nom de catégorie en français
    const categoryNames: Record<EquipmentCategory, string> = {
      'speakers': 'enceintes',
      'microphones': 'micros',
      'mixing': 'table de mixage',
      'lighting': 'éclairage',
      'screens': 'écran LED',
      'dj_equipment': 'platines DJ',
      'video': 'vidéoprojecteur',
      'rigging': 'structure',
      'power': 'alimentation',
      'accessories': 'accessoires'
    };
    parts.push(categoryNames[equipment.category] || equipment.category);
  }
  
  if (equipment.model) {
    parts.push(equipment.model);
  }
  
  if (equipment.qualifiers.length > 0) {
    parts.push(`(${equipment.qualifiers.join(', ')})`);
  }
  
  return parts.join(' ');
}