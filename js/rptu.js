
    const processData = [
    { id: "RPTU-PL-01", name: "Make-up Hydrogen Section", mechs: ["HTHA", "H2 Embrittlement"] },

    { id: "RPTU-PL-02", name: "Recycle Hydrogen Compression", mechs: ["Wet H2S", "HIC/SOHIC", "HTHA"] },

    { id: "RPTU-PL-03", name: "Hydrogen Mixing Line", mechs: ["HTHA"] },

    { id: "RPTU-PL-04", name: "Vacuum Resid Feed Transfer", mechs: ["Erosion", "Under Deposit", "Fouling"] },

    { id: "RPTU-PL-05", name: "LCF Feed Preheat Section", mechs: ["Sulfidation", "Fouling"] },

    { id: "RPTU-PL-06", name: "LCF Reactor Charge Heater", mechs: ["HTHA", "Sulfidation", "Coking"] },

    { id: "RPTU-PL-07", name: "LCF Reactor Effluent", mechs: ["HTHA", "NH4HS", "Sulfidation"] },

    { id: "RPTU-PL-08", name: "Reactor Effluent Air Cooler (REAC)", mechs: ["NH4HS", "Erosion", "Under Deposit"] },

    { id: "RPTU-PL-09", name: "High Pressure Separator Liquid", mechs: ["Wet H2S", "Sour Water", "NH4HS"] },

    { id: "RPTU-PL-10", name: "Sour Water / Wash Water Injection", mechs: ["Sour Water", "NH4HS", "Under Deposit"] },

    { id: "RPTU-PL-11", name: "Separator Overhead Vapor", mechs: ["NH4HS", "Wet H2S"] },

    { id: "RPTU-PL-12", name: "Fractionator Bottom Section", mechs: ["Sulfidation", "Fouling", "Coking"] },

    { id: "RPTU-PL-13", name: "HDT Feed Section", mechs: ["Sulfidation", "Fouling"] },

    { id: "RPTU-PL-14", name: "HDT Charge Heater", mechs: ["HTHA", "Sulfidation"] },

    { id: "RPTU-PL-15", name: "HDT Reactor Effluent", mechs: ["HTHA", "Sulfidation", "NH4HS"] },

    { id: "RPTU-PL-16", name: "HDT Effluent Cooling / REAC", mechs: ["NH4HS", "Wet H2S"] },

    { id: "RPTU-PL-17", name: "Fractionator Overhead System", mechs: ["NH4Cl", "Wet H2S"] },

    { id: "RPTU-PL-18", name: "Naphtha Product Section", mechs: ["NH4Cl", "Wet H2S"] },

    { id: "RPTU-PL-19", name: "Diesel Product Section", mechs: ["Sulfidation", "Wet H2S"] },

    { id: "RPTU-PL-20", name: "VGO Product Section", mechs: ["Sulfidation", "Fouling"] },

    { id: "RPTU-PL-21", name: "Vacuum Bottom / Slurry System", mechs: ["Sulfidation", "Erosion", "Fouling", "Coking"] },

    { id: "RPTU-PL-22", name: "Recycle Slurry / Hot Separator Bottom", mechs: ["Sulfidation", "Erosion", "Fouling"] },

    { id: "RPTU-PL-23", name: "Off Gas / Fuel Gas Recovery", mechs: ["Wet H2S"] },

    { id: "RPTU-PL-24", name: "Sour Water Stripper Feed", mechs: ["Sour Water", "Wet H2S", "NH4HS"] },

    { id: "RPTU-PL-25", name: "Lean Amine Section", mechs: ["Amine"] },

    { id: "RPTU-PL-26", name: "Rich Amine Section", mechs: ["Amine", "Wet H2S"] },

    { id: "RPTU-PL-27", name: "Amine Regenerator Overhead", mechs: ["Amine", "Wet H2S"] },

    { id: "RPTU-PL-28", name: "Acid Gas to Sulfur Recovery", mechs: ["Wet H2S", "Sour Water", "SSC/HIC"] },

    { id: "RPTU-PL-29", name: "Flare Blowdown Hydrocarbon", mechs: ["Wet H2S"] },

  { id: "RPTU-PL-30", name: "Relief / Blowdown Header", mechs: ["Wet H2S"] },

{ id: "RPTU-PL-31", name: "Vacuum Fractionator Column", mechs: ["Sulfidation", "Fouling"] },

{ id: "RPTU-PL-32", name: "Diesel Stripper Section", mechs: ["Wet H2S", "NH4Cl"] },

{ id: "RPTU-PL-33", name: "Recycle Gas Amine Absorber", mechs: ["Amine", "Wet H2S"] },

{ id: "RPTU-PL-34", name: "Catalyst Handling / Slurry System", mechs: ["Erosion", "Under Deposit", "Sulfidation"] }

];

    const utilityData = [
    { id: "RPTU-UL-01", name: "Cooling Water System", mechs: ["Oxygen", "MIC", "Under Deposit"] },

    { id: "RPTU-UL-02", name: "Closed Drain / OWS", mechs: ["Sour Water", "MIC"] },

    { id: "RPTU-UL-03", name: "Fire Water System", mechs: ["MIC", "Under Deposit"] },

    { id: "RPTU-UL-04", name: "LP Steam System", mechs: ["FAC", "Erosion"] },

    { id: "RPTU-UL-05", name: "MP Steam System", mechs: ["FAC"] },

    { id: "RPTU-UL-06", name: "HP Steam System", mechs: ["FAC", "Creep"] },

    { id: "RPTU-UL-07", name: "BFW / Condensate System", mechs: ["FAC", "Oxygen"] },

    { id: "RPTU-UL-08", name: "DM Water System", mechs: ["Oxygen"] },

    { id: "RPTU-UL-09", name: "Instrument Air System", mechs: ["Moisture"] },

    { id: "RPTU-UL-10", name: "Fuel Gas System", mechs: ["Wet H2S"] },

    { id: "RPTU-UL-11", name: "Nitrogen Distribution", mechs: ["Low Temperature"] },

    { id: "RPTU-UL-12", name: "Plant Air System", mechs: ["Moisture", "Oxygen"] },

    { id: "RPTU-UL-13", name: "Steam Condensate Return", mechs: ["FAC", "Oxygen"] }
];

