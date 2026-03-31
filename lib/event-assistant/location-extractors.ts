/**
 * Extractors robustes pour lieux, villes et types de venues en français
 */

import { LocationMention, LocationData, LocationPrecision, VenueContext, SpaceType } from "./nlp-types";

// ============================================================================
// DONNÉES GÉOGRAPHIQUES
// ============================================================================

const FRENCH_CITIES: Record<string, { region: string; department: string }> = {
  'paris': { region: 'île-de-france', department: 'paris' },
  'lyon': { region: 'auvergne-rhône-alpes', department: 'rhône' },
  'marseille': { region: 'provence-alpes-côte-d\'azur', department: 'bouches-du-rhône' },
  'toulouse': { region: 'occitanie', department: 'haute-garonne' },
  'nice': { region: 'provence-alpes-côte-d\'azur', department: 'alpes-maritimes' },
  'nantes': { region: 'pays de la loire', department: 'loire-atlantique' },
  'montpellier': { region: 'occitanie', department: 'hérault' },
  'strasbourg': { region: 'grand est', department: 'bas-rhin' },
  'bordeaux': { region: 'nouvelle-aquitaine', department: 'gironde' },
  'lille': { region: 'hauts-de-france', department: 'nord' },
  'rennes': { region: 'bretagne', department: 'ille-et-vilaine' },
  'reims': { region: 'grand est', department: 'marne' },
  'saint-étienne': { region: 'auvergne-rhône-alpes', department: 'loire' },
  'toulon': { region: 'provence-alpes-côte-d\'azur', department: 'var' },
  'grenoble': { region: 'auvergne-rhône-alpes', department: 'isère' }
};

const PARIS_DISTRICTS = [
  'paris 1', 'paris 2', 'paris 3', 'paris 4', 'paris 5', 'paris 6',
  'paris 7', 'paris 8', 'paris 9', 'paris 10', 'paris 11', 'paris 12',
  'paris 13', 'paris 14', 'paris 15', 'paris 16', 'paris 17', 'paris 18',
  'paris 19', 'paris 20'
];

const PARIS_SUBURBS = [
  'boulogne-billancourt', 'saint-denis', 'montreuil', 'créteil', 'nanterre',
  'courbevoie', 'versailles', 'rueil-malmaison', 'aubervilliers', 'champigny-sur-marne',
  'saint-maur-des-fossés', 'drancy', 'issy-les-moulineaux', 'levallois-perret',
  'neuilly-sur-seine', 'vitry-sur-seine', 'clichy', 'antony'
];

// ============================================================================
// TYPES DE VENUES ET CONTEXTES
// ============================================================================

