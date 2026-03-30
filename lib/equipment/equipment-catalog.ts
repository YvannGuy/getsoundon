import type { EquipmentBrand, EquipmentCategory, EquipmentCategoryId, EquipmentSubcategory } from "./equipment.types";

const autre = (id = "autre"): EquipmentSubcategory => ({
  id,
  label: "Autre / à préciser dans la description",
});

function b(
  id: string,
  label: string,
  popular: boolean | undefined,
  models: { id: string; label: string; popular?: boolean }[]
): EquipmentBrand {
  return { id, label, popular, models };
}

/** Sous-catégories métier (obligatoire : l’utilisateur doit qualifier l’annonce). */
const SUB: Record<EquipmentCategoryId, EquipmentSubcategory[]> = {
  sono: [
    { id: "enceinte-active", label: "Enceinte active" },
    { id: "enceinte-passive", label: "Enceinte passive" },
    { id: "caisson-basses", label: "Caisson de basses" },
    { id: "table-mixage", label: "Console de mixage" },
    { id: "retour-scene", label: "Retour de scène" },
    { id: "systeme-colonne", label: "Système colonne" },
    { id: "amplificateur", label: "Amplificateur" },
    { id: "pack-son", label: "Pack son" },
    autre(),
  ],
  lumiere: [
    { id: "par-led", label: "PAR LED" },
    { id: "barre-led", label: "Barre LED" },
    { id: "lyre", label: "Lyre" },
    { id: "wash", label: "Wash" },
    { id: "spot", label: "Spot" },
    { id: "beam", label: "Beam" },
    { id: "stroboscope", label: "Stroboscope" },
    { id: "blinder", label: "Blinder" },
    { id: "console-lumiere", label: "Console lumière" },
    { id: "controleur-dmx", label: "Contrôleur DMX" },
    { id: "machine-fumee", label: "Machine à fumée" },
    { id: "hazer", label: "Hazer" },
    { id: "uplight", label: "Uplight" },
    autre(),
  ],
  dj: [
    { id: "platine-cdj", label: "Platine CDJ" },
    { id: "controleur-dj", label: "Contrôleur DJ" },
    { id: "table-mixage-dj", label: "Console de mixage DJ" },
    { id: "platine-vinyle", label: "Platine vinyle" },
    { id: "lecteur-multimedia", label: "Lecteur multimédia" },
    { id: "pack-dj", label: "Pack DJ" },
    autre(),
  ],
  video: [
    { id: "camera", label: "Caméra" },
    { id: "camescope", label: "Caméscope" },
    { id: "melangeur-video", label: "Mélangeur vidéo" },
    { id: "convertisseur-video", label: "Convertisseur vidéo" },
    { id: "projecteur", label: "Projecteur" },
    { id: "ecran", label: "Écran" },
    { id: "moniteur", label: "Moniteur" },
    { id: "ecran-led", label: "Écran LED" },
    { id: "trepied-video", label: "Trépied vidéo" },
    { id: "accessoire-video", label: "Accessoire vidéo" },
    autre(),
  ],
  micros: [
    { id: "micro-filaire-main", label: "Micro filaire main" },
    { id: "micro-sans-fil-main", label: "Micro sans fil main" },
    { id: "micro-cravate", label: "Micro cravate" },
    { id: "micro-casque", label: "Micro casque" },
    { id: "micro-instrument", label: "Micro instrument" },
    { id: "micro-conference", label: "Micro conférence" },
    { id: "recepteur", label: "Récepteur" },
    { id: "emetteur", label: "Émetteur" },
    { id: "kit-micro-hf", label: "Kit micro HF" },
    autre(),
  ],
  accessoires: [
    { id: "pied-enceinte", label: "Pied enceinte" },
    { id: "pied-micro", label: "Pied micro" },
    { id: "cable-xlr", label: "Câble XLR" },
    { id: "cable-jack", label: "Câble jack" },
    { id: "cable-power", label: "Câble power" },
    { id: "flight-case", label: "Flight case" },
    { id: "boitier-di", label: "Boîtier DI" },
    { id: "multipaire", label: "Multipaire" },
    { id: "rallonge", label: "Rallonge" },
    { id: "adaptateur", label: "Adaptateur" },
    autre(),
  ],
};

