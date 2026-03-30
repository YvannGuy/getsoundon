import type {
  EquipmentCatalog,
  EquipmentCategoryId,
  EquipmentSubcategoryNode,
} from "./equipment.types";

const sono: Record<string, EquipmentSubcategoryNode> = {
  "enceinte-active": {
    id: "enceinte-active",
    label: "Enceinte active",
    brands: {
      Yamaha: ["DXR10", "DXR12", "DXR12 MKII", "DXR15", "DBR10", "DBR12", "DBR15", "DZR10", "DZR12", "DZR15"],
      JBL: ["EON712", "EON715", "PRX912", "PRX915", "IRX ONE", "EON One Compact"],
      RCF: ["ART 912-A", "ART 912-AX", "ART 915-A", "ART 932-A"],
      FBT: [],
      QSC: [],
      "Electro-Voice": [],
      Mackie: [],
      "HK Audio": [],
      "LD Systems": [],
      Alto: [],
    },
  },
  "enceinte-passive": {
    id: "enceinte-passive",
    label: "Enceinte passive",
    brands: {
      JBL: [],
      Yamaha: [],
      RCF: [],
      FBT: [],
      "Electro-Voice": [],
      "HK Audio": [],
      "dB Technologies": [],
      "Martin Audio": [],
    },
  },
  "caisson-basses": {
    id: "caisson-basses",
    label: "Caisson de basses",
    brands: {
      Yamaha: ["DXS12 MKII", "DXS15 MKII", "DXS18", "CXS18XLF"],
      JBL: ["PRX915XLF", "PRX918XLF"],
      RCF: ["SUB 705-AS MK3", "SUB 708-AS II", "SUB 8003-AS II"],
      FBT: [],
      QSC: [],
      "Electro-Voice": [],
      "HK Audio": [],
      "LD Systems": [],
    },
  },
  "console-mixage": {
    id: "console-mixage",
    label: "Console de mixage",
    brands: {
      Yamaha: ["MG10", "MG10XU", "MG12XU", "MG16XU", "TF1", "TF3", "TF5", "DM3"],
      "Allen & Heath": ["ZED-10", "ZED-12FX", "Qu-16", "Qu-24", "SQ-5", "SQ-6"],
      Soundcraft: ["Ui12", "Ui16", "Ui24R", "EPM6", "Signature 12", "Signature 16", "Signature 22 MTK"],
      Behringer: [],
      Midas: [],
      Mackie: [],
      Presonus: [],
    },
  },
  "retour-scene": {
    id: "retour-scene",
    label: "Retour de scène",
    brands: {
      Yamaha: [],
      JBL: [],
      RCF: [],
      "dB Technologies": [],
      "HK Audio": [],
      "Electro-Voice": [],
    },
  },
  "systeme-colonne": {
    id: "systeme-colonne",
    label: "Système colonne",
    brands: {
      Bose: [],
      "LD Systems": [],
      "HK Audio": [],
      JBL: [],
      FBT: [],
      Yamaha: [],
    },
  },
  amplificateur: {
    id: "amplificateur",
    label: "Amplificateur",
    brands: {
      Crown: [],
      QSC: [],
      Yamaha: [],
      "Lab Gruppen": [],
      "t.amp": [],
    },
  },
  "line-array": {
    id: "line-array",
    label: "Line array",
    brands: {
      RCF: [],
      JBL: [],
      "dB Technologies": [],
      "HK Audio": [],
      Yamaha: [],
      FBT: [],
    },
  },
  autre: {
    id: "autre",
    label: "Autre / à préciser dans la description",
    brands: {},
  },
};