const operatingParameters = {

"RPTU-PL-01": {
    temperature: "40°C – 120°C",
    pressure: "170 – 195 kg/cm²g",
    fluid: "Make-up Hydrogen",
    phase: "Vapor"
},

"RPTU-PL-02": {
    temperature: "45°C – 180°C",
    pressure: "175 – 195 kg/cm²g",
    fluid: "Recycle Hydrogen + H2S",
    phase: "Vapor"
},

"RPTU-PL-03": {
    temperature: "120°C – 260°C",
    pressure: "175 – 195 kg/cm²g",
    fluid: "Mixed Hydrogen Gas",
    phase: "Vapor"
},

"RPTU-PL-04": {
    temperature: "80°C – 180°C",
    pressure: "5 – 25 kg/cm²g",
    fluid: "Vacuum Residue / Clarified Oil",
    phase: "Liquid"
},

"RPTU-PL-05": {
    temperature: "180°C – 340°C",
    pressure: "15 – 190 kg/cm²g",
    fluid: "Hot Resid Feed + Hydrogen",
    phase: "Liquid / Mixed Phase"
},

"RPTU-PL-06": {
    temperature: "340°C – 455°C",
    pressure: "175 – 190 kg/cm²g",
    fluid: "Heated Resid Feed + Hydrogen",
    phase: "Mixed Phase"
},

"RPTU-PL-07": {
    temperature: "420°C – 455°C",
    pressure: "165 – 190 kg/cm²g",
    fluid: "Reactor Effluent (HC + H2 + H2S + NH3 + Catalyst)",
    phase: "Mixed Phase"
},

"RPTU-PL-08": {
    temperature: "110°C – 420°C",
    pressure: "145 – 185 kg/cm²g",
    fluid: "Cooling Reactor Effluent + NH4HS",
    phase: "Mixed Phase / Condensing"
},

"RPTU-PL-09": {
    temperature: "60°C – 180°C",
    pressure: "120 – 170 kg/cm²g",
    fluid: "Sour Hydrocarbon + Sour Water",
    phase: "Liquid"
},

"RPTU-PL-10": {
    temperature: "30°C – 150°C",
    pressure: "5 – 180 kg/cm²g",
    fluid: "Wash Water / Sour Water",
    phase: "Liquid"
},

"RPTU-PL-11": {
    temperature: "45°C – 180°C",
    pressure: "110 – 175 kg/cm²g",
    fluid: "Separator Overhead Sour Gas",
    phase: "Vapor"
},

"RPTU-PL-12": {
    temperature: "300°C – 390°C",
    pressure: "1 – 15 kg/cm²g",
    fluid: "Heavy Fractionator Bottoms",
    phase: "Liquid"
},

"RPTU-PL-13": {
    temperature: "80°C – 280°C",
    pressure: "5 – 45 kg/cm²g",
    fluid: "VGO / HCGO Feed",
    phase: "Liquid"
},

"RPTU-PL-14": {
    temperature: "320°C – 410°C",
    pressure: "70 – 110 kg/cm²g",
    fluid: "VGO + Hydrogen Feed",
    phase: "Mixed Phase"
},

"RPTU-PL-15": {
    temperature: "360°C – 430°C",
    pressure: "65 – 105 kg/cm²g",
    fluid: "HDT Reactor Effluent",
    phase: "Mixed Phase"
},

"RPTU-PL-16": {
    temperature: "80°C – 390°C",
    pressure: "55 – 100 kg/cm²g",
    fluid: "Cooling HDT Effluent + NH4HS",
    phase: "Mixed Phase / Condensing"
},

"RPTU-PL-17": {
    temperature: "40°C – 180°C",
    pressure: "0.5 – 8 kg/cm²g",
    fluid: "Fractionator Overhead Vapor",
    phase: "Vapor / Condensing"
},

"RPTU-PL-18": {
    temperature: "35°C – 160°C",
    pressure: "1 – 10 kg/cm²g",
    fluid: "Naphtha Product",
    phase: "Liquid"
},

"RPTU-PL-19": {
    temperature: "60°C – 320°C",
    pressure: "1 – 12 kg/cm²g",
    fluid: "Diesel Product",
    phase: "Liquid"
},

"RPTU-PL-20": {
    temperature: "120°C – 360°C",
    pressure: "1 – 20 kg/cm²g",
    fluid: "Vacuum Gas Oil (VGO)",
    phase: "Liquid"
},

"RPTU-PL-21": {
    temperature: "350°C – 430°C",
    pressure: "2 – 25 kg/cm²g",
    fluid: "Vacuum Bottoms / Slurry",
    phase: "Heavy Liquid / Slurry"
},

"RPTU-PL-22": {
    temperature: "320°C – 430°C",
    pressure: "40 – 185 kg/cm²g",
    fluid: "Recycle Slurry + Catalyst",
    phase: "Slurry / Mixed Phase"
},

"RPTU-PL-23": {
    temperature: "35°C – 120°C",
    pressure: "1 – 15 kg/cm²g",
    fluid: "Off Gas / Fuel Gas",
    phase: "Vapor"
},

"RPTU-PL-24": {
    temperature: "35°C – 95°C",
    pressure: "1 – 12 kg/cm²g",
    fluid: "Sour Water (H2S + NH3)",
    phase: "Liquid"
},

"RPTU-PL-25": {
    temperature: "35°C – 90°C",
    pressure: "3 – 35 kg/cm²g",
    fluid: "Lean MDEA Amine",
    phase: "Liquid"
},

"RPTU-PL-26": {
    temperature: "50°C – 120°C",
    pressure: "5 – 35 kg/cm²g",
    fluid: "Rich MDEA + H2S",
    phase: "Liquid / Flashing"
},

"RPTU-PL-27": {
    temperature: "40°C – 130°C",
    pressure: "0.5 – 5 kg/cm²g",
    fluid: "Acid Gas + Sour Water",
    phase: "Vapor / Condensing"
},

"RPTU-PL-28": {
    temperature: "35°C – 80°C",
    pressure: "0.5 – 4 kg/cm²g",
    fluid: "Acid Gas (H2S Rich)",
    phase: "Vapor"
},

"RPTU-PL-29": {
    temperature: "40°C – 250°C",
    pressure: "Atmospheric – 8 kg/cm²g",
    fluid: "Blowdown Hydrocarbon + Sour Liquid",
    phase: "Mixed Phase"
},

"RPTU-PL-30": {
    temperature: "30°C – 120°C",
    pressure: "Atmospheric – 3 kg/cm²g",
    fluid: "Relief Gas + Condensate",
    phase: "Vapor / Condensing"
},

"RPTU-PL-31": {
    temperature: "250°C – 410°C",
    pressure: "Vacuum to 3 kg/cm²g",
    fluid: "Vacuum Fractionator Hydrocarbon",
    phase: "Mixed Phase"
},

"RPTU-PL-32": {
    temperature: "140°C – 340°C",
    pressure: "1 – 8 kg/cm²g",
    fluid: "Diesel + Steam + H2S",
    phase: "Liquid / Vapor"
},

"RPTU-PL-33": {
    temperature: "40°C – 85°C",
    pressure: "150 – 195 kg/cm²g",
    fluid: "Hydrogen Rich Gas + MDEA",
    phase: "Gas / Liquid"
},

"RPTU-PL-34": {
    temperature: "80°C – 430°C",
    pressure: "10 – 190 kg/cm²g",
    fluid: "Catalyst Slurry / Transport Oil",
    phase: "Slurry"
}

};

    const feedData = {

    "vr": {
        title: "Vacuum Residue (VR)",
        target: "LC-FINING Section",
        desc: "Primary heavy feed to LC-FINING ebullated bed reactors.",
        props: [
            { name: "Feed Source", val: "Vacuum Distillation Unit", risk: "Heavy Resid Feed" },
            { name: "API Gravity", val: "3.0 – 8.0", risk: "Very Heavy Hydrocarbon" },
            { name: "Sulfur (wt%)", val: "4.5 – 6.0", risk: "High Sulfidation Risk", alert: true },
            { name: "Nitrogen (wppm)", val: "3000 – 4500", risk: "NH3 / NH4HS Formation", alert: true },
            { name: "CCR (wt%)", val: "18 – 24", risk: "Severe Fouling/Coking", alert: true },
            { name: "Metals (Ni+V wppm)", val: "100 – 250", risk: "Catalyst Poisoning", alert: true }
        ]
    },

    "pfcc": {
        title: "PFCC Clarified Oil (CLO)",
        target: "LC-FINING Section",
        desc: "Secondary aromatic heavy feed from PFCC/FCC section.",
        props: [
            { name: "Feed Source", val: "PFCC Unit", risk: "Heavy Aromatic Oil" },
            { name: "Sulfur (wt%)", val: "2.0 – 4.0", risk: "Sulfidation Risk" },
            { name: "Catalyst Fines (ppm)", val: ">1500", risk: "High Erosion Risk", alert: true },
            { name: "Aromatic Content", val: "High", risk: "Fouling Tendency" }
        ]
    },

    "vgo": {
        title: "Straight Run VGO (SR-VGO)",
        target: "Integrated ISOTREATING (HDT)",
        desc: "Primary HDT feed routed to hydrotreating reactor.",
        props: [
            { name: "Feed Source", val: "VDU", risk: "Hydrotreater Feed" },
            { name: "Sulfur (wt%)", val: "1.5 – 2.5", risk: "Moderate Sulfidation" },
            { name: "Nitrogen (wppm)", val: "800 – 1500", risk: "Catalyst Deactivation" },
            { name: "Viscosity", val: "Moderate", risk: "Heater Fouling Potential" }
        ]
    },

    "hcgo": {
        title: "Heavy Coker Gasoil (HCGO)",
        target: "Integrated ISOTREATING (HDT)",
        desc: "Cracked heavy feed from Delayed Coker Unit.",
        props: [
            { name: "Feed Source", val: "Delayed Coker Unit", risk: "Cracked Hydrocarbon" },
            { name: "Nitrogen (wppm)", val: "2500 – 4000", risk: "High NH4HS Formation", alert: true },
            { name: "Bromine Number", val: "High", risk: "Preheater Fouling", alert: true },
            { name: "Unsaturates", val: "High", risk: "Coking Risk", alert: true }
        ]
    },

    "hydrogen": {
        title: "Make-up / Recycle Hydrogen",
        target: "LC-FINING + HDT",
        desc: "Hydrogen supplied for hydrocracking and hydrotreating reactions.",
        props: [
            { name: "Service", val: "Hydrogen Rich Gas", risk: "HTHA Exposure", alert: true },
            { name: "Operating Pressure", val: "Very High", risk: "Hydrogen Embrittlement" },
            { name: "Main Risk", val: "High Temperature Hydrogen Attack", risk: "HTHA", alert: true }
        ]
    },

    "washwater": {
        title: "Injection / Wash Water",
        target: "REAC / Effluent Cooling",
        desc: "Injected upstream of coolers to prevent NH4HS salt deposition.",
        props: [
            { name: "Purpose", val: "Salt Control", risk: "NH4HS Mitigation" },
            { name: "Critical Requirement", val: ">25% liquid carryover", risk: "IOW Critical", alert: true },
            { name: "Main Risk", val: "Under Deposit Corrosion", risk: "NH4HS Fouling", alert: true }
        ]
    },

    "amine": {
        title: "Lean Amine (MDEA)",
        target: "Amine Treating Section",
        desc: "Used for H2S removal in absorber system.",
        props: [
            { name: "Amine Type", val: "MDEA", risk: "Amine Corrosion" },
            { name: "Concentration", val: "~35 wt%", risk: "Corrosion if high concentration" },
            { name: "Main Risk", val: "Wet H2S + Amine Corrosion", risk: "Localized Corrosion", alert: true }
        ]
    },
        
"designcase": {
    title: "Design Case Feed Properties for LC-FINING Section",
    target: "LC-FINING Section",
    desc: "Exact design basis feed properties extracted from RPTU Process Manual Table 2.1A.",

    isDesignTable: true,

    columns: [
        "Properties",
        "Unit",
        "Vacuum Residue From New CDU/VDU",
        "Vacuum Residue",
        "Clarified Oil (CLO)",
        "Blended Feed"
    ],

    rows: [

        ["CRUDE PROCESSING", "", "70% Arab Heavy + 30% Arab Light", "100% Assam Crude", "(Note-2)", ""],

        ["STREAM SOURCE", "", "New CDU/VDU", "Existing CDU/VDU", "PFCC", ""],

        ["Wt% of total Feed", "wt%", "82", "15.5", "2.5", "100"],

        ["TBP cut point", "Deg C", "565+", "550+", "370+", "370+"],

        ["Specific gravity", "", "1.050", "1.027", "1.12", "1.048"],

        ["Total Nitrogen", "wppm", "4,770", "3,060", "4,700", "4,501"],

        ["Sulphur", "wppm", "54,400", "9,500", "6,600", "46,255"],

        ["Nickel", "wppm", "55", "<10", "<10", "46.9"],

        ["Vanadium", "wppm", "195", "<10", "<10", "162"],

        ["Asphaltenes (C7)", "wt%", "12.1", "7.3", "10", "11.3"],

        ["Conradson Carbon Residue (CCR)", "wt%", "25.7", "19.72", "9.5", "24.5"],

        ["Kinematic viscosity @", "", "", "", "", ""],

        ["100 °C", "cSt", "", "1852", "20", ""],

        ["135 °C", "cSt", "", "197", "", ""],

        ["150 °C", "cSt", "522", "", "5", ""],

        ["200 °C", "cSt", "88", "", "", ""],

        ["250 °C", "cSt", "22", "", "", ""],

        ["ASTM Distillation (D1160)", "(Note-1)", "", "", "", ""],

        ["1 vol%", "°C", "525", "281", "220", "480"],

        ["5 vol%", "°C", "575", "518", "325", "560"],

        ["10 vol%", "°C", "596", "545", "340", "582"],

        ["30 vol%", "°C", "642", "564", "367", "623"],

        ["50 vol%", "°C", "693", "592", "391", "670"],

        ["70 vol%", "°C", "765", "622", "427", "734"],

        ["90 vol%", "°C", "882", "668", "513", "840"],

        ["95 vol%", "°C", "950", "669", "", "883"],

        ["Final Boiling Point (FBP)", "°C", "1050", "670", "560", "979"],

        ["TAN Number", "mg KOH/g", "0.35", "", "", ""],

        ["Chlorides as Cl(-)", "ppmw", "", "25", "", "25"],

        ["Iron", "ppmw", "<20", "57", "", "<25"],

        ["Al+Si", "ppmw", "", "", "<60", "<2"]
    ]
},
        "hydrogen_design": {
    title: "Make-Up Hydrogen Composition",
    target: "LC-FINING + HDT Hydrogen System",
    desc: "Exact make-up hydrogen composition extracted from RPTU Process Manual Table 2.2.",

    isDesignTable: true,

    columns: [
        "Property",
        "Site Conditions"
    ],

    rows: [

        ["Hydrogen, Vol %, Min.", "99.5"],

        ["Methane, Vol %, Max.", "Balance"],

        ["N₂, ppmv, Max.", "500"],

        ["Water, ppmv, Max", "20"],

        ["CO + CO₂, ppmv, Max.", "20"],

        ["Chloride, ppm mol, Max.", "1"],

        ["Source", "Refinery Hydrogen network"]
    ]
},

        "amine_design": {
    title: "Amine Properties",
    target: "Amine Treating Section",
    desc: "Typical amine design conditions extracted from RPTU Process Manual Table 2.3.",

    isDesignTable: true,

    columns: [
        "Property",
        "Typical Design Conditions"
    ],

    rows: [

        ["Amine", "Methyl Diethanol Amine (MDEA)"],

        ["Amine Concentration, Wt %", "35"],

        ["Lean Amine Loading, Mol H₂S/Mol Amine", "0.015"],

        ["Rich Amine Loading, Mol H₂S/Mol Amine", "0.4"]
    ]
        },
        "injection_water_design": {
    title: "Injection Water Specifications",
    target: "REAC / Wash Water Injection",
    desc: "Injection water specifications extracted from RPTU Process Manual Table 2.4.",

    isDesignTable: true,

    columns: [
        "Property",
        "Maximum",
        "Preferred",
        "Site Condition"
    ],

    rows: [

        ["Source", "Typical Stripped Sour Water", "", "New Sour Water Stripper"],

        ["H₂S, wt ppm", "", "<1000", "<50"],

        ["Ammonia, wt ppm", "", "<1000", "<50"],

        ["Oxygen, wt ppb", "15", "", ""],

        ["pH", "8-10", "8-9", ""],

        ["Iron, wt ppm", "1", "<0.1", ""],

        ["Chlorides, wt ppm", "100 in Injected Water", "<5", ""],

        ["Calcium, wt ppm", "2", "<1", ""],

        ["Total Dissolved Solids, wt ppm", "", "<250", ""],

        ["Total Suspended Solids (TSS) & Dissolved Solids (TDS), >1.5 micron, wt ppm", "1000", "", ""]
    ]
},
        "chemical_requirements": {
    title: "Chemical Requirements",
    target: "Catalyst Sulfiding / Start-up",
    desc: "Chemical requirement extracted from RPTU Process Manual Table 2.5.",

    isDesignTable: true,

    columns: [
        "Chemicals",
        "Initial Charge (m³)"
    ],

    rows: [

        ["DMDS for Catalyst Sulfiding (Note 1)", "31.0"]
    ]
},

        "lcf_catalyst_design": {
    title: "LC-FINING Catalyst Requirement Summary",
    target: "LC-FINING Unit",
    desc: "Catalyst consumption and initial fill extracted from RPTU Process Manual Table 2.6.",

    isDesignTable: true,

    columns: [
        "Parameter",
        "GR-823G",
        "LS10"
    ],

    rows: [

        ["Catalyst Addition Rate", "Design Case", "Design Case"],

        ["kg/Ton (Normal)", "0.404", "0.331"],

        ["kg/Ton (Design)", "0.606", "0.496"],

        ["kg/Day (Normal)", "2,424", "1,986"],

        ["kg/Day (Design)", "3,635", "2,980"],

        ["Initial Inventory (m³)", "137", "137"],

        ["Initial Inventory (kg)", "68,000", "73,000"]
    ]
},

        "vgo_hdt_catalyst_design": {
    title: "VGO HDT Catalyst Requirement Summary",
    target: "VGO Hydrotreating (HDT)",
    desc: "Catalyst loading summary extracted from RPTU Process Manual Table 2.7.",

    isDesignTable: true,

    columns: [
        "Catalyst Name",
        "Function",
        "Loading Method",
        "Volume (m³)",
        "Size (in.)",
        "Density (kg/m³)",
        "Weight (kg)"
    ],

    rows: [

        ["Guard Layer GSK-19", "Grading", "Sock", "2.28", "3/4 in", "880", "2,007"],

        ["Guard Layer GSK-10", "Grading", "Sock", "2.28", "8 mm", "515", "1,175"],

        ["Guard Layer GSK-6A", "Grading", "Sock", "2.28", "1/4 in", "530", "1,209"],

        ["ICR 161NAQ", "HDM", "Sock", "6.39", '1/12"x1/14"', "515", "3,290"],

        ["ICR 186NAQ", "HDM", "Sock", "6.39", '1/12"x1/14"', "575", "3,673"],

        ["ICR 514NAQ", "HDS,HDA,HDN", "Dense", "211.00", '1/12"x1/14"', "835", "176,190"],

        ["Denstone® 2000", "Support", "Sock", "23.60", "1/8 in", "1330", "31,346"],

        ["Denstone® 2000", "Support", "Sock", "22.40", "1/4 in", "1330", "29,746"],

        ["Denstone® 2000", "Support", "Sock", "2.53", "1/2 in", "1330", "3,360"],

        ["TOTAL", "", "", "279.10", "", "", "251,996"]
    ]
        },
"designcase_vgo": {
    title: "Design Case Feed Properties for VGO Hydrotreating Section",
    target: "VGO Hydrotreating Section",
    desc: "Exact design basis feed properties extracted from RPTU Process Manual Table 2.1B.",

    isDesignTable: true,

    columns: [
        "Properties",
        "Unit",
        "SR VGO",
        "LCF VGO",
        "HCGO",
        "Feed Blend"
    ],

    rows: [

        ["CRUDE PROCESSING", "", "70% Arab Heavy + 30% Arab", "(Note 4)", "(Note 3)", ""],

        ["STREAM SOURCE", "", "New CDU/VDU", "Residue Hydrocracking Unit", "Existing Delayed Coker", ""],

        ["Wt% of total Feed", "wt%", "66.7", "28.5", "4.8", "100"],

        ["TBP cut point", "Deg C", "370-565", "370-550", "370+", "370+"],

        ["Specific gravity", "", "0.93", "0.9306", "0.963", "0.932"],

        ["Total Nitrogen", "wppm", "1000", "2962", "6000", "1799"],

        ["Sulphur", "wppm", "30,000", "8027", "5900", "22,5866"],

        ["Nickel", "wppm", "<1", "<0.5", "<1", "<1"],

        ["Vanadium", "wppm", "<1", "<1", "<1", "<1"],

        ["Sodium", "wppm", "1", "<0.5", "", "<1"],

        ["Asphaltenes (C7)", "wppm", "<500", "<1000", "<500", "<650"],

        ["Conradson Carbon Residue (CCR)", "wt %", "0.7", "0.8", "<1.1", "0.75"],

        ["Aniline Point", "°C", "77.7", "68", "", "71.2"],

        ["Pour Point", "°C", "30.5", "35", "", "32"],

        ["Olefins", "wt%", "Nil", "<1", "17", "1.1"],

        ["Total Aromatics", "wt%", "41.3", "55", "48.5-65.0", "46"],

        ["Mono", "wt%", "16.1", "18", "15-20", "17"],

        ["Di", "wt%", "12.2", "7", "20-25", "11"],

        ["Tri+", "wt%", "13.0", "30", "10-15", "18"],

        ["Kinematic viscosity @", "", "", "", "", ""],

        ["50 °C", "cSt", "", "85", "21", "56"],

        ["100 °C", "cSt", "8.3", "11.3", "6", "8.9"],

        ["150 °C", "cSt", "3.0", "3.7", "2.1", "3.1"],

        ["ASTM Distillation (D1160)", "", "", "", "", ""],

        ["1 vol%", "°C", "364", "339", "215", "215"],

        ["5 vol%", "°C", "391", "376", "312", "379"],

        ["10 vol%", "°C", "395", "392", "351", "393"],

        ["30 vol%", "°C", "424", "429", "386", "424"],

        ["50 vol%", "°C", "456", "456", "414", "453"],

        ["70 vol%", "°C", "495", "489", "441", "491"],

        ["90 vol%", "°C", "540", "532", "464", "536"],

        ["95 vol%", "°C", "565", "565", "491", "564"],

        ["Final Boiling Point (FBP)", "°C", "590", "588", "520", "590"],

        ["Acidity", "mg KOH/g", "0.3", "", "", "<1"],

        ["Chlorides as Cl⁻", "ppmw", "1", "", "1-2", "<1"],

        ["Silicon", "ppmw", "", "", "<1", "<1"]
    ]
         }
        };

    const loopEngineeringBasis = {

"RPTU-PL-01": {
    service:
    "Make-up Hydrogen compression and distribution section supplying high purity hydrogen from the off-plot hydrogen network to LC-FINING and HDT reaction sections through the Make-up Hydrogen + Recycle Gas Compressor (1P30-KA-2782A/B). Hydrogen is compressed from approximately 19 kg/cm²g to reaction loop pressure above 190 kg/cm²g under elevated pressure and moderate temperature conditions.",

    segregation:
    "Segregated as an independent corrosion loop because the system handles high purity hydrogen under very high pressure with dedicated compressor trains, spillback controls, steam tracing and metallurgy requirements different from hydrocarbon process systems. Presence of moisture, trace chlorides and H2S carryover creates a distinct hydrogen damage susceptibility.",

    criteria:
    "Loop selected based on high hydrogen partial pressure, elevated operating pressure (>190 kg/cm²g), hydrogen purity requirements (>99.5 vol% H2), susceptibility to High Temperature Hydrogen Attack (HTHA), hydrogen embrittlement and wet H2S related cracking risk at compressor sections. Steam tracing is provided to prevent H2S/water condensation and sulfide stress cracking in compressor internals."
},

"RPTU-PL-02": {
    service:
    "This system handles the recirculation and re-compression of hydrogen-rich gas following reactor effluent separation. The gas stream in this section contains high-pressure hydrogen along with heavy H₂S carryover and residual moisture. Recycle gas is compressed to maintain reactor hydrogen partial pressure for downstream LC-FINING and HDT reaction systems under high-pressure operating conditions.",

    segregation:
    "This system is segregated from pure make-up hydrogen lines because it features a simultaneous combination of a sour environment (Wet H₂S), residual moisture and compressor-induced high-pressure cycling. The combined exposure significantly increases susceptibility to metallurgical micro-cracking, Wet H₂S damage, HIC/SOHIC and structural degradation mechanisms, requiring dedicated inspection and metallurgy control."
},

"RPTU-PL-03": {
    service:
    "This is a high-pressure hydrogen mixing section where high-purity Make-up Hydrogen and Recycle Hydrogen streams blend into a common header before entering the heavy residue hydrocarbon feed process. The mixed hydrogen stream establishes the required reactor hydrogen partial pressure prior to contact with feed in the LC-FINING and HDT systems. This section operates under elevated temperature and very high pressure hydrogen service.",

    segregation:
    "This system is segregated as a distinct corrosion loop because the convergence of Make-up Hydrogen and Recycle Hydrogen streams re-stabilizes total hydrogen partial pressure and creates a unique hydrogen environment. The mixing node experiences transient thermal gradients, turbulence and maximum hydrogen partial pressure, defining the API 941 carbon steel hydrogen attack envelope in its clean gas phase before hydrocarbon contact."
},

"RPTU-PL-04": {
    service:
    "This section is designed to safely receive heavy hydrocarbon feeds including Vacuum Residue (VR) and Clarified Oil (CLO) from upstream CDU/VDU and PFCC units and transfer them to the LC-FINING feed surge section. The system handles high-viscosity heavy hydrocarbons containing elevated CCR, asphaltenes and catalyst fines under relatively low temperature and pressure conditions prior to reactor processing.",

    segregation:
    "This system is segregated as an independent corrosion loop because operating temperatures remain below the sulfidation threshold and hydrogen service is absent, distinctly separating it from reactor hydrogen loops. Damage susceptibility is primarily governed by abrasive solid wear, fouling and under-deposit corrosion caused by heavy hydrocarbon properties including high CCR (18–24 wt%), asphaltenes (~11.3 wt%) and PFCC catalyst fines (>1500 ppm)."
},

"RPTU-PL-05": {
    service:
    "This section preheats the combined Vacuum Residue (VR) and Clarified Oil (CLO) feed streams through thermal exchange with hot reactor effluent prior to entering the reactor charge heater. The system gradually elevates feed temperature to prepare for reactor inlet conditions while handling sulfur-rich heavy hydrocarbons with high fouling tendency under increasing thermal severity.",

    segregation:
    "This system is segregated as an independent corrosion loop because the process fluid temperature exceeds the heavy sulfur thermal activation threshold (~230°C), initiating active sulfidation damage mechanisms. Due to elevated sulfur content in the feed (4.5–6.0 wt%), iron sulfide scaling, thermal wall thinning and fouling become dominant. Hydrogen injection downstream additionally creates a mixed-phase environment that introduces localized HTHA susceptibility prior to the charge heater."
},

"RPTU-PL-06": {
    service:
    "LCF reactor charge heater section where mixed heavy residue feed and hydrogen are heated through the fired heater (1P30-FF-2281) to reactor inlet temperature before entering the first ebullated bed reactor. The system operates under very high temperature, elevated hydrogen partial pressure and sulfur-rich hydrocarbon conditions, creating a severe thermal degradation environment.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates under extreme radiant heat flux, maximum tube metal temperature and elevated hydrogen partial pressure unlike upstream preheat sections. The simultaneous activation of high-temperature sulfidation, coke deposition and High Temperature Hydrogen Attack (HTHA) creates a unique metallurgical damage environment requiring dedicated inspection focus."
},

"RPTU-PL-07": {
    service:
    "LCF reactor effluent section carrying hot reacted hydrocarbons, hydrogen, hydrogen sulfide (H2S), ammonia (NH3) and catalyst fines downstream of the ebullated bed reactors toward the HP/HT separator system. The section operates at maximum end-of-run temperatures with elevated hydrogen partial pressure and converted sour species concentration.",

    segregation:
    "Segregated as an independent corrosion loop because this section combines maximum operating temperature, elevated hydrogen partial pressure, converted sour species (H2S + NH3) and catalyst carryover, creating a severe erosive-corrosive environment distinct from heater and cooling sections."
},

"RPTU-PL-08": {
    service:
    "Reactor Effluent Air Cooler (REAC) section cooling hot reactor effluent downstream of the reactor system through the air cooler train (1P30-EA-2651) prior to separation. The system handles cooling of hydrogen-rich sour process fluid containing H2S, NH3 and condensed water, creating a severe NH4HS corrosion environment.",

    segregation:
    "Segregated as an independent corrosion loop because this section represents the critical temperature transition zone where reactor effluent cools below the salt sublimation point, causing ammonium bisulfide (NH4HS) formation, salt precipitation and severe erosion-corrosion mechanisms distinct from upstream hot reactor effluent piping."
},
 "RPTU-PL-09": {
    service:
    "High Pressure Separator Liquid section handling liquid drop-out from the HP/LT separation system following reactor effluent cooling. The system processes sour hydrocarbon liquid and separated aqueous sour water containing dissolved H2S, NH3 and NH4HS under elevated pressure conditions.",

    segregation:
    "Segregated as an independent corrosion loop because this section contains a discrete aqueous sour water phase under high pressure, creating severe Wet H2S cracking susceptibility including HIC, SOHIC and SSC mechanisms distinct from vapor and upstream reactor effluent systems."
},
        "RPTU-PL-10": {
    service:
    "Sour water and wash water injection section supplying treated wash water upstream of the Reactor Effluent Air Cooler (REAC) system to dilute and remove ammonium bisulfide (NH4HS) salts. The system includes wash water pumps, distribution headers and injection points into the hot reactor effluent stream.",

    segregation:
    "Segregated as an independent corrosion loop because this section transitions from a clean utility-type water service into a high-temperature injection environment where thermal shock, atomization and turbulent mixing directly influence downstream NH4HS corrosion control. The loop forms a critical Integrity Operating Window (IOW) for REAC reliability and corrosion mitigation."
},
"RPTU-PL-11": {
    service:
    "Separator overhead vapor section handling high-pressure sour gas exiting the HP/HT and HP/LT separators prior to routing toward the recycle gas amine absorber system. The stream contains hydrogen-rich vapor with gaseous H2S and ammonia (NH3) under elevated pressure conditions.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates predominantly in vapor-phase sour gas service distinct from liquid separation systems, with localized corrosion risk governed by moisture condensation, dew point formation and salt deposition in stagnant or cooler regions."
},
    "RPTU-PL-12": {
    service:
    "Fractionator bottom section handling hot heavy hydrocarbons and unconverted residue from the bottom of the main fractionator column (1P31-CC-2627). The system processes high-temperature heavy liquid streams routed through reboilers and bottoms transfer systems under severe thermal operating conditions.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates at elevated temperatures above 300°C where aqueous corrosion mechanisms become inactive and high-temperature degradation mechanisms such as sulfidation, coke formation and fouling dominate the metallurgical damage profile."
},
    "RPTU-PL-13": {
    service:
    "HDT feed section handling Straight Run VGO and Heavy Coker Gas Oil (HCGO) feed streams for the Integrated ISOTREATING (VGO HDT) unit prior to hydrogen injection. The system includes feed surge, charge pumps and preheat exchangers operating under moderate temperature hydrocarbon service.",

    segregation:
    "Segregated as an independent corrosion loop because this section defines the front-end boundary of the secondary hydroprocessing unit before hydrogen addition, where moderate-temperature sulfur corrosion and hydrocarbon fouling dominate due to sulfur compounds, olefins and di-olefins present in the HCGO blend."
},
    "RPTU-PL-14": {
    service:
    "HDT charge heater section where the VGO feed and hydrogen mixture are heated through the fired heater (1P31-FF-2881) to the required hydrotreating reactor inlet temperature. The system operates under elevated hydrogen partial pressure and sulfur-rich feed conditions at severe thermal exposure.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates under extreme radiant heat flux, elevated hydrogen partial pressure and high-temperature sulfur service creating a severe metallurgical environment governed by High Temperature Hydrogen Attack (HTHA), sulfidation and thermal degradation mechanisms within API 941 operating limits."
},
    "RPTU-PL-15": {
    service:
    "HDT reactor effluent section carrying hot reacted hydrocarbons, hydrogen, hydrogen sulfide (H2S), ammonia (NH3), and hot liquid VGO downstream of the HDT reactor toward the hot separator system. The section operates at elevated end-of-run temperatures with high hydrogen partial pressure and converted sour species concentration.",

    segregation:
    "Segregated as an independent corrosion loop because this section represents the most aggressive post-reaction environment in the HDT unit, combining elevated temperature, high hydrogen partial pressure, newly formed H2S and NH3, and phase separation effects, creating severe HTHA and high-temperature sulfidation risks distinct from heater and cooling sections."
},
        "RPTU-PL-16": {
    service:
    "HDT effluent cooling and reactor effluent air cooler (REAC) section handling hot HDT reactor effluent containing hydrogen, hydrogen sulfide (H2S), ammonia (NH3), and injected wash water as the stream cools toward the cold separator system. The section operates across the NH4HS salt formation temperature range where vapor transitions into an aqueous sour environment.",

    segregation:
    "Segregated as an independent corrosion loop because this section represents the NH4HS salt formation and condensation boundary where wash water injection, thermal shock, under-deposit corrosion, and high-velocity erosion-corrosion dominate, making it operationally critical for integrity management."
},

    "RPTU-PL-17": {
    service:
    "Fractionator overhead system handling top vapor streams, condensers, and reflux drum service containing hydrocarbon vapor, steam, trace chlorides, hydrogen sulfide (H2S), and condensed sour water. The section operates across the aqueous dew point where acidic condensates and salt deposition may occur.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates at the aqueous dew point boundary where chloride salts, NH4Cl deposition, aqueous HCl formation, and Wet H2S corrosion mechanisms become dominant, creating severe localized corrosion risks distinct from high-temperature fractionator sections."
},
   "RPTU-PL-18": {
    service:
    "Naphtha product section handling stabilized light hydrocarbon streams, overhead condensers, reflux drum service, and product rundown to storage. The section operates at relatively low temperatures with trace moisture and residual dissolved hydrogen sulfide (H2S) present in light hydrocarbon streams.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates in a low-temperature hydrocarbon environment where high-temperature damage mechanisms are absent, shifting the primary integrity concern toward Wet H2S cracking, aqueous corrosion, and low-temperature thinning mechanisms."
}, 

   "RPTU-PL-19": {
    service:
    "Diesel product section handling diesel hydrocarbon streams from stripper withdrawal through rundown cooling and transfer to storage. The section includes both hot diesel service with residual sulfur content and cooled diesel transport after temperature reduction below active sulfidation thresholds.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles a dedicated diesel product cut where corrosion mechanisms transition from active high-temperature sulfidation in hot service to low-risk general thinning after rundown cooling."
}, 
    "RPTU-PL-20": {
    service:
    "VGO product section handling heavy Vacuum Gas Oil (VGO) streams including hot pumparound circulation, product cooling, and rundown transfer to battery limits. The section operates with heavy viscous hydrocarbons at elevated temperatures prior to final cooling.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles high-temperature heavy VGO service where severe sulfidation and organic fouling mechanisms dominate before the product is cooled and transferred to downstream storage or processing."
},
    "RPTU-PL-21": {
    service:
    "Vacuum bottom and slurry system handling extremely heavy vacuum column bottoms, slurry hydrocarbons, catalyst fines, coke precursors, and high CCR/asphaltene material through slurry pumps and rundown cooling sections. The section operates at extremely high temperatures with highly viscous, solids-laden hydrocarbon service.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles the heaviest and most mechanically aggressive refinery stream, combining extreme temperature, high sulfur content, catalyst fines, coke precursors, and severe erosion-corrosion conditions distinct from lighter hydrocarbon product systems."
},
  "RPTU-PL-22": {
    service:
    "Recycle slurry and hot separator bottom system handling high-temperature unreacted heavy residue, catalyst fines, and hot slurry streams recycled from the hot separator back to the reactor preheat section. The section operates under sustained high pressure with hot slurry and mixed-phase flashing conditions.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates as a high-pressure recycle system handling hot catalyst slurry under severe turbulent flow, erosion-corrosion, sulfidation, and pressure-drop-induced cavitation conditions distinct from once-through process streams."
},
        
 "RPTU-PL-23": {
    service:
    "Off gas and fuel gas recovery system handling light hydrocarbon off-gases, sour gas streams, and condensed sour water from low-pressure flash drums routed to the refinery fuel gas system. The section operates at relatively low pressure and low temperature with intermittent sour water condensation risks.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates in a low-temperature sour gas environment where high-temperature degradation mechanisms are absent, and the primary integrity concern shifts to Wet H2S cracking and localized corrosion caused by sour water condensation."
},
        
 "RPTU-PL-24": {
    service:
    "Sour water stripper feed section collecting sour water drop-outs from separators and accumulator boots and routing them to the Sour Water Stripper Unit. The stream is entirely aqueous and contains high concentrations of dissolved hydrogen sulfide (H2S), ammonia (NH3) and ammonium bisulfide (NH4HS) precursors, creating a highly corrosive low-temperature sour water environment.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles fully aqueous sour water saturated with dissolved H2S and NH3, creating a corrosion environment dominated by low-temperature sour water corrosion, Wet H2S damage and NH4HS-related localized attack distinct from hydrocarbon processing sections."
},
        
   "RPTU-PL-25": {
    service:
    "Lean amine section handling regenerated lean Methyl Diethanol Amine (MDEA) solution supplied to the H2S absorber system. The stream consists of low H2S-loaded amine circulating under controlled pressure and temperature conditions for acid gas absorption, operating in a relatively clean and alkaline process environment.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles regenerated lean amine with low sour gas loading, creating a corrosion environment dominated by amine corrosion, velocity-induced erosion and heat-stable amine salt (HSAS) related localized attack distinct from sour water and hydrocarbon systems."
}, 
    "RPTU-PL-26": {
    service:
    "Rich amine section handling H2S-loaded Methyl Diethanol Amine (MDEA) solution exiting the absorber system and routing toward the Rich Amine Flash Drum and Regenerator. The stream contains elevated dissolved acid gas concentrations, particularly hydrogen sulfide (H2S), under pressure and transitions into flashing two-phase flow during pressure reduction.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles highly acid gas-loaded rich amine, creating a significantly more aggressive corrosion environment than lean amine systems. Elevated dissolved H2S, flashing conditions and two-phase flow introduce severe amine corrosion, Wet H2S damage and erosion-corrosion risks distinct from clean amine circulation."
},
   "RPTU-PL-27": {
    service:
    "Amine regenerator overhead section handling stripped acid gas and steam exiting the top of the amine regenerator column through overhead condensers and reflux drum systems. The stream contains concentrated hydrogen sulfide (H2S), steam and condensed sour water generated during thermal regeneration of rich amine.",

    segregation:
    "Segregated as an independent corrosion loop because this section represents the acid gas stripping and condensation boundary where steam condenses into sour water enriched with dissolved H2S. The resulting low-pH aqueous environment creates severe Wet H2S cracking and sour water corrosion risks distinct from rich and lean amine circulation systems."
},
        
 "RPTU-PL-28": {
    service:
    "Acid gas transfer section routing concentrated stripped acid gas from the amine regenerator overhead accumulator to the Sulfur Recovery Unit (SRU) battery limit. The stream primarily consists of saturated hydrogen sulfide (H2S) gas with trace moisture, operating under conditions where localized condensation can create highly aggressive sour water films.",

    segregation:
    "Segregated as an independent corrosion loop because this section handles saturated high-purity H2S gas, creating a unique corrosion environment dominated by dew-point condensation, Wet H2S damage and sulfide stress cracking risks distinct from amine regeneration and hydrocarbon process systems."
},
        
  "RPTU-PL-29": {
    service:
    "Flare blowdown hydrocarbon section handling intermittent hydrocarbon blowdown, process vessel drains and emergency relief routing to the Heavy Closed Blowdown Drum (1P30-VV-6632). The system receives hot, sour and mixed-phase hydrocarbons during plant upsets, shutdowns and depressurization events, resulting in severe thermal cycling and sour liquid accumulation.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates intermittently under upset and blowdown conditions, exposing piping and vessels to extreme temperature fluctuations, sour hydrocarbon pooling and stagnant liquid accumulation. The resulting corrosion environment is dominated by thermal fatigue, Wet H2S damage and corrosion under insulation risks distinct from continuous process systems."
},
        
    "RPTU-PL-30": {
    service:
    "Relief and blowdown header section connecting Pressure Safety Valves (PSVs) from the LC-FINING, Isotreating and fractionation units to the main Flare K.O. Drum (1P30-VV-4132). The system remains normally stagnant at near-atmospheric pressure and only becomes active during relief or blowdown events, while minor PSV seat leakage may introduce sour gases into the header network.",

    segregation:
    "Segregated as an independent corrosion loop because this section functions as a normally stagnant atmospheric relief system exposed to intermittent sour gas ingress from PSV weeping. The resulting corrosion environment is dominated by dead-leg corrosion, localized moisture condensation, Wet H2S damage and CUI risks distinct from pressurized process systems."
},
  
  "RPTU-PL-31": {
    service:
    "Vacuum fractionator column section handling high-temperature heavy hydrocarbon separation under deep vacuum conditions within the Vacuum Fractionator Column (1P36-CC-2126). The system processes hot vacuum residue and heavy hydrocarbon vapors at temperatures exceeding 380°C, concentrating asphaltic fractions while removing lighter hydrocarbons and moisture.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates under deep vacuum and extreme temperature conditions, creating a unique corrosion environment dominated by high-temperature sulfidation, erosion and thermal degradation mechanisms distinct from atmospheric and lower-temperature fractionation systems."
},
        
    "RPTU-PL-32": {
    service:
    "Diesel stripper section handling steam stripping of diesel product to remove light hydrocarbons and dissolved gases prior to product rundown and cooling. The system operates with hot diesel liquid, stripping steam and residual hydrogen sulfide (H2S), creating both high-temperature hydrocarbon and localized overhead condensation environments.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates under dedicated thermal stripping conditions for diesel hydrocarbons, combining active high-temperature sulfidation in the bottoms section with localized aqueous condensation and Wet H2S risks in the overhead system."
},
    
  "RPTU-PL-33": {
    service:
    "Recycle gas amine absorber section handling high-pressure hydrogen-rich recycle gas sweetening within the Recycle Gas Amine Absorber Column (1P30-CC-0126). The system removes hydrogen sulfide (H2S) from reactor recycle gas using lean MDEA under high pressure, producing sweetened hydrogen gas for recycle back to the process.",

    segregation:
    "Segregated as an independent corrosion loop because this section operates as a high-pressure sour gas sweetening boundary where hydrogen-rich gas interfaces with loaded amine under severe pressure conditions. The corrosion environment is dominated by Wet H2S damage, hydrogen-related cracking and amine stress corrosion cracking risks distinct from standard amine circulation systems."
},  
        "RPTU-PL-34": {
    service:
    "Catalyst handling and slurry transfer system dedicated to fresh catalyst addition and spent catalyst withdrawal for maintaining the ebullating bed profile inside the LC-FINING reactors. The system handles high-velocity abrasive catalyst particles suspended in transport and flush oils under intermittent operating conditions.",

    segregation:
    "Segregated as an independent corrosion loop because this is a non-continuous solid-slurry transport system exposed to severe particulate erosion, high-shear valve wear, abrasive catalyst handling, and localized high-temperature sulfidation distinct from normal hydrocarbon process loops."
}
};


