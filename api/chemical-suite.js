import { getAdminFirestore } from "./firebaseAdmin.js";
import { getOrSeedEngineeringCatalog } from "./database.js";

/**
 * Master Industrial HAZMAT Chemical Catalog
 * Reference: NFPA 491M, OSHA 1910.120, NIOSH Pocket Guide, API 581
 */
export const INITIAL_CHEMICAL_DATABASE = [
  {
    id: "hf",
    name: "Hydrofluoric Acid (HF)",
    formula: "HF",
    cas: "7664-39-3",
    un: "UN 1790 (liquid) / UN 1052 (anhydrous)",
    category: "Acids",
    molWeight: 20.01,
    density: "1.15 g/cm³ (48%), 0.97 g/cm³ (anhydrous)",
    boilingPt: "19.5 °C (67.1 °F) / 106 °C (48%)",
    freezingPt: "-83.6 °C",
    vaporPressure: "100 kPa @ 20°C (fuming liquid/gas)",
    flashPoint: "Non-flammable",
    autoignition: "N/A",
    nature: "Extremely toxic, corrosive weak acid that penetrates deep tissue",
    ph: "< 1.0 (highly acidic)",
    nfpa: { health: 4, flammability: 0, instability: 1, special: "COR, POI" },
    ghs: ["Corrosion", "Skull and Crossbones", "Health Hazard"],
    ghsStatements: "Fatal if swallowed, in contact with skin or inhaled. Causes severe skin burns and serious eye damage. Damages bones and nerves via systemic hypocalcemia.",
    exposure: { pel: "3 ppm (as F) TWA", tlv: "0.5 ppm TWA / 2 ppm Ceiling", idlh: "30 ppm" },
    suitRecommendations: {
      tankEntry: "Level A (Totally Encapsulated Gas-Tight Suit + Positive Pressure SCBA)",
      lineBreak: "Level A or Level B (Tychem TK/Responder + SCBA with shroud)",
      sampling: "Level C (Tychem F / Responder apron, full-face APR with HF cartridge, heavy Neoprene gloves)",
      spillResponse: "Level A (Full gas-tight HAZMAT suit)"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Teflon / PTFE", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Silver Shield / 4H", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Neoprene (Heavy 30 mil)", breakthrough: "240 - 360 min", rating: "Good" },
      { material: "Nitrile Rubber", breakthrough: "< 15 min", rating: "Poor (Do NOT Use)" },
      { material: "Viton", breakthrough: "< 30 min", rating: "Poor (Do NOT Use)" }
    ],
    ppe: {
      respirator: "Positive Pressure SCBA (IDLH / high conc) or Full-face APR with Multi-gas/HF/P100 filter",
      gloves: "Heavy Butyl Rubber or Neoprene outer gloves + Silver Shield inner liner",
      boots: "Heavy Butyl or Neoprene steel-toe HAZMAT chemical boots",
      body: "Tychem TK, Tychem Responder, or Trellchem encapsulated suit"
    },
    materialsAvoid: "Glass, concrete, ceramics, cast iron, titanium (reacts violently). Use Monel 400, Alloy 20, Hastelloy C-276, Teflon, or PVDF.",
    firstAid: "🚨 CRITICAL: Immediate drench wash for 1-2 min, followed by continuous massage of 2.5% CALCIUM GLUCONATE GEL into affected skin until pain stops. For eye splash, irrigate with 1% Calcium Gluconate solution. Immediate hospital transport — HF depletes blood calcium causing fatal cardiac arrhythmias!"
  },
  {
    id: "h2so4",
    name: "Sulfuric Acid (H2SO4 - 98%)",
    formula: "H₂SO₄",
    cas: "7664-93-9",
    un: "UN 1830",
    category: "Acids",
    molWeight: 98.08,
    density: "1.84 g/cm³ (concentrated 98%)",
    boilingPt: "337 °C (639 °F)",
    freezingPt: "10.3 °C (98%)",
    vaporPressure: "< 0.001 kPa @ 20°C",
    flashPoint: "Non-flammable",
    autoignition: "N/A",
    nature: "Extremely corrosive, dense oily liquid with strong oxidizing & dehydrating power",
    ph: "< 0.3",
    nfpa: { health: 3, flammability: 0, instability: 2, special: "W" },
    ghs: ["Corrosion"],
    ghsStatements: "Causes severe skin burns and eye damage. Rapidly dehydrates organic matter with immense exothermic heat.",
    exposure: { pel: "1 mg/m³ TWA", tlv: "0.2 mg/m³ (thoracic particulate)", idlh: "15 mg/m³" },
    suitRecommendations: {
      tankEntry: "Level B (Liquid Splash Tight Encapsulated Suit + SCBA)",
      lineBreak: "Level B or Heavy Chemical Splash Suit with Hood + Face Shield + SCBA",
      sampling: "Level C (PVC/Neoprene acid suit or apron, face shield, heavy butyl gloves)",
      spillResponse: "Level B (Heavy chemical splash suit, resist high dehydration)"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Teflon / PTFE", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Viton", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Neoprene", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Nitrile Rubber", breakthrough: "120 - 240 min", rating: "Good (Thick only)" },
      { material: "Natural Rubber", breakthrough: "< 30 min", rating: "Poor" }
    ],
    ppe: {
      respirator: "Full-face APR with Acid Gas / P100 cartridge; SCBA for high mist/confined space",
      gloves: "Heavy Butyl Rubber, Neoprene, or Viton (minimum 20 mil)",
      boots: "Heavy PVC/Neoprene chemical boots with steel toe/shank",
      body: "Acid-resistant PVC, Neoprene, or Tychem splash suit"
    },
    materialsAvoid: "Dilute acid aggressively attacks Carbon Steel! Concentrated (>93%) forms protective FeSO4 on CS at <40°C, but dilute requires Alloy 20, Hastelloy C-276, or lead-lined.",
    firstAid: "Flush skin immediately with copious flowing water for minimum 20 minutes. Note: Water on pure acid generates heat, so use a HIGH-VOLUME deluge shower instantly to overwhelm and quench heat."
  },
  {
    id: "naoh",
    name: "Sodium Hydroxide (Caustic Soda 50%)",
    formula: "NaOH",
    cas: "1310-73-2",
    un: "UN 1824",
    category: "Bases & Amines",
    molWeight: 40.0,
    density: "1.52 g/cm³ (50% liquid)",
    boilingPt: "142 °C (288 °F) (50%)",
    freezingPt: "12 °C (50%)",
    vaporPressure: "< 0.1 kPa @ 20°C",
    flashPoint: "Non-flammable",
    autoignition: "N/A",
    nature: "Strong base, rapidly saponifies fats and skin proteins causing deep liquefactive necrosis",
    ph: "14.0 (strongly basic)",
    nfpa: { health: 3, flammability: 0, instability: 1, special: "ALK" },
    ghs: ["Corrosion"],
    ghsStatements: "Causes severe skin burns and serious eye damage. May cause blindness instantaneously on eye contact.",
    exposure: { pel: "2 mg/m³ Ceiling", tlv: "2 mg/m³ Ceiling", idlh: "10 mg/m³" },
    suitRecommendations: {
      tankEntry: "Level B (Liquid splash tight suit with SCBA)",
      lineBreak: "Level C with splash hood, face shield, and Neoprene/Nitrile apron",
      sampling: "Level C with chemical splash goggles, face shield, heavy nitrile gloves",
      spillResponse: "Level B or C depending on aerosol mist"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Neoprene", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Nitrile Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "PVC", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Natural Rubber", breakthrough: "> 480 min", rating: "Excellent" }
    ],
    ppe: {
      respirator: "Half/Full-face APR with P100 particulate filter if mist present; SCBA for vessel entry",
      gloves: "Neoprene, Nitrile, or PVC heavy chemical gloves",
      boots: "Rubber or PVC steel-toe chemical boots",
      body: "Neoprene or PVC chemical splash suit / apron"
    },
    materialsAvoid: "Aluminum, Zinc, Tin, Galvanized Steel (generates explosive Hydrogen gas!). Causes Caustic Environmental Cracking (SCC) in CS above 50°C — requires Stress Relieved CS or Nickel 200.",
    firstAid: "Irrigate eyes and skin immediately with continuous flowing water for at least 30 minutes. Do NOT neutralize with acid in eyes or on skin!"
  },
  {
    id: "cl2",
    name: "Chlorine Gas / Liquid",
    formula: "Cl₂",
    cas: "7782-50-5",
    un: "UN 1017",
    category: "Gases & Halogens",
    molWeight: 70.9,
    density: "3.21 g/L (gas, 2.5x heavier than air)",
    boilingPt: "-34.04 °C (-29.27 °F)",
    freezingPt: "-101.5 °C",
    vaporPressure: "678 kPa @ 20°C",
    flashPoint: "Non-flammable (Strong Oxidizer)",
    autoignition: "N/A",
    nature: "Toxic green-yellow gas/liquefied gas under pressure. Destroys lung tissue forming HCl in moisture",
    ph: "Formic acid / HCl in water",
    nfpa: { health: 4, flammability: 0, instability: 0, special: "OX" },
    ghs: ["Compressed Gas", "Skull and Crossbones", "Corrosion", "Environment"],
    ghsStatements: "Fatal if inhaled. Causes severe skin burns and eye damage. Strong oxidizer; may ignite combustibles.",
    exposure: { pel: "1 ppm Ceiling", tlv: "0.1 ppm TWA / 0.4 ppm STEL", idlh: "10 ppm" },
    suitRecommendations: {
      tankEntry: "Level A (Totally Encapsulated Gas-Tight Suit + Positive Pressure SCBA)",
      lineBreak: "Level A (Level A suit + SCBA required for any potential gas release)",
      sampling: "Level B with SCBA or Level C with Chlorine APR cartridge (only if < 10 ppm)",
      spillResponse: "Level A (Gas-tight HAZMAT suit)"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Silver Shield / 4H", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Viton", breakthrough: "> 360 min", rating: "Good" },
      { material: "Neoprene", breakthrough: "< 30 min", rating: "Poor" }
    ],
    ppe: {
      respirator: "Positive Pressure SCBA (mandatory for IDLH / >10 ppm); APR with Chlorine canister (<10 ppm)",
      gloves: "Butyl Rubber, Viton, or Silver Shield gloves",
      boots: "Heavy Butyl or Rubber HAZMAT safety boots",
      body: "Level A encapsulated gas-tight suit"
    },
    materialsAvoid: "Titanium (ignites dry chlorine gas!), Ammonia, Hydrocarbons, Organic solvents. Dry Chlorine (<150 ppm H2O) is handled in CS up to 120°C, but wet Chlorine requires Titanium or Hastelloy C-276.",
    firstAid: "Move victim to fresh air immediately. Administer 100% humidified oxygen. Keep warm and quiet. Watch for delayed pulmonary edema (up to 24 hours)."
  },
  {
    id: "h2s",
    name: "Hydrogen Sulfide (H2S - Sour Gas)",
    formula: "H₂S",
    cas: "7783-06-4",
    un: "UN 1053",
    category: "Gases & Halogens",
    molWeight: 34.08,
    density: "1.42 g/L (heavier than air, accumulates in low spots)",
    boilingPt: "-60 °C (-76 °F)",
    freezingPt: "-82 °C",
    vaporPressure: "1870 kPa @ 20°C",
    flashPoint: "Flammable Gas",
    autoignition: "260 °C (500 °F)",
    nature: "Extremely toxic, flammable gas. Deadens olfactory nerve instantly at >100 ppm!",
    ph: "Slightly acidic in water",
    nfpa: { health: 4, flammability: 4, instability: 0, special: "POI" },
    ghs: ["Flammable Gas", "Skull and Crossbones", "Environment"],
    ghsStatements: "Extremely flammable gas. Fatal if inhaled. Rapidly paralyzes breathing center at high concentrations (>500 ppm).",
    exposure: { pel: "20 ppm Ceiling / 50 ppm Peak", tlv: "1 ppm TWA / 5 ppm STEL", idlh: "100 ppm" },
    suitRecommendations: {
      tankEntry: "Level A or Level B (SCBA + Fire-Resistant Gas Suit)",
      lineBreak: "Level B (SCBA + FR coveralls + H2S personal monitor)",
      sampling: "Level B or Level C with SCBA / airline (+ H2S continuous monitor)",
      spillResponse: "Level A or B with SCBA and non-sparking explosion-proof tools"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Viton", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Neoprene", breakthrough: "> 240 min", rating: "Good" }
    ],
    ppe: {
      respirator: "Positive Pressure SCBA or Supplied-Air Line Respirator with escape bottle (Mandatory for >10 ppm)",
      gloves: "Heavy Butyl Rubber or Viton gloves + Nomex outer for flame protection",
      boots: "Chemical & Oil resistant steel-toe boots",
      body: "Fire-Resistant (FR) Nomex/Kevlar coveralls + Level B/A chemical suit if liquid/sour water"
    },
    materialsAvoid: "Oxidizers, Strong Nitric Acid. Causes Sulfide Stress Cracking (SSC) in hard steels (>22 HRC) — NACE MR0175 / ISO 15156 compliance mandatory for CS.",
    firstAid: "🚨 CRITICAL: Rescuers MUST wear SCBA! Move victim to fresh air instantly. Apply CPR/AED if not breathing. Administer oxygen. Transport immediately."
  },
  {
    id: "nh3",
    name: "Ammonia (Anhydrous / Aqua Ammonia)",
    formula: "NH₃",
    cas: "7664-41-7",
    un: "UN 1005 (anhydrous) / UN 2672 (aqua)",
    category: "Bases & Amines",
    molWeight: 17.03,
    density: "0.73 g/L (gas, lighter than air)",
    boilingPt: "-33.34 °C (-28.01 °F)",
    freezingPt: "-77.7 °C",
    vaporPressure: "857 kPa @ 20°C",
    flashPoint: "Flammable Gas (Narrow Range 15-28%)",
    autoignition: "651 °C (1204 °F)",
    nature: "Pungent, suffocating alkaline gas. Liquefied under pressure; causes severe frostbite and chemical burns",
    ph: "11.6 (1.0 N solution)",
    nfpa: { health: 3, flammability: 1, instability: 0, special: "COR" },
    ghs: ["Compressed Gas", "Corrosion", "Skull and Crossbones", "Environment"],
    ghsStatements: "Toxic if inhaled. Causes severe skin burns and eye damage. Extremely destructive to mucous membranes.",
    exposure: { pel: "50 ppm TWA", tlv: "25 ppm TWA / 35 ppm STEL", idlh: "300 ppm" },
    suitRecommendations: {
      tankEntry: "Level A (Totally Encapsulated Gas-Tight Suit + SCBA)",
      lineBreak: "Level B or Level A depending on pressure & liquid phase potential",
      sampling: "Level B or C (Full facepiece APR with Ammonia canister if < 300 ppm)",
      spillResponse: "Level A (Encapsulated gas-tight suit, resistant to cryogenic chill)"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Teflon / PTFE", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Neoprene", breakthrough: "> 240 min", rating: "Good" },
      { material: "Viton", breakthrough: "< 15 min", rating: "Poor (Do NOT Use)" }
    ],
    ppe: {
      respirator: "Positive Pressure SCBA (>300 ppm / IDLH); Full-face APR with Ammonia/Methylamine green canister (<300 ppm)",
      gloves: "Heavy Butyl Rubber or Neoprene gloves",
      boots: "Heavy Rubber or PVC chemical boots",
      body: "Level A encapsulated gas suit (or Level B splash suit with hood)"
    },
    materialsAvoid: "Copper, Brass, Bronze, Zinc, Galvanized Steel (attacks copper alloys aggressively!). Use CS, SS 304/316, or Aluminum.",
    firstAid: "Flush eyes and skin immediately with continuous flowing water for 15-20 min. If frozen, thaw with lukewarm water before removing clothes."
  },
  {
    id: "benzene",
    name: "Benzene",
    formula: "C₆H₆",
    cas: "71-43-2",
    un: "UN 1114",
    category: "Organic Solvents & Hydrocarbons",
    molWeight: 78.11,
    density: "0.876 g/cm³ @ 20°C",
    boilingPt: "80.1 °C (176.2 °F)",
    freezingPt: "5.5 °C",
    vaporPressure: "10 kPa @ 20°C",
    flashPoint: "-11.1 °C (12 °F) (Highly Flammable)",
    autoignition: "498 °C (928 °F)",
    nature: "Volatile aromatic hydrocarbon. Known Class 1 Human Carcinogen (causes Acute Myeloid Leukemia)",
    ph: "Neutral",
    nfpa: { health: 3, flammability: 3, instability: 0, special: "CAR" },
    ghs: ["Flammable Liquid", "Health Hazard", "Exclamation Mark"],
    ghsStatements: "Highly flammable liquid and vapor. May be fatal if swallowed and enters airways. Causes genetic defects and cancer (leukemia).",
    exposure: { pel: "1 ppm TWA / 5 ppm STEL (OSHA Benzene Standard 1910.1028)", tlv: "0.5 ppm TWA / 2.5 ppm STEL", idlh: "500 ppm" },
    suitRecommendations: {
      tankEntry: "Level B (Liquid splash tight suit with SCBA + FR protection)",
      lineBreak: "Level B or C (Viton / Silver Shield gloves, SCBA or Benzene organic vapor cartridge)",
      sampling: "Level C (Viton gloves, closed-loop sampler, organic vapor APR)",
      spillResponse: "Level B with SCBA and explosion-proof gear"
    },
    permeation: [
      { material: "Silver Shield / 4H", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Viton", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Nitrile Rubber", breakthrough: "< 15 min", rating: "Poor (Rapid Permeation!)" },
      { material: "Neoprene", breakthrough: "< 10 min", rating: "Poor" },
      { material: "Natural Rubber", breakthrough: "< 5 min", rating: "Poor" }
    ],
    ppe: {
      respirator: "Positive Pressure SCBA (for >10 ppm or vessel entry); Full-face APR with Organic Vapor (OV) cartridge (<10 ppm)",
      gloves: "Viton or Silver Shield / 4H gloves ONLY (Nitrile and Neoprene dissolve/permeate rapidly!)",
      boots: "Chemical resistant Viton or Heavy PVC boots",
      body: "FR Nomex coveralls + Chemical splash suit"
    },
    materialsAvoid: "Strong Oxidizers, Halogens, Nitric Acid. CS and SS 304/316 are excellent for Benzene containment.",
    firstAid: "Move to fresh air immediately. Remove contaminated clothing. Flush skin with soap and water. Enforce OSHA medical surveillance."
  },
  {
    id: "naocl",
    name: "Sodium Hypochlorite (Bleach 15%)",
    formula: "NaOCl",
    cas: "7681-52-9",
    un: "UN 1791",
    category: "Bases & Amines",
    molWeight: 74.44,
    density: "1.2 g/cm³ (15%)",
    boilingPt: "101 °C (decomposes)",
    freezingPt: "-15 °C",
    vaporPressure: "2 kPa @ 20°C",
    flashPoint: "Non-flammable (Strong Oxidizer)",
    autoignition: "N/A",
    nature: "Strong oxidizer and bleaching agent. Contact with acids releases lethal Chlorine gas!",
    ph: "11.5 - 13.0 (alkaline)",
    nfpa: { health: 3, flammability: 0, instability: 1, special: "COR, OX" },
    ghs: ["Corrosion", "Environment"],
    ghsStatements: "Causes severe skin burns and serious eye damage. Very toxic to aquatic life. Contact with acids liberates toxic gas (Cl2).",
    exposure: { pel: "0.5 ppm (as Cl2 equivalent)", tlv: "2 mg/m³ STEL (AIHA WEEL)", idlh: "N/A" },
    suitRecommendations: {
      tankEntry: "Level B (Liquid splash tight suit with SCBA)",
      lineBreak: "Level C with splash face shield and PVC/Nitrile apron",
      sampling: "Level C with chemical splash goggles, face shield, and nitrile gloves",
      spillResponse: "Level C (Ensure acid is NOT nearby!)"
    },
    permeation: [
      { material: "Tychem TK / Responder", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Butyl Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Nitrile Rubber", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Neoprene", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "PVC", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Teflon / PTFE", breakthrough: "> 480 min", rating: "Excellent" },
      { material: "Viton", breakthrough: "> 480 min", rating: "Excellent" }
    ],
    ppe: {
      respirator: "APR with Acid Gas / Chlorine cartridge if fumes present; SCBA for vessel entry",
      gloves: "Nitrile, Neoprene, or PVC heavy chemical gloves",
      boots: "PVC or Rubber chemical safety boots",
      body: "Chemical-resistant splash suit or PVC apron"
    },
    materialsAvoid: "Acids (releases lethal Cl2 gas!), Ammonia (forms explosive/toxic chloramines!), Carbon Steel, Stainless Steel (causes pitting/SCC). Use Titanium, PVDF, or FRP.",
    firstAid: "Flush with water for 15-20 minutes. If mixed with acid and gas inhaled, move to fresh air and administer oxygen."
  }
];