const lumiere: Record<string, EquipmentSubcategoryNode> = {
  "lyre-spot": { id: "lyre-spot", label: "Lyre spot", brands: { Chauvet: [], ADJ: [], Cameo: [], Showtec: [] } },
  "lyre-beam": { id: "lyre-beam", label: "Lyre beam", brands: { Cameo: [], Chauvet: [], ADJ: [], Showtec: [] } },
  "lyre-wash": { id: "lyre-wash", label: "Lyre wash", brands: { Chauvet: [], Cameo: [], ADJ: [], Showtec: [] } },
  "barre-led": { id: "barre-led", label: "Barre LED", brands: { Cameo: [], Chauvet: [], ADJ: [], Showtec: [] } },
  "effet-led": { id: "effet-led", label: "Effet LED", brands: { Chauvet: [], ADJ: [], Cameo: [], "BoomTone DJ": [] } },
  stroboscope: { id: "stroboscope", label: "Stroboscope", brands: { Chauvet: [], ADJ: [], Cameo: [], Showtec: [] } },
  blinder: { id: "blinder", label: "Blinder", brands: { Chauvet: [], ADJ: [], Showtec: [], Cameo: [] } },
  "controle-dmx": { id: "controle-dmx", label: "Contrôle DMX", brands: { ADJ: [], Showtec: [], Cameo: [], Chauvet: [] } },
  "machine-fumee": { id: "machine-fumee", label: "Machine à fumée", brands: { ADJ: [], Showtec: [], Chauvet: [] } },
  hazer: { id: "hazer", label: "Hazer", brands: { ADJ: [], Chauvet: [], Showtec: [] } },
  uplight: { id: "uplight", label: "Uplight", brands: { Chauvet: [], Cameo: [], ADJ: [], Showtec: [] } },
  autre: { id: "autre", label: "Autre / à préciser dans la description", brands: {} },
};

const dj: Record<string, EquipmentSubcategoryNode> = {
  "controleur-dj": { id: "controleur-dj", label: "Contrôleur DJ", brands: { "Pioneer DJ": [], "Denon DJ": [], Numark: [], Rane: [], Hercules: [] } },
  "lecteur-media": { id: "lecteur-media", label: "Lecteur média", brands: { "Pioneer DJ": [], "Denon DJ": [], Numark: [] } },
  "table-mixage-dj": { id: "table-mixage-dj", label: "Console de mixage DJ", brands: { "Pioneer DJ": [], Rane: [], "Allen & Heath": [], Ecler: [], Numark: [] } },
  "platine-vinyle": { id: "platine-vinyle", label: "Platine vinyle", brands: { Technics: [], Reloop: [], AudioTechnica: [] } },
  "pack-dj-hardware": { id: "pack-dj-hardware", label: "Pack DJ matériel", brands: { "Pioneer DJ": [], "Denon DJ": [], Hercules: [] } },
  "accessoire-dj": { id: "accessoire-dj", label: "Accessoire DJ", brands: { Walkasse: [], UDG: [], Decksaver: [] } },
  autre: { id: "autre", label: "Autre / à préciser dans la description", brands: {} },
};

const micros: Record<string, EquipmentSubcategoryNode> = {
  "micro-filaire-main": { id: "micro-filaire-main", label: "Micro filaire main", brands: { Shure: [], Sennheiser: [], AKG: [], "Audio-Technica": [], Rode: [], Beyerdynamic: [], Audix: [] } },
  "micro-sans-fil-main": { id: "micro-sans-fil-main", label: "Micro sans fil main", brands: { Shure: [], Sennheiser: [], Mipro: [], AKG: [], "Audio-Technica": [], "BoomTone DJ": [] } },
  "micro-serre-tete": { id: "micro-serre-tete", label: "Micro serre-tête", brands: { Sennheiser: [], Mipro: [], Shure: [], AKG: [], DPA: [], "Audio-Technica": [] } },
  "micro-cravate": { id: "micro-cravate", label: "Micro cravate", brands: { Sennheiser: [], Shure: [], Rode: [], DPA: [], "Audio-Technica": [] } },
  "micro-instrument": { id: "micro-instrument", label: "Micro instrument", brands: { Shure: [], Sennheiser: [], AKG: [], Audix: [], Beyerdynamic: [] } },
  "micro-studio": { id: "micro-studio", label: "Micro studio", brands: { Rode: [], Neumann: [], AKG: [], "Audio-Technica": [], Shure: [] } },
  recepteur: { id: "recepteur", label: "Récepteur", brands: { Sennheiser: [], Shure: [], Mipro: [], AKG: [] } },
  emetteur: { id: "emetteur", label: "Émetteur", brands: { Sennheiser: [], Shure: [], Mipro: [], AKG: [] } },
  "kit-hf": { id: "kit-hf", label: "Kit micro HF", brands: { Sennheiser: [], Mipro: [], Shure: [], AKG: [], "BoomTone DJ": [] } },
  autre: { id: "autre", label: "Autre / à préciser dans la description", brands: {} },
};