const loopCircuits = {

"RPTU-PL-01": [
{
    circuitId: "01-Ckt-01",
    boundary: "Make-up H2 Suction K.O. Drum (1P30-VV-2734) and associated piping",
    phase: "Clean H2 Gas (Ambient Temp)",
    basis: "Liquid Drop-Out Zone: Potential moisture drop-out boundary at compressor suction due to pressure and ambient temperature fluctuations creating stagnant pooling areas.",
    damage: "H2 Embrittlement, Wet H2S",
    ndt: "UTM at K.O. drum bottom shell, WFMPT on welds"
},
{
    circuitId: "01-Ckt-02",
    boundary: "Compressor (1P30-KA-2782A/B) discharge lines and downstream headers",
    phase: "High Pressure H2 Gas",
    basis: "Pressure & Velocity Elevation: Pressure rises >190 kg/cm²g after compression creating pulsation-induced dynamic stress zones.",
    damage: "Mechanical Fatigue / Vibration, H2 Embrittlement",
    ndt: "RT on small bore connections, continuous vibration monitoring"
}
],

"RPTU-PL-02": [
{
    circuitId: "02-Ckt-01",
    boundary: "Recycle Compressor Suction Drum (1P30-VV-2735A/B) and inlet piping",
    phase: "H₂ + Wet H₂S (Gas/Liquid Phase)",
    basis: "Phase Separation & Condensation Zone: Fluid velocity reduction and cooling at compressor suction activate water dew-point causing sour water condensation and localized wet H₂S exposure.",
    damage: "Wet H₂S, HIC/SOHIC",
    ndt: "Advanced UT for internal blistering/HIC mapping, hardness survey at weld seams and PAUT on susceptible weld joints."
},
{
    circuitId: "02-Ckt-02",
    boundary: "Recycle Gas Compressor discharge up to Intercoolers (1P30-E-2760A/B)",
    phase: "Hot Sour Hydrogen Gas",
    basis: "Pressure & Temperature Elevation: Gas compression increases discharge temperature and pressure causing elevated hydrogen diffusion and wet sour cracking susceptibility.",
    damage: "Wet H₂S, HTHA",
    ndt: "UTM thickness monitoring, PAUT on heavy-wall welds, RT on small bore high-stress connections and vibration monitoring."
}
    ],
  "RPTU-PL-03": [
{
    circuitId: "03-Ckt-01",
    boundary: "H₂ Mixing Header up to LCF Preheat Exchanger inlet junction",
    phase: "Mixed H₂ Gas (Increasing Temperature)",
    basis: "Stream Convergence & Mixing Turbulence: Thermal mixing of Make-up and Recycle Hydrogen streams creates a transient pressure zone with maximum hydrogen partial pressure and localized turbulence prior to hydrocarbon contact.",
    damage: "HTHA (High Temperature Hydrogen Attack)",
    ndt: "High-temperature AUT, specialized PAUT/TOFD on critical weld joints as per API 941 inspection protocols."
}  
],
    "RPTU-PL-04": [
{
    circuitId: "04-Ckt-01",
    boundary: "OSBL Battery Limit up to VR Feed Surge Drum (1P30-VV-2231) inlet nozzle",
    phase: "Cold/Warm Heavy Liquid",
    basis: "Low Velocity Fluid Transport: Standard feed transfer temperature range where heavy hydrocarbon kinetics remain low, promoting solid settling, fouling and stagnant region deposition.",
    damage: "Erosion, Under Deposit Corrosion, Fouling",
    ndt: "UTM at outer radius of elbows/bends, VT for fouling-prone dead zones and CUI inspection behind insulation."
},
{
    circuitId: "04-Ckt-02",
    boundary: "VR Feed Pumps (1P30-PA-2201A/B) and downstream discharge lines",
    phase: "Pressurized Heavy Liquid",
    basis: "High Kinetic Energy Zone: Pump discharge section experiences increased fluid velocity and pressure turbulence causing catalyst fines and suspended solids to accelerate erosive wear.",
    damage: "Erosion, Mechanical Thinning",
    ndt: "UTM at pump casings, discharge bends, reducers, tees and high turbulence locations."
}
],
    "RPTU-PL-05": [
{
    circuitId: "05-Ckt-01",
    boundary: "Feed/Effluent Exchangers (1P30-E-2261/62) tube side and cross-connecting piping",
    phase: "Hot Heavy Oil Liquid",
    basis: "Thermal Activation Threshold (>230°C): Heat exchanger section where increasing metal temperature activates sulfur-driven corrosion kinetics, promoting sulfidation and heavy fouling prior to hydrogen introduction.",
    damage: "Sulfidation, Heavy Fouling",
    ndt: "UTM thickness tracking on exchanger crossover piping, hotspot thickness monitoring and fouling assessment."
},
{
    circuitId: "05-Ckt-02",
    boundary: "Hydrogen Mixing Point up to Charge Heater (1P30-FF-2281) inlet header nozzle",
    phase: "Hot Liquid Hydrocarbon + H₂ Gas Mixture",
    basis: "Multi-Phase Fluid Transformation: Hydrogen injection into hot sulfur-rich oil converts the stream from single-phase liquid to mixed-phase service, creating localized thermal gradients and initiating hydrogen damage susceptibility.",
    damage: "Sulfidation, Fouling, HTHA",
    ndt: "PAUT at hydrogen injection tees, localized high-temperature UTM surveys and weld inspection at mixing zones."
}
],
    "RPTU-PL-06": [
{
    circuitId: "06-Ckt-01",
    boundary: "Charge Heater (1P30-FF-2281) Radiant Tubes and U-bends",
    phase: "Hot Mixed Phase (Vapor/Liquid)",
    basis: "Extreme Skin Temperature: Direct flame radiation zone where tube metal temperatures (TMT) peak, leading to accelerated metallurgical degradation and coke deposition.",
    damage: "HTHA, Sulfidation, Coking",
    ndt: "Tube thickness survey (Smart Pigging if applicable), Diametrical growth measurement (Creep), Skin Temperature monitoring"
},
{
    circuitId: "06-Ckt-02",
    boundary: "Heater Outlet Transfer Line to 1st Reactor (1P30-RB-2221) Inlet",
    phase: "Mixed Phase (Maximum Bulk Temperature)",
    basis: "Maximum Bulk Fluid Temperature: Heavy-wall insulated piping carrying fully heated process fluid at peak operating temperature before reactor entry, creating elevated HTHA susceptibility.",
    damage: "HTHA, Sulfidation",
    ndt: "High-Temperature AUT on extrados, PAUT/TOFD on heavy-wall welds"
}
],
    "RPTU-PL-07": [
{
    circuitId: "07-Ckt-01",
    boundary: "Inter-reactor piping from 1st Reactor (1P30-RB-2221) to 2nd Reactor (1P30-RB-2222)",
    phase: "Mixed Phase + Solid Catalyst Fines",
    basis: "Catalyst Carryover & Turbulence: High-velocity transfer zone between reactors where fluid turbulence combined with suspended catalyst particles creates severe mechanical scouring.",
    damage: "Erosion-Corrosion, Sulfidation, HTHA",
    ndt: "Profile RT at elbows/tees for erosion assessment, Advanced UT for HTHA susceptible areas"
},
{
    circuitId: "07-Ckt-02",
    boundary: "2nd Reactor Effluent to HP/HT Separator (1P30-VV-2631)",
    phase: "Mixed Phase (Up to 454°C Maximum)",
    basis: "Peak Sour Species Concentration: Post-reaction zone containing maximum converted H2S and NH3 concentration at elevated EOR temperatures, increasing Nelson Curve exposure.",
    damage: "HTHA, Sulfidation, NH4HS",
    ndt: "In-situ Metallography (Replication) at critical welds, AUT thickness mapping"
},
{
    circuitId: "07-Ckt-03",
    boundary: "Ebullating Pumps (1P30-PA-2203/04) and associated suction/discharge piping",
    phase: "Hot Catalyst Slurry",
    basis: "High-Shear Slurry Handling: Mechanical pumping zone handling dense high-temperature catalyst slurry causing severe localized abrasive wear.",
    damage: "Erosion, Mechanical Fatigue",
    ndt: "Strict UTM monitoring on pump volutes and piping extrados, Internal visual inspection"
}
],
    "RPTU-PL-08": [
{
    circuitId: "08-Ckt-01",
    boundary: "REAC (1P30-EA-2651) Inlet Header and Fin-Fan Tubes",
    phase: "Condensing Sour Water (High Velocity)",
    basis: "Salt Sublimation & Condensation: Thermal boundary where NH4HS transitions from vapor to solid/aqueous phase causing aggressive localized scouring and internal deposition.",
    damage: "NH4HS, Erosion, Under Deposit",
    ndt: "IRIS/ECT for internal tube inspection, highly clustered UTM grids on inlet headers"
},
{
    circuitId: "08-Ckt-02",
    boundary: "REAC Outlet Header to Cold Separator",
    phase: "Liquid Hydrocarbon + Aqueous Sour Water",
    basis: "Aqueous Sour Environment: Post-cooling section where sour water fully forms with high dissolved H2S and NH3 concentration increasing cracking susceptibility.",
    damage: "Wet H2S, HIC/SOHIC, NH4HS",
    ndt: "WFMPT on welds, Advanced UT for blistering/HIC mapping, standard UTM"
}
],
    "RPTU-PL-09": [
{
    circuitId: "09-Ckt-01",
    boundary: "HP/LT Separator (1P30-VV-2632) Water Boot and Letdown Valve piping",
    phase: "Sour Water (High NH4HS & H2S)",
    basis: "Aqueous Phase Accumulation & Flashing: Collection zone for heavy sour water followed by severe pressure reduction across letdown valves causing flashing and cavitation.",
    damage: "Wet H2S, HIC/SOHIC, Sour Water, Erosion",
    ndt: "Advanced UT for internal blistering/HIC mapping, RT across letdown valves, Hardness testing"
},
{
    circuitId: "09-Ckt-02",
    boundary: "Separator Hydrocarbon Liquid rundown lines",
    phase: "Sour Liquid Hydrocarbon",
    basis: "Dissolved H2S Liquid Phase: Sour hydrocarbon stream containing dissolved H2S at moderate temperature moving toward downstream separation.",
    damage: "Wet H2S, General Thinning",
    ndt: "Standard UTM thickness monitoring, WFMPT on pressure-boundary welds"
}
],
    "RPTU-PL-10": [
{
    circuitId: "10-Ckt-01",
    boundary: "Wash Water Pumps and Supply Headers",
    phase: "Clean / Treated Water",
    basis: "Water Supply Transport: Ambient temperature water handling section where oxygen ingress, poor deaeration or water chemistry deviations govern corrosion susceptibility before injection.",
    damage: "Oxygen, General Thinning",
    ndt: "Standard UTM, periodic water chemistry verification"
},
{
    circuitId: "10-Ckt-02",
    boundary: "Wash Water Injection Point (Mix Point / Injection Quill)",
    phase: "Vapor + Injected Liquid Water",
    basis: "Thermal Shock & Atomization: Physical intersection where relatively cold wash water atomizes into hot reactor effluent vapor causing rapid thermal cycling and localized turbulence.",
    damage: "Thermal Fatigue, Under Deposit, Erosion",
    ndt: "RT profiling at injection quill, PAUT/TOFD at mixing tees for fatigue cracking"
}
],
    "RPTU-PL-11": [
{
    circuitId: "11-Ckt-01",
    boundary: "Separator Overhead Vapor Lines to Amine Absorber Inlet",
    phase: "Sour H2 Gas",
    basis: "High-Velocity Vapor Transport: Continuous vapor-phase operation where bulk corrosion remains limited but localized impingement and salt carryover may occur at bends and elbows.",
    damage: "NH4HS, Wet H2S",
    ndt: "Standard UTM, specialized UT mapping on outer radius of elbows/bends"
},
{
    circuitId: "11-Ckt-02",
    boundary: "Vapor Line Dead-Legs and By-pass piping",
    phase: "Stagnant Vapor / Condensate",
    basis: "Stagnant Flow & Dew Point Zone: Low-flow or stagnant sections where pipe metal temperature may fall below dew point causing localized sour water condensation.",
    damage: "Wet H2S, HIC/SOHIC, Localized Pitting",
    ndt: "UTM focused on 6 o'clock pipe position, WFMPT on adjacent welds"
}
],
    "RPTU-PL-12": [
{
    circuitId: "12-Ckt-01",
    boundary: "Fractionator (1P31-CC-2627) Bottoms to Reboiler (1P31-E-2663)",
    phase: "Hot Heavy Liquid (>300°C)",
    basis: "High Thermal Flux & Residence Time: Highest temperature zone within the column where thermal degradation of heavy hydrocarbons promotes coke formation and rapid sulfidic attack.",
    damage: "Sulfidation, Coking, Fouling",
    ndt: "High-Temperature UT at turbulence zones, IR thermography for internal coke build-up detection"
},
{
    circuitId: "12-Ckt-02",
    boundary: "Bottoms Product Pumps (1P31-PA-2601A/B) and rundown lines",
    phase: "Pressurized Hot Liquid",
    basis: "Velocity-Accelerated Corrosion: Increased fluid velocity near pumps can remove protective iron sulfide scales and accelerate metal loss.",
    damage: "Sulfidation, Erosion",
    ndt: "UTM at pump casings, discharge reducers and first downstream elbows"
}
],
    "RPTU-PL-13": [
{
    circuitId: "13-Ckt-01",
    boundary: "HDT Feed Surge Drum (1P31-VV-2831) and Charge Pumps (1P31-PA-2801A/B)",
    phase: "Warm VGO Liquid",
    basis: "Low-Temperature Hydrocarbon Storage: Ambient to moderate temperature liquid handling where bulk corrosion is limited but particulate settling, fouling and pump cavitation may occur.",
    damage: "Fouling, General Thinning, Mechanical Wear",
    ndt: "Standard UTM, vibration monitoring on charge pumps"
},
{
    circuitId: "13-Ckt-02",
    boundary: "Feed/Effluent Exchangers (1P31-E-2858) Cold Side piping",
    phase: "Hot VGO Liquid (>230°C)",
    basis: "Thermal Activation Threshold: Feed preheating causes the fluid temperature to exceed ~230°C activating high-temperature sulfidation without hydrogen influence.",
    damage: "Sulfidation, Fouling",
    ndt: "UTM thickness tracking on hot cross-over piping, exchanger pressure drop monitoring"
}
],
    "RPTU-PL-14": [
{
    circuitId: "14-Ckt-01",
    boundary: "HDT Charge Heater (1P31-FF-2881) Radiant Tubes",
    phase: "Hot Mixed Phase (Vapor/Liquid)",
    basis: "Extreme Skin Temperature (Radiant Zone): Direct flame exposure zone where tube metal temperatures reach peak values causing metallurgical creep and internal scaling.",
    damage: "Sulfidation, HTHA, Creep",
    ndt: "Tube thickness survey, tube diametrical growth measurement, continuous skin temperature monitoring"
},
{
    circuitId: "14-Ckt-02",
    boundary: "Heater Outlet Transfer Line to HDT Reactor (1P31-RB-2821)",
    phase: "Mixed Phase (Maximum Bulk Temperature)",
    basis: "Peak HTHA Envelope: Fully heated transfer line operating at end-of-run temperature limits maximizing hydrogen diffusion into steel.",
    damage: "HTHA, Sulfidation",
    ndt: "High-Temperature AUT, specialized PAUT/TOFD on heavy-wall welds"
}
],
    "RPTU-PL-15": [
{
    circuitId: "15-Ckt-01",
    boundary: "HDT Reactor (1P31-RB-2821) Outlet to Hot Separator (1P31-VV-2633)",
    phase: "Hot Mixed Phase",
    basis: "Maximum Sour Yield at Peak Temperature: Physical boundary where newly formed H2S and NH3 gases exit the catalyst bed at elevated temperatures, creating severe sour service conditions.",
    damage: "HTHA, High-Temp Sulfidation, NH4HS Precursors",
    ndt: "In-situ Metallography (Replication) to detect micro-fissuring, High-Temperature AUT thickness mapping"
},
{
    circuitId: "15-Ckt-02",
    boundary: "Hot Separator Bottoms (Recycle Liquid)",
    phase: "Hot Heavy Liquid",
    basis: "Heavy Liquid Phase Separation: Hot unvaporized VGO liquid separates from the gas phase while maintaining elevated temperature and sulfidation risk.",
    damage: "Sulfidation, Erosion",
    ndt: "UTM at letdown valves, reducers and piping extrados"
}
],
    "RPTU-PL-16": [
{
    circuitId: "16-Ckt-01",
    boundary: "Wash Water Injection Point (Mix Tee / Quill)",
    phase: "Vapor + Injected Liquid Water",
    basis: "Thermal Shock & Atomization: Physical intersection where relatively cold wash water is injected into hot HDT effluent vapor causing rapid thermal cycling and localized turbulent erosion.",
    damage: "Thermal Fatigue, Under Deposit Corrosion",
    ndt: "RT (Radiography) profiling at the injection quill, PAUT/TOFD at the mixing tees"
},
{
    circuitId: "16-Ckt-02",
    boundary: "HDT REAC (1P31-EA-2652) Inlet Header and Tubes",
    phase: "Condensing Sour Water (High Velocity)",
    basis: "Salt Sublimation & Condensation: Exact thermal boundary where NH4HS precipitates into the aqueous phase causing aggressive localized scouring and under-deposit attack inside air cooler tubes.",
    damage: "Severe NH4HS Corrosion, Erosion",
    ndt: "IRIS/ECT for internal tube inspection, heavily clustered UTM grids on inlet headers"
},
{
    circuitId: "16-Ckt-03",
    boundary: "REAC Outlet Header to Cold Separator",
    phase: "Liquid Hydrocarbon + Aqueous Sour Water",
    basis: "Aqueous Sour Environment: Post-cooling zone where sour water is fully formed with high dissolved H2S and NH3 concentration creating hydrogen blistering risk.",
    damage: "Wet H2S (HIC/SOHIC), NH4HS Corrosion",
    ndt: "WFMPT for cracking on welds, Advanced UT for blistering, standard UTM"
}
],
    "RPTU-PL-17": [
{
    circuitId: "17-Ckt-01",
    boundary: "Fractionator Top Vapor Line to Condensers",
    phase: "Vapor + Steam + Trace Chlorides",
    basis: "Aqueous Dew Point Zone: Section where vapor temperature decreases enough for steam condensation, dissolving salts and forming highly corrosive acidic droplets.",
    damage: "NH4Cl Under-deposit, Aqueous HCl Corrosion, Wet H2S",
    ndt: "PAUT at water condensation points and impingement zones, UTM thickness tracking"
},
{
    circuitId: "17-Ckt-02",
    boundary: "Reflux Drum (1P31-VV-1231) and Water Boot",
    phase: "Sour Water + Light HC Liquid",
    basis: "Aqueous Phase Accumulation: Low-point collection vessel where condensed sour water separates from light hydrocarbon concentrating dissolved H2S and promoting hydrogen permeation into steel.",
    damage: "Wet H2S (HIC/SOHIC)",
    ndt: "Advanced UT (for blistering mapping), WFMPT on shell welds, Hardness testing"
}
],
    "RPTU-PL-18": [
{
    circuitId: "18-Ckt-01",
    boundary: "Naphtha Stabilizer Overhead Condensers & Reflux Drum",
    phase: "Vapor / Light Liquid + Sour Water",
    basis: "Low-Temperature Separation: Fractionation of light ends where residual sour water condenses, maintaining Wet H2S cracking susceptibility at the stabilizer overhead section.",
    damage: "Wet H2S (HIC/SOHIC), Aqueous Corrosion",
    ndt: "Advanced UT (for blistering), WFMPT on shell and nozzle welds"
},
{
    circuitId: "18-Ckt-02",
    boundary: "Stabilized Naphtha Rundown to OSBL Storage",
    phase: "Cold Light Liquid",
    basis: "Sweet Product Transport: Stabilized and cooled product transfer line where sour species are largely removed and only trace internal thinning or atmospheric degradation remains.",
    damage: "General Thinning",
    ndt: "Standard UTM at established Condition Monitoring Locations (CMLs)"
}
],
    "RPTU-PL-19": [
{
    circuitId: "19-Ckt-01",
    boundary: "Diesel Product Pumps to Rundown Coolers",
    phase: "Hot Diesel Liquid",
    basis: "Velocity-Accelerated Hot Flow: Pumping of uncooled diesel where elevated temperature (>230°C) and increased flow velocity strip protective scales and accelerate sulfidation.",
    damage: "Sulfidation, Erosion",
    ndt: "UTM at pump casings, discharge elbows, and reducers"
},
{
    circuitId: "19-Ckt-02",
    boundary: "Cooled Diesel Rundown to OSBL Storage",
    phase: "Warm/Cold Diesel",
    basis: "Post-Cooling Transport: Section downstream of the coolers where fluid temperature drops below the active sulfidation threshold significantly reducing corrosion severity.",
    damage: "General Thinning",
    ndt: "Standard UTM"
}
],
   "RPTU-PL-20": [
{
    circuitId: "20-Ckt-01",
    boundary: "VGO Pumparound and Product Coolers",
    phase: "Hot Heavy Liquid",
    basis: "High-Temperature Heat Exchange: High thermal-flux cooling areas where hot VGO service promotes sulfidic attack and heavy organic deposition inside exchangers and connected piping.",
    damage: "High-Temp Sulfidation, Fouling",
    ndt: "High-Temp UT on piping, continuous monitoring of heat exchanger pressure drops"
},
{
    circuitId: "20-Ckt-02",
    boundary: "VGO Rundown to Battery Limit",
    phase: "Warm Heavy Liquid",
    basis: "Cooled Heavy Transport: Downstream transfer section where VGO temperature is sufficiently reduced, arresting active high-temperature corrosion mechanisms.",
    damage: "General Thinning",
    ndt: "Standard UTM"
}
],
   "RPTU-PL-21": [
{
    circuitId: "21-Ckt-01",
    boundary: "Vacuum Column Bottoms line to Slurry Pumps suction",
    phase: "Extremely Hot Heavy Liquid",
    basis: "High-Residence Thermal Degradation: Low-velocity extreme temperature suction zone where heavy hydrocarbons undergo thermal cracking causing localized coke build-up.",
    damage: "High-Temp Sulfidation, Coking, Heavy Fouling",
    ndt: "High-Temp UT on piping, Infrared (IR) Thermography on pipe surfaces to detect internal coke blockage"
},
{
    circuitId: "21-Ckt-02",
    boundary: "Slurry Pumps Discharge lines and rundown cooler inlets",
    phase: "High-Pressure Heavy Slurry",
    basis: "High-Velocity Abrasive Scouring: Pressurized discharge zone where high velocities combined with suspended catalyst particles and coke fines create severe metal wall scouring.",
    damage: "Severe Catalyst Erosion, High-Temp Sulfidation",
    ndt: "Strict UTM thickness monitoring on pump volutes, discharge bends, and piping extrados"
}
], 
    "RPTU-PL-22": [
{
    circuitId: "22-Ckt-01",
    boundary: "Recycle Slurry Pumps and high-pressure discharge headers",
    phase: "Hot Liquid + Catalyst Fines",
    basis: "Pressurized Slurry Recycling: Continuous turbulent recycling of hot slurry under high dynamic stress causing combined sulfidation and physical erosion attack.",
    damage: "Erosion-Corrosion, High-Temp Sulfidation",
    ndt: "Profile Radiography (RT) at tees and elbows to measure localized erosion, continuous UTM mapping"
},
{
    circuitId: "22-Ckt-02",
    boundary: "Letdown Valves and Restriction Orifices in Slurry lines",
    phase: "Mixed-Phase Flashing",
    basis: "Extreme Pressure Drop / Cavitation: High-velocity pressure reduction zone where flashing fluid creates severe cavitation, impingement, and rapid localized wall loss.",
    damage: "Severe Cavitation, Localized Erosion",
    ndt: "Specialized RT across valve bodies and downstream spools, regular physical replacement schedules"
}
],
    "RPTU-PL-23": [
{
    circuitId: "23-Ckt-01",
    boundary: "Off Gas K.O. Drums (1P30-VV-1731) and associated vapor piping",
    phase: "Sour Gas",
    basis: "Vapor Phase Transport: Continuous gas flow section where corrosion is generally minimal unless liquid carryover or localized condensation occurs in dead legs.",
    damage: "Wet H2S (HIC/SOHIC), General Thinning",
    ndt: "Standard UTM at established inspection points"
},
{
    circuitId: "23-Ckt-02",
    boundary: "K.O. Drum Liquid Boots and low-point drain headers",
    phase: "Sour Water + Light Liquid",
    basis: "Aqueous Low-Point Pooling: Low-point accumulation areas where condensed sour water collects creating sustained localized corrosion and hydrogen permeation risks.",
    damage: "Wet H2S, Localized Pitting",
    ndt: "UTM focused strictly on the 6 o'clock position (bottom of pipe), WFMPT on drum bottom nozzle welds"
}
],
    "RPTU-PL-24": [
{
    circuitId: "24-Ckt-01",
    boundary: "Sour Water Surge Drum and Low-Pressure Collection Headers",
    phase: "Sour Water (High NH3 + H2S)",
    basis: "Low-Velocity Aqueous Collection: Low-stress continuous sour water collection zone where dissolved H2S and NH3 remain concentrated, causing steady sour corrosion and hydrogen-related damage in carbon steel.",
    damage: "Sour Water Corrosion, Wet H2S Damage",
    ndt: "Standard UTM thickness monitoring on vessel walls and straight piping runs"
},
{
    circuitId: "24-Ckt-02",
    boundary: "Sour Water Transfer Pumps and High-Turbulence Piping Sections",
    phase: "Pressurized Sour Water",
    basis: "Turbulent Dissolution Accelerated Flow: Pumping and turbulence zone where high velocity near valves, bends and tees breaks protective films, accelerating localized wall thinning.",
    damage: "NH4HS Corrosion, Erosion",
    ndt: "Clustered UTM grids at elbows, downstream of control valves and branching tees, RT profiling"
}
],
    "RPTU-PL-25": [
{
    circuitId: "25-Ckt-01",
    boundary: "Lean Amine Charge Pumps and Distribution Headers",
    phase: "Clean / Lean Amine Solution",
    basis: "High-Velocity Mechanical Transport: Pressurized lean amine supply section where elevated flow velocity may strip passive films, increasing susceptibility to localized amine erosion-corrosion near high turbulence areas.",
    damage: "Amine Corrosion, Localized Velocity Erosion",
    ndt: "UTM focused on the outer radius of elbows and downstream of pump discharge check valves"
},
{
    circuitId: "25-Ckt-02",
    boundary: "Amine Heat Exchangers / Coolers",
    phase: "Shell / Tube Amine Flow",
    basis: "Thermal Transition Boundary: Heat exchanger sections where amine temperature changes alter chemical activity and increase localized thinning tendency, especially on hot-side surfaces.",
    damage: "Amine Corrosion",
    ndt: "Specialized UT mapping on exchanger nozzles, internal visual inspections during shutdowns"
}
],
"RPTU-PL-26": [
{
    circuitId: "26-Ckt-01",
    boundary: "Absorber Bottom Rundown Lines to the Rich Amine Flash Drum (1P31-VV-9631)",
    phase: "Loaded Liquid Amine",
    basis: "High-Pressure Rich Solution: Pressurized liquid amine carrying maximum dissolved acid gas loading under stable flow conditions prior to flashing, creating elevated corrosion susceptibility due to concentrated H2S content.",
    damage: "Amine Corrosion, Wet H2S Damage",
    ndt: "Heavily clustered UTM grids on piping runs, PAUT on structural weld seams"
},
{
    circuitId: "26-Ckt-02",
    boundary: "Letdown Control Valves and Downstream Piping to the Regenerator",
    phase: "Two-Phase Flashing Amine",
    basis: "Pressure Drop & Gas Flashing: High-shear depressurization zone where dissolved H2S flashes from solution, generating severe turbulence, slug flow and localized cavitation damage.",
    damage: "Severe Amine Erosion-Corrosion, Wet H2S (HIC/SOHIC)",
    ndt: "RT profiling across control valve bodies and downstream spools, specialized UT mapping on elbows"
}
],
    "RPTU-PL-27": [
{
    circuitId: "27-Ckt-01",
    boundary: "Regenerator Overhead Vapor Line to Condenser Inlets",
    phase: "Hot Acid Gas + Steam",
    basis: "High-Temperature Vapor Stripping: High-temperature low-pressure vapor phase carrying concentrated H2S and steam before condensation occurs, maintaining elevated corrosion susceptibility in the vapor transport system.",
    damage: "Amine Corrosion, Wet H2S",
    ndt: "Standard UTM thickness monitoring, regular visual inspection during turnarounds"
},
{
    circuitId: "27-Ckt-02",
    boundary: "Overhead Condenser Outlets, Reflux Drum and Water Boot",
    phase: "Condensing Sour Water + Acid Gas",
    basis: "Aqueous Condensation Phase: Thermal dew-point boundary where steam condenses into liquid sour water enriched with dissolved H2S, creating a highly aggressive low-pH corrosion environment.",
    damage: "Wet H2S (Severe HIC/SOHIC/SSC), Sour Water Corrosion",
    ndt: "Advanced UT for internal blistering mapping, Wet Fluorescent MPI (WFMPT) on internal column and drum welds"
}
],
    "RPTU-PL-28": [
{
    circuitId: "28-Ckt-01",
    boundary: "Acid Gas K.O. Drum to SRU Battery Limit Piping",
    phase: "Saturated H2S Gas",
    basis: "Pure Acid Gas Transport: Saturated acid gas vapor transport section where corrosion remains controlled under stable insulated conditions, provided dew-point condensation is avoided.",
    damage: "Wet H2S Damage, Sour Water Corrosion",
    ndt: "Standard UTM, specialized UT scans at the 6 o'clock piping position"
},
{
    circuitId: "28-Ckt-02",
    boundary: "Acid Gas Line Dead-Legs, Low-Points and Bypass Manifolds",
    phase: "Condensation Drop-out",
    basis: "Stagnant Ambient Condensation: Low-flow or stagnant sections where temperature reduction causes moisture dropout, forming highly concentrated sour water films and localized corrosive attack.",
    damage: "Sulfide Stress Cracking (SSC), HIC, Severe Pitting",
    ndt: "High-density UTM mapping at low points, RT profiling on small-bore valve connections"
}
],
    "RPTU-PL-29": [
{
    circuitId: "29-Ckt-01",
    boundary: "Hydrocarbon Blowdown Headers to the Closed Blowdown Drum",
    phase: "Intermittent Mixed Phase",
    basis: "Transient Thermal Shocks: Blowdown piping network subjected to severe temperature cycling during emergency or operational hydrocarbon dumping, causing thermal stress, sour condensation and intermittent mixed-phase corrosion exposure.",
    damage: "Wet H2S, Thermal Fatigue, CUI",
    ndt: "UTM at the bottom half of headers, comprehensive Visual / Visual-Thru-Insulation (CUI) inspection campaigns"
},
{
    circuitId: "29-Ckt-02",
    boundary: "Heavy Closed Blowdown Drum (1P30-VV-6632) Shell and Pumps",
    phase: "Sour Slop Liquid + Vapor",
    basis: "Static Slop Accumulation: Low-pressure accumulation zone where heavy hydrocarbons, light ends and sour water settle into stagnant stratified layers, promoting localized sour corrosion and hydrogen-related damage.",
    damage: "Wet H2S (HIC/SOHIC), General Thinning",
    ndt: "Advanced UT for shell blistering, WFMPT on internal welds during turnaround"
}
],
    "RPTU-PL-30": [
{
    circuitId: "30-Ckt-01",
    boundary: "PSV Discharge Sub-Headers to the Main Flare Header",
    phase: "Atmospheric Stagnant Gas",
    basis: "Stagnant Relief Matrix: Normally inactive low-pressure relief header susceptible to localized sour gas accumulation and moisture condensation due to PSV seat leakage or environmental cooling.",
    damage: "Wet H2S, Localized Pitting, CUI",
    ndt: "Long-Range Ultrasonic Testing (LRUT) for screening, standard UTM on the 6 o'clock position"
},
{
    circuitId: "30-Ckt-02",
    boundary: "Main Flare K.O. Drum (1P30-VV-4132) and Header Low-Points",
    phase: "Condensate Liquid + Gas",
    basis: "Low-Point Liquid Trap: Terminal knock-out section where condensed hydrocarbons and sour water accumulate, creating localized corrosive attack at liquid-vapor interface regions.",
    damage: "Sour Water Corrosion, Wet H2S Damage",
    ndt: "UTM profiling on the bottom shell, Automated UT (AUT) thickness mapping on the liquid-vapor interface line"
}
],
    "RPTU-PL-31": [
{
    circuitId: "31-Ckt-01",
    boundary: "Vacuum Feed Furnace (1P30-FF-2181) Transfer Line to Column Flash Zone",
    phase: "Mixed-Phase (Extreme Velocity)",
    basis: "High-Velocity Thermal Flash: High-temperature transfer section operating under vacuum where heavy hydrocarbon feed undergoes flashing at elevated velocity, causing severe turbulence and localized impingement near bends and flash zones.",
    damage: "High-Temp Sulfidation, Erosion",
    ndt: "Heavily mapped UTM grids at piping bends, elbows and adjacent shell flash-zones"
},
{
    circuitId: "31-Ckt-02",
    boundary: "Vacuum Column Top Shell and Ejector Vapor Lines",
    phase: "Vapor + Continuous Steam",
    basis: "Vacuum Condensation Boundary: Upper cooler section of the vacuum system where steam and light vapors move toward ejectors, increasing susceptibility to localized external corrosion and moisture accumulation under insulation.",
    damage: "Corrosion Under Insulation (CUI), General Thinning",
    ndt: "Comprehensive Visual Inspection (VT) for CUI behind insulation, profile RT on small-bore lines"
}
],
    "RPTU-PL-32": [
{
    circuitId: "32-Ckt-01",
    boundary: "Diesel Stripper (1P31-CC-2828) Overhead Vapor Line to Condensers",
    phase: "Vapor + Steam + H2S",
    basis: "Aqueous Condensation Node: Overhead stripping vapor section where steam and trace contaminants condense, forming localized corrosive aqueous environments and pitting-prone deposits.",
    damage: "Wet H2S Damage, NH4Cl Under-deposit",
    ndt: "PAUT at water condensation points, high-density UTM thickness tracking on overhead piping spools"
},
{
    circuitId: "32-Ckt-02",
    boundary: "Stripper Column Shell and Bottoms Rundown Piping",
    phase: "Hot Diesel Liquid",
    basis: "Hot Hydrocarbon Stripping: High-temperature diesel liquid section where thermally active sulfur compounds continue promoting steady sulfidic wall thinning before product cooling.",
    damage: "High-Temp Sulfidation",
    ndt: "Standard UTM at established Condition Monitoring Locations (CMLs)"
}
],
    "RPTU-PL-33": [
{
    circuitId: "33-Ckt-01",
    boundary: "Absorber Column Shell and Internal Tray Sections",
    phase: "Gas + Liquid Amine Interface",
    basis: "High-Pressure Sour Amine Matrix: High-pressure absorber shell section where sour amine and hydrogen-rich gas interact under elevated stress, promoting hydrogen diffusion and cracking susceptibility in carbon steel boundaries.",
    damage: "Wet H2S Damage (HIC/SOHIC), Amine SCC",
    ndt: "Wet Fluorescent MPI (WFMPT) on internal column weld seams during turnaround, Automated UT (AUT) on shell plates"
},
{
    circuitId: "33-Ckt-02",
    boundary: "Absorber Gas Inlet and Sweetened Gas Overhead Piping",
    phase: "High-Pressure Sour / Sweet Gas",
    basis: "High-Velocity Gas Boundaries: High-pressure gas transport circuits handling hydrogen-rich sour and sweet gas streams where liquid carryover or turbulence may trigger localized thinning or erosion.",
    damage: "Wet H2S (Inlet), General Thinning",
    ndt: "Advanced UT for internal mapping, standard UTM thickness monitoring on piping elbows"
}
],
    "RPTU-PL-34": [
{
    circuitId: "34-Ckt-01",
    boundary: "Fresh Catalyst Transport lines and Addition Pot (1P30-VV-8932)",
    phase: "Solid Catalyst + Transport Oil",
    basis: "Abrasive Solid Transport: High-pressure transport line handling solid catalyst extrudates where dynamic flow redirections create aggressive mechanical wall thinning.",
    damage: "Particulate Erosion, Under Deposit Corrosion",
    ndt: "Profile Radiography (RT) at piping elbows, bends, and target tees to quantify localized wear"
},
{
    circuitId: "34-Ckt-02",
    boundary: "Spent Catalyst Withdrawal lines and De-Oiling Bins (1P30-VV-8935A/B)",
    phase: "Hot Oil + Spent Catalyst Slurry",
    basis: "High-Temperature Slurry Extraction: High-temperature withdrawal boundary handling coke-coated spent catalyst slurry causing severe mechanical erosion and thermal sulfidation.",
    damage: "Severe Erosion, High-Temp Sulfidation, Fouling",
    ndt: "Localized High-Temp UT scans, profile RT across withdrawal control valves and restriction spools"
}
]
};