export const INITIAL_REACTIVITY_MATRIX = [
  {
    pair: ["hf", "naoh"],
    severity: "danger",
    title: "Extremely Exothermic Acid-Base Neutralization",
    equation: "HF + NaOH ➔ NaF + H₂O  (ΔH = -68 kJ/mol)",
    mechanism: "Rapid, violent heat release. Concentrated solutions will boil instantaneously, creating toxic aerosol spatter of hydrofluoric acid and sodium fluoride.",
    precaution: "Never mix directly. Dilute both streams with large excess of cold water and add alkali slowly with mechanical agitation and chilled cooling coils."
  },
  {
    pair: ["hf", "cl2"],
    severity: "warning",
    title: "Toxic Halogen Mixture / Oxidizing Acid Atmosphere",
    equation: "HF (aq) + Cl₂ (g) ➔ Highly Corrosive Mixed Halogen Gas",
    mechanism: "Increases vapor toxicity drastically. Destroys respiratory tract immediately. Aggressively dissolves standard elastomer gaskets.",
    precaution: "Ensure dedicated relief and flare headers. Level A encapsulated suit required if breach occurs."
  },
  {
    pair: ["h2so4", "naoh"],
    severity: "danger",
    title: "Violent Boiling & Acid-Base Splattering",
    equation: "H₂SO₄ + 2 NaOH ➔ Na₂SO₄ + 2 H₂O  (ΔH = -112 kJ/mol)",
    mechanism: "Extreme exothermic heat release (>112 kJ/mol). Can exceed boiling point (>140°C) within seconds, triggering steam explosion and boiling caustic/acid eruption.",
    precaution: "Requires slow, controlled metering into cold water reservoir with continuous heat exchangers."
  },
  {
    pair: ["h2so4", "benzene"],
    severity: "danger",
    title: "Violent Sulfonation & Charring Oxidation",
    equation: "C₆H₆ + H₂SO₄ (conc) ➔ C₆H₅SO₃H + H₂O",
    mechanism: "Exothermic aromatic sulfonation. In the presence of hot or fuming acid (oleum), violent boiling, polymerization, and foaming fire risk occurs.",
    precaution: "Keep separate in storage and piping. Do not mix hydrocarbon drains with concentrated sulfuric acid drains."
  },
  {
    pair: ["cl2", "nh3"],
    severity: "danger",
    title: "Formation of Shock-Sensitive Explosive Nitrogen Trichloride (NCl3)",
    equation: "3 Cl₂ + NH₃ ➔ NCl₃ (Explosive Oil) + 3 HCl",
    mechanism: "Forms Nitrogen Trichloride (NCl3), an extremely unstable oily liquid that detonates violently upon light mechanical shock, light exposure, or mild heating (>60°C).",
    precaution: "STRICT PROHIBITION: Never connect chlorine and ammonia headers or use ammonia torches for chlorine leak testing in high concentrations."
  },
  {
    pair: ["h2s", "cl2"],
    severity: "danger",
    title: "Spontaneous Ignition & Toxic Gas Formation",
    equation: "H₂S + 4 Cl₂ + 4 H₂O ➔ H₂SO₄ + 8 HCl  (Violent Pyrophoric / Flame)",
    mechanism: "Spontaneous hypergolic reaction. May ignite on contact without an external spark, producing clouds of choking hydrogen chloride and sulfur oxides.",
    precaution: "Absolute isolation. Flare systems for acid gas must never cross-connect with chlorination vents."
  },
  {
    pair: ["naocl", "hcl"],
    severity: "danger",
    title: "Lethal Chlorine Gas (Cl2) Liberation",
    equation: "NaOCl + 2 HCl ➔ NaCl + H₂O + Cl₂ ↑ (Deadly Green Gas)",
    mechanism: "Rapid, quantitative acidification of hypochlorite releases 100% of available chlorine as gas. Multiple industrial fatalities occur annually from accidental truck offloading cross-connections.",
    precaution: "Enforce distinct keyed couplings (PVR connectors) for acid and bleach offloading manifolds to prevent cross-contamination."
  },
  {
    pair: ["naocl", "nh3"],
    severity: "danger",
    title: "Release of Toxic & Explosive Chloramines",
    equation: "NaOCl + NH₃ ➔ NH₂Cl (Monochloramine) + NHCl₂ + NCl₃",
    mechanism: "Forms toxic chloramine vapor that severely irritates eyes and lungs, causing severe pulmonary edema. Can form explosive NCl3 in excess chlorine.",
    precaution: "Never use ammonia solutions to clean bleach spills or vice-versa."
  },
  {
    pair: ["hno3", "benzene"],
    severity: "danger",
    title: "Violent Nitration & Explosive Runaway",
    equation: "C₆H₆ + HNO₃ (conc) ➔ C₆H₅NO₂ (Nitrobenzene) + H₂O",
    mechanism: "Violent exothermic reaction. Uncontrolled mixing can lead to thermal runaway, vessel rupture, and detonation of polynitrated aromatic byproducts.",
    precaution: "Strict temperature-controlled jacketed reactors with emergency quench systems."
  },
  {
    pair: ["hno3", "naoh"],
    severity: "danger",
    title: "Violent Acid-Base Exotherm",
    equation: "HNO₃ + NaOH ➔ NaNO₃ + H₂O  (ΔH = -57 kJ/mol)",
    mechanism: "Rapid temperature spike with potential boiling and release of toxic brown NO2 gas fumes if localized hot spots exceed 90°C.",
    precaution: "Neutralize only in dilute state with abundant water and continuous monitoring."
  }
];