const BRANDS: Record<EquipmentCategoryId, EquipmentBrand[]> = {
  sono: [
    b("jbl", "JBL", true, [
      { id: "eon715", label: "EON 715", popular: true },
      { id: "prx815", label: "PRX 815" },
      { id: "srx835", label: "SRX 835" },
    ]),
    b("yamaha", "Yamaha", true, [
      { id: "dxr12", label: "DXR12" },
      { id: "dxs15", label: "DXS15" },
    ]),
    b("bose", "Bose", true, [
      { id: "l1pro32", label: "L1 Pro32" },
      { id: "f1model812", label: "F1 Model 812" },
    ]),
    b("rcf", "RCF", true, [
      { id: "art912", label: "ART 912-A" },
      { id: "sub705", label: "SUB 705-AS II" },
    ]),
    b("fbt", "FBT", false, [
      { id: "xlite115a", label: "X-Lite 115A", popular: true },
      { id: "promaxx114", label: "ProMaxx 114" },
    ]),
    b("qsc", "QSC", false, [
      { id: "k122", label: "K12.2" },
      { id: "ks118", label: "KS118" },
    ]),
    b("electro-voice", "Electro-Voice", false, [{ id: "zlx12p", label: "ZLX-12P" }]),
    b("mackie", "Mackie", false, [{ id: "thump12a", label: "Thump 12A" }]),
    b("hk-audio", "HK Audio", false, [{ id: "polar10", label: "Polar 10" }]),
    b("ld-systems", "LD Systems", false, [{ id: "dave12g3", label: "DAVE 12 G3" }]),
  ],
  lumiere: [
    b("chauvet", "Chauvet", true, [
      { id: "intimidator", label: "Intimidator Spot" },
      { id: "gigbar", label: "GigBAR Move" },
    ]),
    b("martin", "Martin", true, [{ id: "mac-aura", label: "MAC Aura" }]),
    b("cameo", "Cameo", true, [{ id: "root-par", label: "Root Par" }]),
    b("adj", "ADJ", false, [{ id: "vpar", label: "VPar HEX" }]),
    b("showtec", "Showtec", false, [{ id: "kanjo-spot", label: "Kanjo Spot" }]),
    b("robe", "Robe", false, [{ id: "spiider", label: "Spiider" }]),
    b("ayrton", "Ayrton", false, [{ id: "cobra", label: "Cobra" }]),
    b("clay-paky", "Clay Paky", false, [{ id: "sharpy", label: "Sharpy" }]),
  ],
  dj: [
    b("pioneer-dj", "Pioneer DJ", true, [
      { id: "cdj-3000", label: "CDJ-3000", popular: true },
      { id: "djm-a9", label: "DJM-A9" },
      { id: "xdj-rr", label: "XDJ-RR", popular: true },
    ]),
    b("denon-dj", "Denon DJ", true, [{ id: "sc6000", label: "SC6000" }]),
    b("numark", "Numark", false, [{ id: "mixtrackprofx", label: "Mixtrack Pro FX" }]),
    b("rane", "Rane", false, [{ id: "seventytwo", label: "Seventy-Two" }]),
    b("technics", "Technics", true, [{ id: "sl1200mk7", label: "SL-1200 MK7" }]),
    b("allen-heath", "Allen & Heath", false, [{ id: "xone-96", label: "Xone:96" }]),
  ],
  video: [
    b("sony", "Sony", true, [{ id: "fx3", label: "FX3" }, { id: "a7iv", label: "A7 IV" }]),
    b("canon", "Canon", true, [{ id: "eos-r6", label: "EOS R6" }]),
    b("panasonic", "Panasonic", false, [{ id: "gh6", label: "GH6" }]),
    b("blackmagic", "Blackmagic Design", true, [
      { id: "atem-mini", label: "ATEM Mini Pro" },
      { id: "pocket-6k", label: "Pocket 6K" },
    ]),
    b("epson", "Epson", true, [{ id: "eb-x49", label: "EB-X49", popular: true }]),
    b("benq", "BenQ", false, [{ id: "th671st", label: "TH671ST" }]),
    b("optoma", "Optoma", false, [{ id: "zh406", label: "ZH406" }]),
    b("samsung", "Samsung", false, [{ id: "frame-55", label: "The Frame 55\"" }]),
    b("lg", "LG", false, [{ id: "c3-55", label: "C3 55\"" }]),
  ],
  micros: [
    b("shure", "Shure", true, [
      { id: "sm58", label: "SM58", popular: true },
      { id: "sm7b", label: "SM7B" },
      { id: "beta58a", label: "Beta 58A" },
    ]),
    b("sennheiser", "Sennheiser", true, [
      { id: "ew100g4", label: "EW 100 G4" },
      { id: "e835", label: "e 835" },
    ]),
    b("audio-technica", "Audio-Technica", false, [{ id: "at2020", label: "AT2020" }]),
    b("rode", "Rode", false, [{ id: "wirelessgoii", label: "Wireless GO II" }]),
    b("akg", "AKG", false, [{ id: "c414", label: "C414" }]),
    b("dpa", "DPA", false, [{ id: "4060", label: "4060" }]),
    b("beyerdynamic", "Beyerdynamic", false, [{ id: "m88", label: "M 88" }]),
  ],
  accessoires: [
    b("km", "K&M", true, [{ id: "21411", label: "21411 pied enceinte" }]),
    b("gravity", "Gravity", true, [{ id: "ss5211", label: "SS 5211 B" }]),
    b("adam-hall", "Adam Hall", false, [{ id: "ahkable", label: "Câbles / flight" }]),
    b("neutrik", "Neutrik", false, [{ id: "xxlr", label: "Connecteurs XLR" }]),
    b("cordial", "Cordial", false, [{ id: "cpl10", label: "CPL 10 FM" }]),
  ],
};

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = (
  [
    { id: "sono", label: "Sono", gearField: "son" },
    { id: "lumiere", label: "Lumière", gearField: "lumiere" },
    { id: "dj", label: "DJ", gearField: "dj" },
    { id: "video", label: "Vidéo", gearField: "video" },
    { id: "micros", label: "Microphones", gearField: "micros" },
    { id: "accessoires", label: "Accessoires", gearField: "accessoires" },
  ] as const
).map((c) => ({
  ...c,
  subcategories: SUB[c.id],
  brands: BRANDS[c.id],
}));

const byId = new Map(EQUIPMENT_CATEGORIES.map((c) => [c.id, c]));

export function getEquipmentCategory(id: EquipmentCategoryId): EquipmentCategory | undefined {
  return byId.get(id);
}

export function getAllEquipmentCategories(): EquipmentCategory[] {
  return EQUIPMENT_CATEGORIES;
}