const damageMechanismLogic = {

    "HTHA": {
    criteria:
    "Applicable because the make-up hydrogen section handles high-pressure hydrogen service at elevated temperature and very high hydrogen partial pressure. As per API 941 Nelson Curve, carbon steel exposed to hot hydrogen service may suffer hydrogen attack if metallurgy and operating envelope are not maintained.",

    concern:
    "Hydrogen diffusion into steel causing decarburization, fissuring, blistering and reduction in mechanical strength of pressure boundary materials.",

    mitigation:
    "Verify operating pressure-temperature limits against API 941 Nelson Curve, ensure suitable Cr-Mo metallurgy where required, maintain hydrogen purity and monitor susceptible welds and pressure boundaries using AUBT/PAUT inspection."
},

    "H2 Embrittlement": {
        criteria: "Applicable in high-pressure hydrogen service where atomic hydrogen diffuses into steel, particularly at welds and high-stress regions.",
        concern: "Crack initiation, loss of ductility and brittle failure.",
        mitigation: "Use suitable metallurgy, control hardness, ensure PWHT for welds and monitor cracking in stressed areas."
    },

    "Wet H2S": {
        criteria: "Applicable where H2S is present in wet/condensing service, especially downstream cooling or separator systems.",
        concern: "Sulfide Stress Cracking (SSC), Hydrogen Induced Cracking (HIC) and localized corrosion.",
        mitigation: "Maintain hardness below 200 BHN, apply PWHT where required and follow NACE MR0175 material requirements."
    },

    "HIC/SOHIC": {
        criteria: "Applicable in wet H2S environments under high pressure where hydrogen permeation into carbon steel occurs.",
        concern: "Stepwise internal cracking and weld-related cracking.",
        mitigation: "Use HIC-resistant steel plates and monitor weld zones through UT/PAUT."
    },

    "NH4HS": {
        criteria: "Applicable in reactor effluent cooling sections where NH3 and H2S combine below salt dew point forming ammonium bisulfide.",
        concern: "High corrosion rates, wall thinning, under-deposit corrosion and localized attack in REAC systems.",
        mitigation: "Maintain wash water quality and velocity, keep NH4HS concentration under control and monitor injection effectiveness."
    },

    "NH4Cl": {
        criteria: "Applicable in overhead systems where chlorides combine with ammonia at low temperatures causing ammonium chloride salt deposition.",
        concern: "Severe under-deposit corrosion and localized attack after salt deposition.",
        mitigation: "Control chloride ingress, maintain wash water effectiveness and monitor overhead temperature profile."
    },

    "Sulfidation": {
        criteria: "Applicable in sulfur-containing hydrocarbon streams operating above ~450°F (230°C). Sulfur reacts with carbon steel causing accelerated metal loss.",
        concern: "General wall thinning and localized high-temperature corrosion.",
        mitigation: "Upgrade metallurgy (5Cr, 9Cr, SS as required), corrosion monitoring and RBI thickness tracking."
    },

    "Fouling": {
        criteria: "Applicable in heavy hydrocarbon sections containing CCR, asphaltenes, coke precursors and catalyst fines.",
        concern: "Deposit formation causing heat transfer loss, under-deposit corrosion and flow restriction.",
        mitigation: "Optimize operating temperature, periodic decoking/cleaning and monitor pressure drop."
    },

    "Coking": {
        criteria: "Applicable in high-temperature heater and heavy resid sections where thermal cracking occurs.",
        concern: "Tube overheating, flow restriction and accelerated degradation.",
        mitigation: "Control heater skin temperature and monitor tube metal temperature regularly."
    },

    "Erosion": {
        criteria: "Applicable in high velocity streams or catalyst fines/slurry carrying service.",
        concern: "Localized wall loss especially at elbows, reducers and impingement areas.",
        mitigation: "Velocity control, wear-resistant metallurgy and thickness monitoring at susceptible locations."
    },

    "Under Deposit": {
        criteria: "Applicable where solids, salts or fouling deposits accumulate.",
        concern: "Localized corrosion beneath deposits due to concentration cells.",
        mitigation: "Maintain wash water quality, periodic cleaning and monitor fouling tendency."
    },

    "Sour Water": {
        criteria: "Applicable where water contains dissolved H2S and NH3, particularly separator and stripper systems.",
        concern: "Localized corrosion, cracking and accelerated metal loss.",
        mitigation: "Control water chemistry, maintain pH and inspect corrosion-prone zones."
    },

    "Amine": {
        criteria: "Applicable in MDEA absorber/regenerator systems handling acid gas.",
        concern: "Amine corrosion, localized grooving and acid gas related attack.",
        mitigation: "Control amine concentration, temperature, heat stable salts and corrosion monitoring."
    },

    "SSC/HIC": {
        criteria: "Applicable in wet H2S acid gas sections under stress.",
        concern: "Hydrogen induced cracking and sulfide stress cracking.",
        mitigation: "NACE compliant metallurgy, hardness control and weld inspection."
    },

    "FAC": {
        criteria: "Applicable in steam/condensate systems with high velocity low oxygen water.",
        concern: "Accelerated wall thinning in carbon steel piping.",
        mitigation: "Use Cr alloy steels and monitor thickness at elbows and reducers."
    }
};

    let currentData = [];

    window.onload = function() { renderFeedTable(); };

    function switchView(view, btnElement) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
        
        if(btnElement) btnElement.classList.add('active');

        if (view === 'overview') document.getElementById('overview').classList.add('active');
        else if (view === 'plant-info') document.getElementById('plant-info').classList.add('active');
        else if (view === 'loop-basis') document.getElementById('loop-basis').classList.add('active');
        else if (view === 'feed-assays') { document.getElementById('feed-assays').classList.add('active'); renderFeedTable(); }
        else if (view === 'guidelines') document.getElementById('guidelines').classList.add('active');
        else if (view === 'dm-matrix') document.getElementById('dm-matrix').classList.add('active');
        else if (view === 'process') { document.getElementById('database').classList.add('active'); document.getElementById('db-title').innerText = "Process Corrosion Loops"; currentData = processData; renderGrid(currentData); }
        else if (view === 'utility') { document.getElementById('database').classList.add('active'); document.getElementById('db-title').innerText = "Utility Corrosion Loops"; currentData = utilityData; renderGrid(currentData); }
        else if (view === 'mitigation') { document.getElementById('mitigation').classList.add('active'); renderMitigations(); }
    }

    function renderFeedTable() {
        const feedId = document.getElementById('feedSelector').value;
        const feed = feedData[feedId];
        if (feed.isDesignTable) {

    let headerRow = feed.columns
        .map(col => `<th>${col}</th>`)
        .join('');

    let bodyRows = feed.rows
        .map(row => `
            <tr>
                ${row.map(col => `<td>${col}</td>`).join('')}
            </tr>
        `)
        .join('');

    document.getElementById('feed-details-container').innerHTML = `
        <h3>${feed.title}</h3>
        <p><strong>Primary Target:</strong> ${feed.target}</p>
        <p><em>${feed.desc}</em></p>

        <table>
            <thead>
                <tr>${headerRow}</tr>
            </thead>
            <tbody>
                ${bodyRows}
            </tbody>
        </table>
    `;

    return;
        }
        let rows = '';
        feed.props.forEach(p => {
            let valClass = p.alert ? 'alert-text' : '';
            let riskClass = p.alert ? 'alert-text' : (p.risk !== 'None' && p.risk !== 'Low' ? 'warn-text' : '');
            rows += `<tr><td><strong>${p.name}</strong></td><td class="${valClass}">${p.val}</td><td class="${riskClass}">${p.risk}</td></tr>`;
        });
        document.getElementById('feed-details-container').innerHTML = `
            <h3 style="margin-top: 0;">${feed.title}</h3>
            <p><strong>Primary Target:</strong> ${feed.target}</p>
            <p><em>${feed.desc}</em></p>
            <table><thead><tr><th>Property</th><th>Typical Range</th><th>Corrosion / Operational Impact</th></tr></thead><tbody>${rows}</tbody></table>
        `;
    }