export const INITIAL_NEUTRALIZATION_DATA = {
  h2so4: {
    name: "Sulfuric Acid (H2SO4 - 98%)",
    pureDensity: 1.84,
    molMass: 98.08,
    defaultConc: 98,
    type: "acid",
    equivalents: 2,
    agents: [
      { id: "caoh2", name: "Hydrated Lime [Ca(OH)2]", molMass: 74.09, eqPerMol: 2, deltaH: -112, formula: "H₂SO₄ + Ca(OH)₂ ➔ CaSO₄↓ + 2 H₂O" },
      { id: "na2co3", name: "Soda Ash [Na2CO3]", molMass: 105.99, eqPerMol: 2, deltaH: -84, formula: "H₂SO₄ + Na₂CO₃ ➔ Na₂SO₄ + CO₂↑ + H₂O" },
      { id: "nahco3", name: "Sodium Bicarbonate [NaHCO3]", molMass: 84.01, eqPerMol: 1, deltaH: -65, formula: "H₂SO₄ + 2 NaHCO₃ ➔ Na₂SO₄ + 2 CO₂↑ + 2 H₂O" },
      { id: "naoh", name: "Caustic Soda [NaOH - pure]", molMass: 40.00, eqPerMol: 1, deltaH: -114, formula: "H₂SO₄ + 2 NaOH ➔ Na₂SO₄ + 2 H₂O" }
    ]
  },
  hcl: {
    name: "Hydrochloric Acid (HCl - 37%)",
    pureDensity: 1.19,
    molMass: 36.46,
    defaultConc: 37,
    type: "acid",
    equivalents: 1,
    agents: [
      { id: "caoh2", name: "Hydrated Lime [Ca(OH)2]", molMass: 74.09, eqPerMol: 2, deltaH: -56, formula: "2 HCl + Ca(OH)₂ ➔ CaCl₂ + 2 H₂O" },
      { id: "na2co3", name: "Soda Ash [Na2CO3]", molMass: 105.99, eqPerMol: 2, deltaH: -42, formula: "2 HCl + Na₂CO₃ ➔ 2 NaCl + CO₂↑ + H₂O" },
      { id: "nahco3", name: "Sodium Bicarbonate [NaHCO3]", molMass: 84.01, eqPerMol: 1, deltaH: -32, formula: "HCl + NaHCO₃ ➔ NaCl + CO₂↑ + H₂O" }
    ]
  },
  hno3: {
    name: "Nitric Acid (HNO3 - 68%)",
    pureDensity: 1.41,
    molMass: 63.01,
    defaultConc: 68,
    type: "acid",
    equivalents: 1,
    agents: [
      { id: "caoh2", name: "Hydrated Lime [Ca(OH)2]", molMass: 74.09, eqPerMol: 2, deltaH: -57, formula: "2 HNO₃ + Ca(OH)₂ ➔ Ca(NO₃)₂ + 2 H₂O" },
      { id: "na2co3", name: "Soda Ash [Na2CO3]", molMass: 105.99, eqPerMol: 2, deltaH: -43, formula: "2 HNO₃ + Na₂CO₃ ➔ 2 NaNO₃ + CO₂↑ + H₂O" },
      { id: "nahco3", name: "Sodium Bicarbonate [NaHCO3]", molMass: 84.01, eqPerMol: 1, deltaH: -33, formula: "HNO₃ + NaHCO₃ ➔ NaNO₃ + CO₂↑ + H₂O" }
    ]
  },
  hf: {
    name: "Hydrofluoric Acid (HF - 48%)",
    pureDensity: 1.15,
    molMass: 20.01,
    defaultConc: 48,
    type: "acid",
    equivalents: 1,
    agents: [
      { id: "caoh2", name: "Hydrated Lime [Ca(OH)2] - Recommended for HF", molMass: 74.09, eqPerMol: 2, deltaH: -68, formula: "2 HF + Ca(OH)₂ ➔ CaF₂↓ (Insoluble Fluorite) + 2 H₂O" }
    ]
  },
  naoh: {
    name: "Sodium Hydroxide (NaOH - 50% Caustic)",
    pureDensity: 1.52,
    molMass: 40.00,
    defaultConc: 50,
    type: "base",
    equivalents: 1,
    agents: [
      { id: "citric", name: "Citric Acid [C6H8O7]", molMass: 192.12, eqPerMol: 3, deltaH: -54, formula: "3 NaOH + C₆H₈O₇ ➔ Na₃C₆H₅O₇ + 3 H₂O" },
      { id: "acetic", name: "Acetic Acid (Vinegar/Glacial) [CH3COOH]", molMass: 60.05, eqPerMol: 1, deltaH: -55, formula: "NaOH + CH₃COOH ➔ CH₃COONa + H₂O" },
      { id: "hcl_dil", name: "Dilute Hydrochloric Acid (10%)", molMass: 36.46, eqPerMol: 1, deltaH: -57, formula: "NaOH + HCl ➔ NaCl + H₂O" }
    ]
  }
};