const VENUE_PATTERNS: Record<VenueContext, {
  patterns: RegExp[];
  spaceType: SpaceType;
  confidence: number;
}> = {
  home: {
    patterns: [
      /\b(?:à\s+)?(?:domicile|maison|chez\s+moi|chez\s+nous|appartement|salon)\b/gi,
      /\b(?:dans\s+mon|notre)\s+(?:salon|appartement|maison)\b/gi
    ],
    spaceType: { type: "indoor", subtype: "intimate" },
    confidence: 0.9
  },
  
  hotel: {
    patterns: [
      /\b(?:hôtel|hotel)\b/gi,
      /\b(?:dans\s+un|à\s+l')\s*hôtel\b/gi,
      /\b(?:suite|chambre)\s+d'hôtel\b/gi
    ],
    spaceType: { type: "indoor", subtype: "standard" },
    confidence: 0.85
  },
  
  hall: {
    patterns: [
      /\b(?:salle\s+(?:des\s+fêtes|polyvalente|de\s+réception|municipale))\b/gi,
      /\b(?:centre\s+(?:culturel|social|associatif))\b/gi,
      /\b(?:maison\s+des\s+associations)\b/gi,
      /\b(?:palais\s+(?:des\s+congrès|omnisports))\b/gi
    ],
    spaceType: { type: "indoor", subtype: "large_hall" },
    confidence: 0.8
  },
  
  restaurant: {
    patterns: [
      /\b(?:restaurant|resto|brasserie|bistrot|café)\b/gi,
      /\b(?:dans\s+(?:un\s+)?(?:restaurant|resto))\b/gi,
      /\b(?:salle\s+(?:de\s+)?restaurant)\b/gi
    ],
    spaceType: { type: "indoor", subtype: "intimate" },
    confidence: 0.8
  },
  
  office: {
    patterns: [
      /\b(?:bureau|entreprise|société|boîte|siège|locaux)\b/gi,
      /\b(?:salle\s+de\s+(?:réunion|conférence))\b/gi,
      /\b(?:open\s+space|plateau|étage)\b/gi,
      /\b(?:dans\s+(?:nos\s+)?locaux)\b/gi
    ],
    spaceType: { type: "indoor", subtype: "standard" },
    confidence: 0.75
  },
  
  outdoor: {
    patterns: [
      /\b(?:jardin|parc|extérieur|dehors|plein\s+air)\b/gi,
      /\b(?:terrasse|cour|patio|balcon)\b/gi,
      /\b(?:en\s+(?:extérieur|plein\s+air))\b/gi
    ],
    spaceType: { type: "outdoor", subtype: "open_air" },
    confidence: 0.85
  },
  
  religious: {
    patterns: [
      /\b(?:église|cathédrale|chapelle|temple|synagogue|mosquée)\b/gi,
      /\b(?:lieu\s+de\s+culte|édifice\s+religieux)\b/gi
    ],
    spaceType: { type: "indoor", subtype: "large_hall" },
    confidence: 0.9
  },
  
  cultural: {
    patterns: [
      /\b(?:théâtre|opéra|salle\s+de\s+spectacle|auditorium)\b/gi,
      /\b(?:musée|galerie|centre\s+d'art)\b/gi,
      /\b(?:conservatoire|école\s+de\s+musique)\b/gi
    ],
    spaceType: { type: "indoor", subtype: "large_hall" },
    confidence: 0.85
  },
  
  sports: {
    patterns: [
      /\b(?:gymnase|salle\s+de\s+sport|stade|complexe\s+sportif)\b/gi,
      /\b(?:terrain\s+(?:de\s+)?(?:foot|tennis|basket))\b/gi,
      /\b(?:club\s+(?:house|de\s+sport))\b/gi
    ],
    spaceType: { type: "indoor", subtype: "large_hall" },
    confidence: 0.8
  },
  
  rooftop: {
    patterns: [
      /\b(?:rooftop|toit|terrasse\s+(?:sur\s+le\s+)?toit)\b/gi,
      /\b(?:vue\s+panoramique|en\s+hauteur)\b/gi
    ],
    spaceType: { type: "outdoor", subtype: "open_air" },
    confidence: 0.9
  },
  
  garden: {
    patterns: [
      /\b(?:jardin|parc|verger|potager)\b/gi,
      /\b(?:espace\s+vert|pelouse|prairie)\b/gi,
      /\b(?:sous\s+les\s+arbres|en\s+pleine\s+nature)\b/gi
    ],
    spaceType: { type: "outdoor", subtype: "open_air" },
    confidence: 0.85
  },
  
  other: {
    patterns: [
      /\b(?:lieu\s+(?:atypique|original|insolite))\b/gi,
      /\b(?:endroit\s+(?:spécial|particulier))\b/gi
    ],
    spaceType: { type: "indoor", subtype: "standard" },
    confidence: 0.5
  }
};

const COVERED_OUTDOOR_PATTERNS = [
  /\b(?:sous\s+(?:barnum|tente|chapiteau|préau))\b/gi,
  /\b(?:terrasse\s+couverte|pergola|véranda)\b/gi,
  /\b(?:extérieur\s+couvert|dehors\s+mais\s+couvert)\b/gi,
  /\b(?:préau|kiosque|pavillon)\b/gi
];

// ============================================================================
// EXTRACTORS PRINCIPAUX
// ============================================================================

export function extractLocationMentions(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  // 1. Villes françaises
  mentions.push(...extractCities(text));
  
  // 2. Arrondissements de Paris
  mentions.push(...extractParisDistricts(text));
  
  // 3. Banlieue parisienne
  mentions.push(...extractParisSuburbs(text));
  
  // 4. Types de venues
  mentions.push(...extractVenueTypes(text));
  
  // 5. Lieux spécifiques avec adresses
  mentions.push(...extractSpecificLocations(text));
  
  // 6. Expressions géographiques
  mentions.push(...extractGeographicExpressions(text));
  
  return deduplicateAndSortLocations(mentions);
}

function extractCities(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  for (const [cityName, { region, department }] of Object.entries(FRENCH_CITIES)) {
    const patterns = [
      new RegExp(`\\b(?:à|sur|dans|vers)\\s+${cityName}\\b`, 'gi'),
      new RegExp(`\\b${cityName}\\b`, 'gi')
    ];
    
    for (const [index, pattern] of patterns.entries()) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mentions.push({
          rawText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          interpretation: {
            city: cityName,
            region,
            precision: "city"
          },
          confidence: index === 0 ? 0.9 : 0.7 // Plus de confiance avec préposition
        });
      }
    }
  }
  
  return mentions;
}