function renderGrid(data) {

    const grid = document.getElementById('loopGrid');
    grid.innerHTML = '';

    data.forEach(item => {

        const card = document.createElement('div');
        card.className = 'card';

        // Loop card click
        card.onclick = () => openModal(item);

        // Damage Mechanism tags clickable
        let tagsHtml = item.mechs.map(m => {

            let colorClass = '';

            if(m.includes('HTHA'))
                colorClass = 'htha';

            else if(m.includes('Wet H2S'))
                colorClass = 'wet-h2s';

            else if(m.includes('Sulfidation'))
                colorClass = 'sulfidation';

            else if(m.includes('NH4HS'))
                colorClass = 'nh4hs';

            else if(m.includes('FAC'))
                colorClass = 'fac';

            return `
                <span
                    class="tag ${colorClass}"
                    onclick="event.stopPropagation(); openMechanismModal('${m}')"
                    style="cursor:pointer;"
                >
                    ${m}
                </span>
            `;

        }).join('');

        card.innerHTML = `
            <div class="card-id">
                ${item.id}
            </div>

            <div class="card-name">
                ${item.name}
            </div>

            <div class="tag-container">
                ${tagsHtml}
            </div>
        `;

        grid.appendChild(card);
    });
}
function openMechanismModal(mech) {

    const info = damageMechanismLogic[mech];

    if(!info) return;

    document.getElementById('modal-title').innerText =
        mech + " Damage Mechanism";

    let bodyHtml = `
        <div style="
            padding:16px;
            background:#f8fafc;
            border-radius:10px;
            border-left:5px solid #0056b3;
        ">

            <h3 style="
                color:#0056b3;
                margin-top:0;
            ">
                ${mech}
            </h3>

            <div style="margin-bottom:12px;">
                <b>Why Applicable:</b><br>
                ${info.criteria}
            </div>

            <div style="margin-bottom:12px;">
                <b>Damage Concern:</b><br>
                ${info.concern}
            </div>

            <div>
                <b>Mitigation / Inspection Focus:</b><br>
                ${info.mitigation}
            </div>

        </div>
    `;

    document.getElementById('modal-body').innerHTML =
        bodyHtml;

    document.getElementById('mitigation-modal').style.display =
        'flex';
                  }


    function filterData() {
        const searchText = document.getElementById('searchInput').value.toLowerCase();
        const mechFilter = document.getElementById('mechFilter').value;
        const filtered = currentData.filter(item => {
            return (item.id.toLowerCase().includes(searchText) || item.name.toLowerCase().includes(searchText)) &&
                   (mechFilter === "All" || item.mechs.some(m => m.includes(mechFilter)));
        });
        renderGrid(filtered);
    }