/**
 * Controller for GET /api/chemical-suite/chemicals
 */
export async function getChemicalCatalog() {
  let firestoreSource = false;
  let chemicals = INITIAL_CHEMICAL_DATABASE;

  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const snap = await adminDb.collection("hazardous_chemicals_catalog").get();
      if (!snap.empty) {
        const loaded = [];
        snap.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() });
        });
        if (loaded.length >= 1) {
          chemicals = loaded;
          firestoreSource = true;
        }
      } else {
        // Seed Firestore collection hazardous_chemicals_catalog
        const batch = adminDb.batch();
        for (const chem of INITIAL_CHEMICAL_DATABASE) {
          const ref = adminDb.collection("hazardous_chemicals_catalog").doc(chem.id);
          batch.set(ref, chem);
        }
        await batch.commit();
        firestoreSource = true;
      }
    }
  } catch (err) {
    console.warn("Firestore hazardous_chemicals_catalog notice:", err.message);
  }

  const reactNeutCatalog = await getOrSeedEngineeringCatalog(
    "chemical_reactivity_and_neutralization",
    {
      reactivity: INITIAL_REACTIVITY_MATRIX,
      neutralization: INITIAL_NEUTRALIZATION_DATA
    }
  );

  return {
    success: true,
    firestoreSource,
    total: chemicals.length,
    chemicals,
    reactivity: Array.isArray(reactNeutCatalog?.reactivity) ? reactNeutCatalog.reactivity : INITIAL_REACTIVITY_MATRIX,
    neutralization: reactNeutCatalog?.neutralization || INITIAL_NEUTRALIZATION_DATA
  };
}

/**
 * Main Controller for /api/chemical-suite
 */
export default async function handler(req, res) {
  const method = req.method;
  const action = req.query?.action || req.body?.action || (method === "GET" ? "chemicals" : "");

  try {
    if (action === "chemicals" || req.path.endsWith("/chemicals")) {
      const catalog = await getChemicalCatalog();
      return res.status(200).json(catalog);
    }

    return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("Chemical Suite API Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
  }
}