function extractParisDistricts(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  // Pattern pour "Paris 11", "11e arrondissement", etc.
  const districtPatterns = [
    /\bparis\s+(\d{1,2})\b/gi,
    /\b(\d{1,2})e\s+arrondissement\b/gi,
    /\b(\d{1,2})ème\s+arrondissement\b/gi,
    /\b(\d{1,2})e\b(?=\s|$)/gi
  ];
  
  for (const pattern of districtPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const districtNumber = parseInt(match[1]);
      
      if (districtNumber >= 1 && districtNumber <= 20) {
        mentions.push({
          rawText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          interpretation: {
            city: 'paris',
            district: `${districtNumber}e arrondissement`,
            region: 'île-de-france',
            precision: "district"
          },
          confidence: 0.85
        });
      }
    }
  }
  
  return mentions;
}

function extractParisSuburbs(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  for (const suburb of PARIS_SUBURBS) {
    const patterns = [
      new RegExp(`\\b(?:à|sur|dans)\\s+${suburb}\\b`, 'gi'),
      new RegExp(`\\b${suburb}\\b`, 'gi')
    ];
    
    for (const [index, pattern] of patterns.entries()) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mentions.push({
          rawText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          interpretation: {
            city: suburb,
            region: 'île-de-france',
            precision: "city"
          },
          confidence: index === 0 ? 0.8 : 0.6
        });
      }
    }
  }
  
  return mentions;
}

function extractVenueTypes(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  for (const [venueType, { patterns, spaceType, confidence }] of Object.entries(VENUE_PATTERNS)) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        mentions.push({
          rawText: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          interpretation: {
            venueType: venueType as VenueContext,
            precision: "venue"
          },
          confidence
        });
      }
    }
  }
  
  return mentions;
}

function extractSpecificLocations(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  // Pattern pour adresses complètes
  const addressPattern = /\b(\d+[a-z]?(?:\s+(?:bis|ter))?)\s+(?:rue|avenue|boulevard|place|quai|cours|allée)\s+([a-zA-ZÀ-ÿ\s\-']+?)(?:\s*,|\s+(?:à|dans|sur)\s+([a-zA-ZÀ-ÿ\-]+))?/gi;
  let match;
  
  while ((match = addressPattern.exec(text)) !== null) {
    const streetNumber = match[1];
    const streetName = match[2].trim();
    const cityName = match[3]?.trim();
    
    mentions.push({
      rawText: match[0],
      position: { start: match.index, end: match.index + match[0].length },
      interpretation: {
        venue: `${streetNumber} ${streetName}`,
        city: cityName,
        precision: "venue"
      },
      confidence: cityName ? 0.9 : 0.7
    });
  }
  
  // Pattern pour lieux nommés
  const namedLocationPattern = /\b(?:au|à\s+(?:la|le|l'))\s+([A-ZÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜ][a-zA-ZÀ-ÿ\s\-']{2,30})\b/g;
  
  while ((match = namedLocationPattern.exec(text)) !== null) {
    const locationName = match[1].trim();
    
    // Éviter les faux positifs comme "à la maison"
    if (!locationName.match(/^(?:maison|fois|main|place|fin|suite)$/i)) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: {
          venue: locationName,
          precision: "venue"
        },
        confidence: 0.6
      });
    }
  }
  
  return mentions;
}