function openModal(item) {

    document.getElementById('modal-title').innerText =
        item.id + " : " + item.name;

    const loopInfo = loopEngineeringBasis[item.id];
    const circuits = loopCircuits[item.id];
    const op = operatingParameters[item.id];

    let bodyHtml = `

    <div style="
        background:#eef5ff;
        padding:16px;
        border-radius:10px;
        margin-bottom:20px;
        border-left:5px solid #0056b3;
    ">

        <h3 style="
            margin-top:0;
            color:#0056b3;
        ">
            Corrosion Loop Basis
        </h3>

        <div style="margin-bottom:12px;">
            <b>Corrosion Loop Description:</b><br>
            ${loopInfo?.service || "Not Defined"}
        </div>

        <div style="margin-bottom:12px;">
            <b>Loop Segregation Basis:</b><br>
            ${loopInfo?.segregation || "Not Defined"}
        </div>

    </div>

    <div style="
        background:#ffffff;
        border:1px solid #dbeafe;
        border-radius:10px;
        padding:16px;
        margin-bottom:20px;
    ">

        <h3 style="
            margin-top:0;
            color:#0056b3;
        ">
            Operating Parameters
        </h3>

        <table style="
            width:100%;
            border-collapse:collapse;
        ">

            <tr>
    <td style="padding:10px;border:1px solid #ddd;">
        <b>Operating Temperature</b>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
        ${op?.temperature || "Not Defined"}
    </td>
</tr>

<tr>
    <td style="padding:10px;border:1px solid #ddd;">
        <b>Operating Pressure</b>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
        ${op?.pressure || "Not Defined"}
    </td>
</tr>

<tr>
    <td style="padding:10px;border:1px solid #ddd;">
        <b>Process Fluid</b>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
        ${op?.fluid || "Not Defined"}
    </td>
</tr>

<tr>
    <td style="padding:10px;border:1px solid #ddd;">
        <b>Stream Phase</b>
    </td>
    <td style="padding:10px;border:1px solid #ddd;">
        ${op?.phase || "Not Defined"}
    </td>
</tr>

        </table>

    </div>

    <div style="
        background:#ffffff;
        border:1px solid #dbeafe;
        border-radius:10px;
        padding:16px;
        margin-bottom:20px;
    ">

        <h3 style="
            margin-top:0;
            color:#0056b3;
        ">
            Damage Mechanisms
        </h3>

        <div style="margin-bottom:10px;">
            <b>Primary Damage Mechanisms:</b><br>
            ${item.mechs.join(", ")}
        </div>

        <div>
            <b>Secondary Damage Mechanisms:</b><br>
            Mechanical Fatigue / Vibration
        </div>

    </div>

    <div style="
        background:#ffffff;
        border:1px solid #dbeafe;
        border-radius:10px;
        padding:16px;
        margin-bottom:20px;
    ">

        <h3 style="
            margin-top:0;
            color:#0056b3;
        ">
            Corrosion Rate as per API 581
        </h3>

        <div style="margin-bottom:8px;">
            <b>Estimated Internal CR:</b>
            0.025 mm/year
            <br>
            <small>
            (Assumption for baseline calculation of general corrosion rate)
            </small>
        </div>

        <div style="margin-bottom:8px;">
            <b>Estimated External CR (Insulated Assets):</b>
            0.076 mm/year
        </div>

        <div>
            <b>Estimated External CR (Non-Insulated Assets):</b>
            0.025 mm/year
        </div>

    </div>
    `;

    // ==========================
    // Circuit Details
    // ==========================

    if (circuits && circuits.length > 0) {

        bodyHtml += `

        <div style="
            margin-bottom:20px;
            background:#fff;
            border-radius:10px;
            padding:14px;
            border:1px solid #dbeafe;
        ">

            <h3 style="
                color:#0056b3;
                margin-top:0;
            ">
                Circuit Details
            </h3>

            <div style="overflow-x:auto;">

                <table style="
                    width:100%;
                    border-collapse:collapse;
                    font-size:14px;
                ">

                    <thead>
                        <tr style="
                            background:#0056b3;
                            color:white;
                        ">
                            <th style="padding:10px;">
                                Circuit ID
                            </th>

                            <th style="padding:10px;">
                                Boundary / Equipment
                            </th>

                            <th style="padding:10px;">
                                Process Phase
                            </th>

                            <th style="padding:10px;">
                                Segregation Basis
                            </th>

                            <th style="padding:10px;">
                                NDT Strategy
                            </th>
                        </tr>
                    </thead>

                    <tbody>

                        ${circuits.map(c => `
                        <tr>

                            <td style="padding:10px;border:1px solid #ddd;">
                                ${c.circuitId}
                            </td>

                            <td style="padding:10px;border:1px solid #ddd;">
                                ${c.boundary}
                            </td>

                            <td style="padding:10px;border:1px solid #ddd;">
                                ${c.phase}
                            </td>

                            <td style="padding:10px;border:1px solid #ddd;">
                                ${c.basis}
                            </td>

                            <td style="padding:10px;border:1px solid #ddd;">
                                ${c.ndt}
                            </td>

                        </tr>
                        `).join('')}

                    </tbody>

                </table>

            </div>

        </div>
        `;
    }

    // ==========================
    // Suggested Inspection
    // ==========================

    bodyHtml += `

    <div style="
        background:#ffffff;
        border:1px solid #dbeafe;
        border-radius:10px;
        padding:16px;
    ">

        <h3 style="
            margin-top:0;
            color:#0056b3;
        ">
            Suggested Inspection Techniques
        </h3>

        <ul style="padding-left:20px; line-height:1.8;">

            <li>
                UTG for Piping > 2-inch diameter
            </li>

            <li>
                Profile RT for Piping < 2-inch diameter
                and dead legs
            </li>

            <li>
                UTG of exchanger shell, channel and vessel
            </li>

            <li>
                Visual Inspection for CUI
            </li>

        </ul>

    </div>
    `;

    document.getElementById('modal-body').innerHTML =
        bodyHtml;

    document.getElementById('mitigation-modal').style.display =
        'flex';
}

    

    function renderMitigations() {
        const grid = document.getElementById('mitigationGrid');
        grid.innerHTML = '';
        Object.keys(mitigationGuide).forEach(key => {
            grid.innerHTML += `<div class="card" style="cursor: default;"><div class="card-name" style="color:var(--primary); font-weight:bold;">${key}</div><div style="font-size:0.9rem; color:#475569;">${mitigationGuide[key]}</div></div>`;
        });
    }