const video: Record<string, EquipmentSubcategoryNode> = {
  "melangeur-video": { id: "melangeur-video", label: "Mélangeur vidéo", brands: { "Blackmagic Design": [], Roland: [], Panasonic: [] } },
  streaming: { id: "streaming", label: "Streaming", brands: { "Blackmagic Design": [], Roland: [], YoloLiv: [] } },
  camera: { id: "camera", label: "Caméra", brands: { Sony: [], Canon: [], Panasonic: [], JVC: [], Blackmagic: [] } },
  camescope: { id: "camescope", label: "Caméscope", brands: { Sony: [], Canon: [], Panasonic: [] } },
  projecteur: { id: "projecteur", label: "Projecteur", brands: { Epson: [], BenQ: [], Optoma: [], Panasonic: [] } },
  ecran: { id: "ecran", label: "Écran", brands: { Samsung: [], LG: [], Philips: [] } },
  moniteur: { id: "moniteur", label: "Moniteur", brands: { Blackmagic: [], Feelworld: [], Atomos: [], Sony: [] } },
  "convertisseur-video": { id: "convertisseur-video", label: "Convertisseur vidéo", brands: { "Blackmagic Design": [], Roland: [] } },
  "trepied-video": { id: "trepied-video", label: "Trépied vidéo", brands: { Manfrotto: [], Sachtler: [] } },
  autre: { id: "autre", label: "Autre / à préciser dans la description", brands: {} },
};

const accessoires: Record<string, EquipmentSubcategoryNode> = {
  "pied-enceinte": { id: "pied-enceinte", label: "Pied enceinte", brands: { "K&M": [], Gravity: [], "Adam Hall": [] } },
  "pied-micro": { id: "pied-micro", label: "Pied micro", brands: { "K&M": [], Gravity: [], "Adam Hall": [] } },
  "cable-xlr": { id: "cable-xlr", label: "Câble XLR", brands: { Cordial: [], "Adam Hall": [], Neutrik: [] } },
  "cable-jack": { id: "cable-jack", label: "Câble jack", brands: { Cordial: [], "Adam Hall": [], Neutrik: [] } },
  "cable-power": { id: "cable-power", label: "Câble power", brands: { Cordial: [], "Adam Hall": [] } },
  "flight-case": { id: "flight-case", label: "Flight case", brands: { "Adam Hall": [], "Thon": [] } },
  "boitier-di": { id: "boitier-di", label: "Boîtier DI", brands: { Radial: [], Palmer: [], Behringer: [] } },
  multipaire: { id: "multipaire", label: "Multipaire", brands: { Cordial: [], "Adam Hall": [], Proel: [] } },
  rallonge: { id: "rallonge", label: "Rallonge", brands: { Cordial: [], "Adam Hall": [] } },
  adaptateur: { id: "adaptateur", label: "Adaptateur", brands: { Neutrik: [], "Adam Hall": [] } },
  autre: { id: "autre", label: "Autre / à préciser dans la description", brands: {} },
};

export const EQUIPMENT_CATALOG: EquipmentCatalog = {
  sono: {
    id: "sono",
    label: "Sono",
    gearField: "son",
    subcategories: sono,
  },
  lumiere: {
    id: "lumiere",
    label: "Lumière",
    gearField: "lumiere",
    subcategories: lumiere,
  },
  dj: {
    id: "dj",
    label: "DJ",
    gearField: "dj",
    subcategories: dj,
  },
  video: {
    id: "video",
    label: "Vidéo",
    gearField: "video",
    subcategories: video,
  },
  micros: {
    id: "micros",
    label: "Microphones",
    gearField: "micros",
    subcategories: micros,
  },
  accessoires: {
    id: "accessoires",
    label: "Accessoires",
    gearField: "accessoires",
    subcategories: accessoires,
  },
};

export function getEquipmentCategory(id: EquipmentCategoryId) {
  return EQUIPMENT_CATALOG[id];
}

export function getAllEquipmentCategories() {
  return Object.values(EQUIPMENT_CATALOG);
}