function extractGeographicExpressions(text: string): LocationMention[] {
  const mentions: LocationMention[] = [];
  
  const geographicExpressions: Record<string, LocationData> = {
    'région parisienne': { 
      region: 'île-de-france', 
      precision: "region" 
    },
    'proche de paris': { 
      city: 'paris', 
      region: 'île-de-france', 
      precision: "region" 
    },
    'banlieue parisienne': { 
      city: 'paris', 
      region: 'île-de-france', 
      precision: "region" 
    },
    'petite couronne': { 
      region: 'île-de-france', 
      precision: "region" 
    },
    'grande couronne': { 
      region: 'île-de-france', 
      precision: "region" 
    }
  };
  
  for (const [expression, locationData] of Object.entries(geographicExpressions)) {
    const pattern = new RegExp(`\\b${expression}\\b`, 'gi');
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        rawText: match[0],
        position: { start: match.index, end: match.index + match[0].length },
        interpretation: locationData,
        confidence: 0.7
      });
    }
  }
  
  return mentions;
}

// ============================================================================
// ANALYSE ESPACE INTÉRIEUR/EXTÉRIEUR
// ============================================================================

export function extractSpaceTypeFromText(text: string): SpaceType | null {
  // Vérifier d'abord si c'est "extérieur couvert"
  for (const pattern of COVERED_OUTDOOR_PATTERNS) {
    if (pattern.test(text)) {
      return { type: "outdoor", subtype: "covered" };
    }
  }
  
  // Ensuite vérifier les types de venue
  for (const [venueType, { patterns, spaceType }] of Object.entries(VENUE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return spaceType;
      }
    }
  }
  
  // Patterns génériques pour indoor/outdoor
  if (/\b(?:intérieur|dedans|salle|maison|appartement|bureau)\b/gi.test(text)) {
    return { type: "indoor", subtype: "standard" };
  }
  
  if (/\b(?:extérieur|dehors|plein\s+air|jardin|parc|terrasse)\b/gi.test(text)) {
    return { type: "outdoor", subtype: "open_air" };
  }
  
  return null;
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function deduplicateAndSortLocations(mentions: LocationMention[]): LocationMention[] {
  // Supprimer les doublons par position
  const unique = mentions.filter((mention, index) => {
    return mentions.findIndex(other => 
      Math.abs(other.position.start - mention.position.start) < 15
    ) === index;
  });
  
  // Trier par confiance décroissante puis par précision (ville > venue > région)
  return unique.sort((a, b) => {
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence;
    }
    
    const precisionOrder = { city: 3, district: 2, venue: 1, region: 0 };
    return precisionOrder[b.interpretation.precision] - precisionOrder[a.interpretation.precision];
  });
}

// ============================================================================
// API PUBLIQUE
// ============================================================================

export function extractBestLocationValue(text: string): LocationData | null {
  const mentions = extractLocationMentions(text);
  return mentions.length > 0 ? mentions[0].interpretation : null;
}

export function extractAllLocationValues(text: string): LocationData[] {
  const mentions = extractLocationMentions(text);
  return mentions.map(m => m.interpretation);
}

export function formatLocationForDisplay(location: LocationData): string {
  const parts = [];
  
  if (location.venue) {
    parts.push(location.venue);
  }
  
  if (location.district) {
    parts.push(location.district);
  } else if (location.city) {
    parts.push(location.city);
  }
  
  if (location.region && !location.city?.includes('paris')) {
    parts.push(location.region);
  }
  
  return parts.join(', ');
}

export function isLocationInParis(location: LocationData): boolean {
  return !!(location.city?.toLowerCase().includes('paris') || 
           location.district?.includes('arrondissement') ||
           (location.region === 'île-de-france' && PARIS_SUBURBS.includes(location.city?.toLowerCase() || '')));
}