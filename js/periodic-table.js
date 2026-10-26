/**
 * ⚛️ KayetDMS Periodic Table of Elements & 3D Bohr Atom Visualizer
 * Fully responsive IUPAC 118-element interactive database with 3D Bohr model.
 */
(function () {
  "use strict";

  // Categories mapping
  const CATEGORIES = {
    "alkali-metal": { name: "Alkali metals", color: "#0284c7" },
    "alkaline-earth": { name: "Alkaline earth metals", color: "#b91c1c" },
    "transition-metal": { name: "Transition metals", color: "#2b394f" },
    "post-transition": { name: "Post-transition metals", color: "#15803d" },
    "metalloid": { name: "Metalloids", color: "#b45309" },
    "reactive-nonmetal": { name: "Reactive non-metals", color: "#1e40af" },
    "noble-gas": { name: "Noble gases", color: "#881337" },
    "lanthanide": { name: "Lanthanides", color: "#0369a1" },
    "actinide": { name: "Actinides", color: "#7c2d12" },
    "unknown": { name: "Unknown properties", color: "#374151" }
  };

  // Compact database: [number, symbol, name, mass, category, period, group, shells, config, mpK, bpK, density, eneg, phase, discDate, discBy, summary, industrial]
  const RAW_ELEMENTS = [
    [1, "H", "Hydrogen", 1.008, "reactive-nonmetal", 1, 1, [1], "1s¹", 14, 20, 0.00008988, 2.20, "Gas", 1766, "Henry Cavendish", "Hydrogen is the chemical element with the symbol H and atomic number 1. It is the lightest element and the most abundant chemical substance in the Universe.", "Crucial in hydroprocessing, HDS units, and amine treating. Key risk: High Temperature Hydrogen Attack (HTHA) per API 941."],
    [2, "He", "Helium", 4.0026, "noble-gas", 1, 18, [2], "1s²", 1, 4, 0.0001785, null, "Gas", 1868, "Pierre Janssen", "Helium is a colorless, odorless, tasteless, non-toxic, inert, monatomic gas, the first in the noble gas group in the periodic table.", "Used for precision leak detection in pressurized heat exchangers and piping systems."],
    [3, "Li", "Lithium", 6.94, "alkali-metal", 2, 1, [2, 1], "[He] 2s¹", 454, 1603, 0.534, 0.98, "Solid", 1817, "Johan August Arfwedson", "Lithium is a soft, silvery-white alkali metal. Under standard conditions, it is the least dense metal and least dense solid element.", "Used in industrial lithium greases, high-performance battery metallurgy, and special heat-transfer fluids."],
    [4, "Be", "Beryllium", 9.0122, "alkaline-earth", 2, 2, [2, 2], "[He] 2s²", 1560, 2742, 1.85, 1.57, "Solid", 1798, "Louis Nicolas Vauquelin", "Beryllium is a relatively rare metal in the universe. It is a divalent element which occurs naturally only in combination with other elements within minerals.", "Beryllium-copper alloys provide non-sparking hand tools required in explosive hydrocarbon atmospheres."],
    [5, "B", "Boron", 10.81, "metalloid", 2, 13, [2, 3], "[He] 2s² 2p¹", 2349, 4200, 2.34, 2.04, "Solid", 1808, "Joseph Louis Gay-Lussac", "Boron is a low-abundance metalloid element produced entirely by cosmic ray spallation and supernovae.", "Alloyed in carbon steels (0.001-0.003%) to dramatically enhance hardenability in structural components."],
    [6, "C", "Carbon", 12.011, "reactive-nonmetal", 2, 14, [2, 4], "[He] 2s² 2p²", 3823, 4098, 2.267, 2.55, "Solid", "Ancient", "Known since antiquity", "Carbon is nonmetallic and tetravalent—making four electrons available to form covalent chemical bonds.", "Fundamental to carbon steel (API 5L, ASTM A106). Carbon content governs weldability, tensile strength, and PWHT criteria."],
    [7, "N", "Nitrogen", 14.007, "reactive-nonmetal", 2, 15, [2, 5], "[He] 2s² 2p³", 63, 77, 0.0012506, 3.04, "Gas", 1772, "Daniel Rutherford", "Nitrogen is a nonmetal and the lightest member of group 15 of the periodic table, often called the pnictogens.", "Essential purge gas for vessel inerting, blanketing hydrocarbon storage tanks, and preventing pyrophoric iron sulfide ignition."],
    [8, "O", "Oxygen", 15.999, "reactive-nonmetal", 2, 16, [2, 6], "[He] 2s² 2p⁴", 54, 90, 0.001429, 3.44, "Gas", 1774, "Joseph Priestley", "Oxygen is a member of the chalcogen group in the periodic table, a highly reactive nonmetal, and an oxidizing agent.", "Oxygen ingress in boiler feedwater or sour water causes severe pitting; controlled scavenger dosing is mandatory."],
    [9, "F", "Fluorine", 18.998, "reactive-nonmetal", 2, 17, [2, 7], "[He] 2s² 2p⁵", 53, 85, 0.001696, 3.98, "Gas", 1886, "Henri Moissan", "Fluorine is an extremely toxic, pale yellow halogen gas. It is the most chemically reactive and electronegative of all elements.", "Constituent of Hydrofluoric Acid (HF) alkylation. Forms backbone of PTFE/PVDF chemically inert protective linings."],
    [10, "Ne", "Neon", 20.180, "noble-gas", 2, 18, [2, 8], "[He] 2s² 2p⁶", 25, 27, 0.0009002, null, "Gas", 1898, "William Ramsay", "Neon is a colorless, odorless, inert monatomic noble gas under standard conditions, with about two-thirds the density of air.", "Specialized cryogenic cooling and high-voltage discharge indicator applications."],
    [11, "Na", "Sodium", 22.990, "alkali-metal", 3, 1, [2, 8, 1], "[Ne] 3s¹", 371, 1156, 0.968, 0.93, "Solid", 1807, "Humphry Davy", "Sodium is a soft, silvery-white, highly reactive alkali metal in group 1 of the periodic table.", "Key component of Caustic Soda (NaOH). Excessive concentration induces Caustic Embrittlement / SCC per API 571."],
    [12, "Mg", "Magnesium", 24.305, "alkaline-earth", 3, 2, [2, 8, 2], "[Ne] 3s²", 923, 1363, 1.738, 1.31, "Solid", 1755, "Joseph Black", "Magnesium is a shiny gray solid which bears a close physical resemblance to the other five elements in the alkaline earth group.", "Used as sacrificial galvanic anodes for cathodic protection (CP) of buried pipelines and water storage tanks."],
    [13, "Al", "Aluminium", 26.982, "post-transition", 3, 13, [2, 8, 3], "[Ne] 3s² 3p¹", 933, 2743, 2.70, 1.61, "Solid", 1825, "Hans Christian Ørsted", "Aluminium is a silvery-white, soft, non-magnetic, and ductile metal in the boron group.", "Commonly used for piping weather jacketing and cryogenic piping systems; susceptible to galvanic corrosion when coupled to carbon steel."],
    [14, "Si", "Silicon", 28.085, "metalloid", 3, 14, [2, 8, 4], "[Ne] 3s² 3p²", 1687, 3538, 2.329, 1.90, "Solid", 1824, "Jöns Jacob Berzelius", "Silicon is a hard, brittle crystalline solid with a blue-grey metallic lustre, and is a tetravalent metalloid and semiconductor.", "Used as a deoxidizer in steelmaking; silicone lubricants and seals provide wide chemical service envelope."],
    [15, "P", "Phosphorus", 30.974, "reactive-nonmetal", 3, 15, [2, 8, 5], "[Ne] 3s² 3p³", 317, 554, 1.823, 2.19, "Solid", 1669, "Hennig Brand", "Phosphorus is a chemical element existing in two major forms: white phosphorus and red phosphorus.", "Impurity in carbon steel strictly limited (typically <0.025-0.035%) to avoid temper embrittlement and hot-shortness."],
    [16, "S", "Sulfur", 32.06, "reactive-nonmetal", 3, 16, [2, 8, 6], "[Ne] 3s² 3p⁴", 388, 718, 2.07, 2.58, "Solid", "Ancient", "Known since antiquity", "Sulfur is a bright yellow, crystalline solid at room temperature. It is an abundant, multivalent nonmetal.", "Primary element in Sour Crude, H2S, Polythionic Acid Stress Corrosion Cracking (PASCC), and Sulfidation at >260°C."],
    [17, "Cl", "Chlorine", 35.45, "reactive-nonmetal", 3, 17, [2, 8, 7], "[Ne] 3s² 3p⁵", 172, 239, 0.0032, 3.16, "Gas", 1774, "Carl Wilhelm Scheele", "Chlorine is a yellow-green gas at room temperature. It is an extremely reactive element and a strong oxidizing agent.", "Responsible for Chloride Stress Corrosion Cracking (Cl-SCC) in 300-series stainless steels above 60°C per API 571."],
    [18, "Ar", "Argon", 39.948, "noble-gas", 3, 18, [2, 8, 8], "[Ne] 3s² 3p⁶", 84, 87, 0.001784, null, "Gas", 1894, "Lord Rayleigh", "Argon is the third-most abundant gas in the Earth's atmosphere. It is an odorless and colorless noble gas.", "Primary shielding gas for TIG (GTAW) and MIG (GMAW) welding of critical alloy piping and pressure vessels."],
    [19, "K", "Potassium", 39.098, "alkali-metal", 4, 1, [2, 8, 8, 1], "[Ar] 4s¹", 337, 1032, 0.89, 0.82, "Solid", 1807, "Humphry Davy", "Potassium is an alkali metal that reacts vigorously with water to generate hydrogen and potassium hydroxide.", "Used in hot potassium carbonate (Benfield) CO2 removal units in synthesis gas and hydrogen production."],
    [20, "Ca", "Calcium", 40.078, "alkaline-earth", 4, 2, [2, 8, 8, 2], "[Ar] 4s²", 1115, 1757, 1.55, 1.00, "Solid", 1808, "Humphry Davy", "Calcium is a reactive soft metallic element that readily forms a dark oxide-nitride layer in air.", "Calcium treatment is used during secondary steelmaking to modify sulfide inclusions (shape control for HIC resistance)."],
    [21, "Sc", "Scandium", 44.956, "transition-metal", 4, 3, [2, 8, 9, 2], "[Ar] 3d¹ 4s²", 1814, 3109, 2.985, 1.36, "Solid", 1879, "Lars Fredrik Nilson", "Scandium is a silvery-white metallic d-block element, historically classified as a rare-earth element.", "Alloyed in high-strength aerospace and marine aluminum alloys to inhibit grain growth during welding."],
    [22, "Ti", "Titanium", 47.867, "transition-metal", 4, 4, [2, 8, 10, 2], "[Ar] 3d² 4s²", 1941, 3560, 4.506, 1.54, "Solid", 1791, "William Gregor", "Titanium is a lustrous transition metal with a silver color, low density, and high strength. It is highly resistant to corrosion in sea water.", "Essential for seawater cooling tubes (Grade 2) and stabilizing stainless steels (Grade 321) against intergranular sensitization."],
    [23, "V", "Vanadium", 50.942, "transition-metal", 4, 5, [2, 8, 11, 2], "[Ar] 3d³ 4s²", 2183, 3680, 6.11, 1.63, "Solid", 1801, "Andrés Manuel del Río", "Vanadium is a hard, silvery-grey, ductile, malleable transition metal. It forms a protective oxide layer that resists corrosion.", "Key microalloy in Cr-Mo-V steels (e.g. 2.25Cr-1Mo-0.25V) for hydrocracker reactor vessels with superior creep resistance."],
    [24, "Cr", "Chromium", 51.996, "transition-metal", 4, 6, [2, 8, 13, 1], "[Ar] 3d⁵ 4s¹", 2180, 2944, 7.19, 1.66, "Solid", 1797, "Louis Nicolas Vauquelin", "Chromium is a steely-grey, lustrous, hard, and brittle transition metal. It takes a high polish and resists tarnishing.", "The fundamental element in stainless steel (>10.5% Cr) and alloy piping (P5, P9, P11, P22, P91) for oxidation and sulfidation resistance."],
    [25, "Mn", "Manganese", 54.938, "transition-metal", 4, 7, [2, 8, 13, 2], "[Ar] 3d⁵ 4s²", 1519, 2334, 7.21, 1.55, "Solid", 1774, "Johan Gottlieb Gahn", "Manganese is a transition metal with a multifaceted array of industrial alloy uses, particularly in stainless steels.", "Binds with sulfur as MnS in steel; Mn/C ratio governs low-temperature toughness and ductile-to-brittle transition temperature (DBTT)."],
    [26, "Fe", "Iron", 55.845, "transition-metal", 4, 8, [2, 8, 14, 2], "[Ar] 3d⁶ 4s²", 1811, 3134, 7.874, 1.83, "Solid", "Ancient", "Known since antiquity", "Iron is by mass the most common element on Earth, right in front of oxygen, forming much of Earth's outer and inner core.", "The primary metallic backbone of modern process infrastructure, refineries, pressure vessels, pipelines, and structural equipment."],
    [27, "Co", "Cobalt", 58.933, "transition-metal", 4, 9, [2, 8, 15, 2], "[Ar] 3d⁷ 4s²", 1768, 3200, 8.90, 1.88, "Solid", 1735, "Georg Brandt", "Cobalt is a hard, lustrous, silver-gray metal. It is produced by reductive smelting from ores and copper byproducts.", "Constituent of Stellite hardfacing alloys applied on valve seats, plugs, and pump impellers for high-temperature erosion resistance."],
    [28, "Ni", "Nickel", 58.693, "transition-metal", 4, 10, [2, 8, 16, 2], "[Ar] 3d⁸ 4s²", 1728, 3003, 8.908, 1.91, "Solid", 1751, "Axel Fredrik Cronstedt", "Nickel is a silvery-white lustrous metal with a slight golden tinge. It belongs to the transition metals and is hard and ductile.", "Vital for austenitic stabilization (304, 316) and nickel superalloys (Inconel 625, Hastelloy C276, Monel 400) for aggressive acidic/chloride service."],
    [29, "Cu", "Copper", 63.546, "transition-metal", 4, 11, [2, 8, 18, 1], "[Ar] 3d¹⁰ 4s¹", 1358, 2835, 8.96, 1.90, "Solid", "Ancient", "Known since antiquity", "Copper is a soft, malleable, and ductile metal with very high thermal and electrical conductivity.", "Base metal for 90/10 and 70/30 Cu-Ni seawater exchangers; susceptible to ammonia SCC and high erosion-corrosion velocity limits."],
    [30, "Zn", "Zinc", 65.38, "transition-metal", 4, 12, [2, 8, 18, 2], "[Ar] 3d¹⁰ 4s²", 693, 1180, 7.14, 1.65, "Solid", "Ancient", "Known since antiquity", "Zinc is a slightly brittle metal at room temperature and has a silvery-greyish appearance when oxidation is removed.", "Used for hot-dip galvanizing of structural steel and external piping supports; zinc embrittlement risk if welded onto stainless steel."],
    [31, "Ga", "Gallium", 69.723, "post-transition", 4, 13, [2, 8, 18, 3], "[Ar] 3d¹⁰ 4s² 4p¹", 303, 2673, 5.91, 1.81, "Solid", 1875, "Lecoq de Boisbaudran", "Gallium is a soft, silvery metal at standard temperature and pressure. In its liquid state, it becomes silvery white.", "Known for causing Liquid Metal Embrittlement (LME) when in contact with aluminum structures."],
    [32, "Ge", "Germanium", 72.630, "metalloid", 4, 14, [2, 8, 18, 4], "[Ar] 3d¹⁰ 4s² 4p²", 1211, 3106, 5.323, 2.01, "Solid", 1886, "Clemens Winkler", "Germanium is a lustrous, hard-brittle, grayish-white metalloid in the carbon group.", "Applied in infrared optical spectroscopy windows for process gas analyzers and pyrometers."],
    [33, "As", "Arsenic", 74.922, "metalloid", 4, 15, [2, 8, 18, 5], "[Ar] 3d¹⁰ 4s² 4p³", 1090, 887, 5.727, 2.18, "Solid", "Ancient", "Known since antiquity", "Arsenic is a metalloid occurring in many minerals, usually in combination with sulfur and metals.", "Trace poison in hydroprocessing catalysts and known promoter of hydrogen recombination poisoning leading to increased HIC susceptibility."],
    [34, "Se", "Selenium", 78.971, "reactive-nonmetal", 4, 16, [2, 8, 18, 6], "[Ar] 3d¹⁰ 4s² 4p⁴", 494, 958, 4.81, 2.55, "Solid", 1817, "Jöns Jacob Berzelius", "Selenium is a nonmetal with properties that are intermediate between the elements above and below in the periodic table.", "Added in small amounts to improve machinability in stainless steels, but must be limited in sour service alloys."],
    [35, "Br", "Bromine", 79.904, "reactive-nonmetal", 4, 17, [2, 8, 18, 7], "[Ar] 3d¹⁰ 4s² 4p⁵", 266, 332, 3.1028, 2.96, "Liquid", 1826, "Antoine Jérôme Balard", "Bromine is a fuming red-brown liquid at room temperature that evaporates readily to form a similarly coloured vapour.", "High corrosive severity in bromine manufacturing; requires tantalum or specific PTFE lined piping systems."],
    [36, "Kr", "Krypton", 83.798, "noble-gas", 4, 18, [2, 8, 18, 8], "[Ar] 3d¹⁰ 4s² 4p⁶", 116, 120, 0.003749, 3.00, "Gas", 1898, "William Ramsay", "Krypton is a colorless, odorless, tasteless noble gas that occurs in trace amounts in the atmosphere.", "Used in specialized laser alignment and diagnostic inspection equipment."],
    [37, "Rb", "Rubidium", 85.468, "alkali-metal", 5, 1, [2, 8, 18, 8, 1], "[Kr] 5s¹", 312, 961, 1.532, 0.82, "Solid", 1861, "Robert Bunsen", "Rubidium is a soft, silvery-white metallic element of the alkali metal group.", "Used in atomic vapor frequency standards and specialized catalytic synthesis."],
    [38, "Sr", "Strontium", 87.62, "alkaline-earth", 5, 2, [2, 8, 18, 8, 2], "[Kr] 5s²", 1050, 1655, 2.64, 0.95, "Solid", 1790, "Adair Crawford", "Strontium is an alkaline earth metal, a soft silver-white yellowish metallic element that is highly chemically reactive.", "Forms strontium sulfate scale in produced water systems that is virtually impossible to dissolve with standard chemical acid washes."],
    [39, "Y", "Yttrium", 88.906, "transition-metal", 5, 3, [2, 8, 18, 9, 2], "[Kr] 4d¹ 5s²", 1799, 3609, 4.472, 1.22, "Solid", 1794, "Johan Gadolin", "Yttrium is a silvery-metallic transition metal chemically similar to the lanthanides and often classified as a rare-earth element.", "Used in Yttria-Stabilized Zirconia (YSZ) thermal barrier coatings on gas turbine blades and high-temperature burner nozzles."],
    [40, "Zr", "Zirconium", 91.224, "transition-metal", 5, 4, [2, 8, 18, 10, 2], "[Kr] 4d² 5s²", 2128, 4682, 6.52, 1.33, "Solid", 1789, "Martin Heinrich Klaproth", "Zirconium is a lustrous, grey-white, strong transition metal that resembles hafnium and, to a lesser extent, titanium.", "Outstanding corrosion resistance in hot concentrated hydrochloric, nitric, and sulfuric acids."],
    [41, "Nb", "Niobium", 92.906, "transition-metal", 5, 5, [2, 8, 18, 12, 1], "[Kr] 4d⁴ 5s¹", 2750, 5017, 8.57, 1.6, "Solid", 1801, "Charles Hatchett", "Niobium, also known as columbium, is a light grey, crystalline, and ductile transition metal.", "Stabilizing element in 347 stainless steel (forms NbC) to prevent chromium depletion and sensitization during welding."],
    [42, "Mo", "Molybdenum", 95.95, "transition-metal", 5, 6, [2, 8, 18, 13, 1], "[Kr] 4d⁵ 5s¹", 2896, 4912, 10.28, 2.16, "Solid", 1778, "Carl Wilhelm Scheele", "Molybdenum is a refractory transition metal that has the 6th-highest melting point of any element.", "Crucial for pitting resistance in stainless steels (Pitting Resistance Equivalent PREN = %Cr + 3.3%Mo + 16%N). Resists hydrogen attack."],
    [43, "Tc", "Technetium", 98, "transition-metal", 5, 7, [2, 8, 18, 13, 2], "[Kr] 4d⁵ 5s²", 2430, 4538, 11, 1.9, "Solid", 1937, "Emilio Segrè", "Technetium is the lowest atomic number element in the periodic table with no stable isotopes.", "Used as a corrosion inhibitor additive in closed nuclear reactor secondary loops in laboratory studies."],
    [44, "Ru", "Ruthenium", 101.07, "transition-metal", 5, 8, [2, 8, 18, 15, 1], "[Kr] 4d⁷ 5s¹", 2607, 4423, 12.45, 2.2, "Solid", 1844, "Karl Ernst Claus", "Ruthenium is a rare transition metal belonging to the platinum group of the periodic table.", "Added to titanium (Grade 7 Ti-0.15Pd / Grade 26 Ti-0.1Ru) to provide exceptional resistance to hot reducing acids."],
    [45, "Rh", "Rhodium", 102.91, "transition-metal", 5, 9, [2, 8, 18, 16, 1], "[Kr] 4d⁸ 5s¹", 2237, 3968, 12.41, 2.28, "Solid", 1803, "William Hyde Wollaston", "Rhodium is an extraordinarily rare, silvery-white, hard, corrosion-resistant transition metal.", "Used in high-temperature catalytic converter meshes and noble thermocouple protection sheaths."],
    [46, "Pd", "Palladium", 106.42, "transition-metal", 5, 10, [2, 8, 18, 18], "[Kr] 4d¹⁰", 1828, 3236, 12.023, 2.20, "Solid", 1803, "William Hyde Wollaston", "Palladium is a rare and lustrous silvery-white metal discovered in 1803 by William Hyde Wollaston.", "Used in hydrogen purification membranes and as an alloying addition to titanium for sour brine service."],
    [47, "Ag", "Silver", 107.87, "transition-metal", 5, 11, [2, 8, 18, 18, 1], "[Kr] 4d¹⁰ 5s¹", 1235, 2435, 10.49, 1.93, "Solid", "Ancient", "Known since antiquity", "Silver is a soft, white, lustrous transition metal, it exhibits the highest electrical conductivity, thermal conductivity, and reflectivity of any metal.", "Silver-plated gaskets used in high-temperature flange sealing and specialized catalytic oxidation reactors."],
    [48, "Cd", "Cadmium", 112.41, "transition-metal", 5, 12, [2, 8, 18, 18, 2], "[Kr] 4d¹⁰ 5s²", 594, 1040, 8.65, 1.69, "Solid", 1817, "Karl Samuel Leberecht Hermann", "Cadmium is a soft, malleable, ductile, bluish-white bivalent metal. It is chemically similar to zinc and mercury.", "Historically used for fastener plating; prohibited on high-strength bolts in hot service due to cadmium embrittlement."],
    [49, "In", "Indium", 114.82, "post-transition", 5, 13, [2, 8, 18, 18, 3], "[Kr] 4d¹⁰ 5s² 5p¹", 430, 2345, 7.31, 1.78, "Solid", 1863, "Ferdinand Reich", "Indium is a post-transition metal that makes up 0.21 parts per million of the Earth's crust.", "Used for cryogenic vacuum seals and low-melting thermal fuses in fire-safe emergency shutdown systems."],
    [50, "Sn", "Tin", 118.71, "post-transition", 5, 14, [2, 8, 18, 18, 4], "[Kr] 4d¹⁰ 5s² 5p²", 505, 2875, 7.265, 1.96, "Solid", "Ancient", "Known since antiquity", "Tin is a silvery-coloured metal that is soft enough to be cut without much force.", "Bronzes and babbitt bearing materials in rotating equipment (turbines, multi-stage boiler feed pumps)."],
    [51, "Sb", "Antimony", 121.76, "metalloid", 5, 15, [2, 8, 18, 18, 5], "[Kr] 4d¹⁰ 5s² 5p³", 904, 1860, 6.697, 2.05, "Solid", "Ancient", "Known since antiquity", "Antimony is a lustrous gray metalloid found in nature mainly as the sulfide mineral stibnite.", "Hardener in lead acid batteries and chemical lead linings used in sulfuric acid processing."],
    [52, "Te", "Tellurium", 127.60, "metalloid", 5, 16, [2, 8, 18, 18, 6], "[Kr] 4d¹⁰ 5s² 5p⁴", 723, 1261, 6.24, 2.1, "Solid", 1782, "Franz-Joseph Müller von Reichenstein", "Tellurium is a brittle, mildly toxic, rare, silver-white metalloid.", "Small additions enhance the machinability of copper and steel alloys."],
    [53, "I", "Iodine", 126.90, "reactive-nonmetal", 5, 17, [2, 8, 18, 18, 7], "[Kr] 4d¹⁰ 5s² 5p⁵", 387, 457, 4.933, 2.66, "Solid", 1811, "Bernard Courtois", "Iodine is a chemical element with symbol I and atomic number 53. It is the heaviest of the stable halogens.", "Causes stress corrosion cracking in titanium alloys under high stress and elevated temperature."],
    [54, "Xe", "Xenon", 131.29, "noble-gas", 5, 18, [2, 8, 18, 18, 8], "[Kr] 4d¹⁰ 5s² 5p⁶", 161, 165, 0.005894, 2.6, "Gas", 1898, "William Ramsay", "Xenon is a colorless, dense, odorless noble gas found in Earth's atmosphere in trace amounts.", "Used in high-intensity arc inspection lamps and specialized vacuum leak tracing."],
    [55, "Cs", "Caesium", 132.91, "alkali-metal", 6, 1, [2, 8, 18, 18, 8, 1], "[Xe] 6s¹", 302, 944, 1.93, 0.79, "Solid", 1860, "Robert Bunsen", "Caesium is a soft, silvery-golden alkali metal with a melting point of 28.5 °C.", "High-density caesium formate brines used as deep-well drilling and completion fluids in oil & gas exploration."],
    [56, "Ba", "Barium", 137.33, "alkaline-earth", 6, 2, [2, 8, 18, 18, 8, 2], "[Xe] 6s²", 1000, 2170, 3.51, 0.89, "Solid", 1772, "Carl Wilhelm Scheele", "Barium is a soft, silvery alkaline earth metal. Because of its high chemical reactivity, barium is never found in nature as a free element.", "Barium sulfate (Barite) is standard heavy weighting agent for drilling mud; BaSO4 scale deposits resist all standard acidizing."],
    [57, "La", "Lanthanum", 138.91, "lanthanide", 6, 3, [2, 8, 18, 18, 9, 2], "[Xe] 5d¹ 6s²", 1193, 3737, 6.162, 1.10, "Solid", 1839, "Carl Gustaf Mosander", "Lanthanum is a soft, ductile, silvery-white metal that tarnishes slowly when exposed to air.", "Major constituent of fluid catalytic cracking (FCC) zeolite catalysts in oil refineries."],
    [58, "Ce", "Cerium", 140.12, "lanthanide", 6, 4, [2, 8, 18, 19, 9, 2], "[Xe] 4f¹ 5d¹ 6s²", 1068, 3716, 6.77, 1.12, "Solid", 1803, "Martin Heinrich Klaproth", "Cerium is a soft, ductile, and silvery-white metal that easily oxidizes across air.", "Used as a deoxidizer and sulfur scavenger in casting, and in catalyst formulations for emissions abatement."],
    [59, "Pr", "Praseodymium", 140.91, "lanthanide", 6, 5, [2, 8, 18, 21, 8, 2], "[Xe] 4f³ 6s²", 1208, 3793, 6.77, 1.13, "Solid", 1885, "Carl Auer von Welsbach", "Praseodymium is a soft, silvery, malleable and ductile metal in the lanthanide group.", "Component of didymium glass used in welder protective safety goggles."],
    [60, "Nd", "Neodymium", 144.24, "lanthanide", 6, 6, [2, 8, 18, 22, 8, 2], "[Xe] 4f⁴ 6s²", 1297, 3347, 7.01, 1.14, "Solid", 1885, "Carl Auer von Welsbach", "Neodymium is a moderately soft, silvery metal that quickly tarnishes in air and moisture.", "NdFeB permanent magnets used in canned-motor sealless pumps and magnetic drive agitators in toxic services."],
    [61, "Pm", "Promethium", 145, "lanthanide", 6, 7, [2, 8, 18, 23, 8, 2], "[Xe] 4f⁵ 6s²", 1315, 3273, 7.26, 1.13, "Solid", 1945, "Chien Shiung Wu", "Promethium is an extremely rare radioactive lanthanide element.", "Used in radioactive thickness gauging instruments for real-time steel wall measurement."],
    [62, "Sm", "Samarium", 150.36, "lanthanide", 6, 8, [2, 8, 18, 24, 8, 2], "[Xe] 4f⁶ 6s²", 1345, 2067, 7.52, 1.17, "Solid", 1879, "Lecoq de Boisbaudran", "Samarium is a moderately hard silvery metal that slowly oxidizes in air.", "Samarium-Cobalt (SmCo) magnets retain magnetic strength up to 300°C in high-temperature downhole pumps."],
    [63, "Eu", "Europium", 151.96, "lanthanide", 6, 9, [2, 8, 18, 25, 8, 2], "[Xe] 4f⁷ 6s²", 1099, 1802, 5.244, 1.2, "Solid", 1901, "Eugène-Anatole Demarçay", "Europium is a ductile, silvery metal that is the most reactive of the rare-earth elements.", "Used as a phosphor dopant in fluorescent non-destructive testing (NDT) penetration inspection."],
    [64, "Gd", "Gadolinium", 157.25, "lanthanide", 6, 10, [2, 8, 18, 25, 9, 2], "[Xe] 4f⁷ 5d¹ 6s²", 1585, 3546, 7.90, 1.20, "Solid", 1880, "Jean Charles Galissard de Marignac", "Gadolinium is a silvery-white malleable and ductile rare-earth metal.", "High thermal neutron capture cross-section; used for neutron shielding and shielding alloys."],
    [65, "Tb", "Terbium", 158.93, "lanthanide", 6, 11, [2, 8, 18, 27, 8, 2], "[Xe] 4f⁹ 6s²", 1629, 3503, 8.23, 1.2, "Solid", 1843, "Carl Gustaf Mosander", "Terbium is a silvery-white rare earth metal that is malleable, ductile, and soft enough to be cut with a knife.", "Used in magnetostrictive alloys (Terfenol-D) for precision ultrasonic acoustic emission sensors."],
    [66, "Dy", "Dysprosium", 162.50, "lanthanide", 6, 12, [2, 8, 18, 28, 8, 2], "[Xe] 4f¹⁰ 6s²", 1680, 2840, 8.54, 1.22, "Solid", 1886, "Lecoq de Boisbaudran", "Dysprosium is a rare-earth element with a metallic, bright silver luster.", "Added to neodymium magnets to increase demagnetization resistance in offshore electric submersible pumps."],
    [67, "Ho", "Holmium", 164.93, "lanthanide", 6, 13, [2, 8, 18, 29, 8, 2], "[Xe] 4f¹¹ 6s²", 1734, 2993, 8.79, 1.23, "Solid", 1878, "Jacques-Louis Soret", "Holmium is a relatively soft and malleable silvery-white rare earth metal.", "Highest magnetic moment of any element; used in specialized magnetic flux concentrators."],
    [68, "Er", "Erbium", 167.26, "lanthanide", 6, 14, [2, 8, 18, 30, 8, 2], "[Xe] 4f¹² 6s²", 1802, 3141, 9.066, 1.24, "Solid", 1843, "Carl Gustaf Mosander", "Erbium is a silvery-white solid metal that slowly tarnishes in air.", "Used in fiber-optic distributed acoustic sensing (DAS) systems for long-distance pipeline leak monitoring."],
    [69, "Tm", "Thulium", 168.93, "lanthanide", 6, 15, [2, 8, 18, 31, 8, 2], "[Xe] 4f¹³ 6s²", 1818, 2223, 9.32, 1.25, "Solid", 1879, "Per Teodor Cleve", "Thulium is the second-least abundant of the lanthanides.", "Portable X-ray and gamma radiography sources for piping field weld inspection."],
    [70, "Yb", "Ytterbium", 173.05, "lanthanide", 6, 16, [2, 8, 18, 32, 8, 2], "[Xe] 4f¹⁴ 6s²", 1097, 1469, 6.90, 1.1, "Solid", 1878, "Jean Charles Galissard de Marignac", "Ytterbium is a soft, malleable and ductile chemical element in the lanthanide series.", "Used in high-power industrial fiber laser cutters and automated pipeline orbital welding units."],
    [71, "Lu", "Lutetium", 174.97, "lanthanide", 6, 17, [2, 8, 18, 32, 9, 2], "[Xe] 4f¹⁴ 5d¹ 6s²", 1925, 3675, 9.841, 1.27, "Solid", 1907, "Georges Urbain", "Lutetium is a silvery-white metal which resists corrosion in dry air.", "Catalyst in refinery petroleum cracking, alkylation, and hydrogenation."],
    [72, "Hf", "Hafnium", 178.49, "transition-metal", 6, 4, [2, 8, 18, 32, 10, 2], "[Xe] 4f¹⁴ 5d² 6s²", 2506, 4876, 13.31, 1.3, "Solid", 1923, "Dirk Coster", "Hafnium is a lustrous, silvery gray, tetravalent transition metal.", "Doped into nickel-base superalloys to strengthen grain boundaries at 1000°C+ service."],
    [73, "Ta", "Tantalum", 180.95, "transition-metal", 6, 5, [2, 8, 18, 32, 11, 2], "[Xe] 4f¹⁴ 5d³ 6s²", 3290, 5731, 16.69, 1.5, "Solid", 1802, "Anders Gustaf Ekeberg", "Tantalum is a rare, hard, blue-gray, lustrous transition metal that is highly corrosion-resistant.", "Premier corrosion-resistant metal for hot concentrated hydrochloric acid and chlorine service equipment."],
    [74, "W", "Tungsten", 183.84, "transition-metal", 6, 6, [2, 8, 18, 32, 12, 2], "[Xe] 4f¹⁴ 5d⁴ 6s²", 3695, 5828, 19.25, 2.36, "Solid", 1781, "Carl Wilhelm Scheele", "Tungsten is a rare metal found naturally on Earth almost exclusively as compounds with other elements.", "Tungsten carbide hardfacing for high-wear choke valves; non-consumable TIG (GTAW) welding electrodes."],
    [75, "Re", "Rhenium", 186.21, "transition-metal", 6, 7, [2, 8, 18, 32, 13, 2], "[Xe] 4f¹⁴ 5d⁵ 6s²", 3459, 5869, 21.02, 1.9, "Solid", 1925, "Masataka Ogawa", "Rhenium is a silvery-gray, heavy, third-row transition metal in group 7 of the periodic table.", "Added to single-crystal turbine blades to inhibit creep deformation and microstructural coarsening."],
    [76, "Os", "Osmium", 190.23, "transition-metal", 6, 8, [2, 8, 18, 32, 14, 2], "[Xe] 4f¹⁴ 5d⁶ 6s²", 3306, 5285, 22.59, 2.2, "Solid", 1803, "Smithson Tennant", "Osmium is a hard, brittle, bluish-white transition metal in the platinum group that is the densest naturally occurring element.", "Extreme wear applications and specialized oxidation-resistant chemical instrumentation tips."],
    [77, "Ir", "Iridium", 192.22, "transition-metal", 6, 9, [2, 8, 18, 32, 15, 2], "[Xe] 4f¹⁴ 5d⁷ 6s²", 2719, 4701, 22.56, 2.20, "Solid", 1803, "Smithson Tennant", "Iridium is a very hard, brittle, silvery-white transition metal of the platinum group.", "Gamma radiographic isotope (Iridium-192) universally employed for non-destructive inspection of piping welds."],
    [78, "Pt", "Platinum", 195.08, "transition-metal", 6, 10, [2, 8, 18, 32, 17, 1], "[Xe] 4f¹⁴ 5d⁹ 6s¹", 2041, 4098, 21.45, 2.28, "Solid", 1735, "Antonio de Ulloa", "Platinum is a dense, malleable, ductile, highly unreactive, precious, silverish-white transition metal.", "Industrial catalyst in Continuous Catalytic Reforming (CCR) units for high-octane gasoline production."],
    [79, "Au", "Gold", 196.97, "transition-metal", 6, 11, [2, 8, 18, 32, 18, 1], "[Xe] 4f¹⁴ 5d¹⁰ 6s¹", 1337, 3129, 19.30, 2.54, "Solid", "Ancient", "Known since antiquity", "Gold is a bright, slightly reddish yellow, dense, soft, malleable, and ductile metal.", "Gold-plated electrical contacts on safety-instrumented system (SIS) trip relays in corrosive H2S atmospheres."],
    [80, "Hg", "Mercury", 200.59, "transition-metal", 6, 12, [2, 8, 18, 32, 18, 2], "[Xe] 4f¹⁴ 5d¹⁰ 6s²", 234, 630, 13.534, 2.00, "Liquid", "Ancient", "Known since antiquity", "Mercury is a heavy, silvery d-block element, the only metallic element that is liquid at standard conditions.", "Presents catastrophic Liquid Metal Embrittlement (LME) hazard to aluminum brazed heat exchangers (BAHX) in LNG plants."],
    [81, "Tl", "Thallium", 204.38, "post-transition", 6, 13, [2, 8, 18, 32, 18, 3], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹", 577, 1746, 11.85, 1.62, "Solid", 1861, "William Crookes", "Thallium is a gray post-transition metal that is not found free in nature.", "Constituent of low-temperature mercury-thallium thermometers used down to -58°C."],
    [82, "Pb", "Lead", 207.2, "post-transition", 6, 14, [2, 8, 18, 32, 18, 4], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²", 600, 2022, 11.34, 2.33, "Solid", "Ancient", "Known since antiquity", "Lead is a heavy metal that is denser than most common materials. It is soft and malleable with a low melting point.", "Used for radiation shielding collimators in field radiography of pipes and tanks; historical chemical lead vessel linings."],
    [83, "Bi", "Bismuth", 208.98, "post-transition", 6, 15, [2, 8, 18, 32, 18, 5], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³", 544, 1837, 9.78, 2.02, "Solid", "Ancient", "Known since antiquity", "Bismuth is a pentavalent post-transition metal and one of the pnictogens with chemical properties resembling its lighter group 15 siblings.", "Used in low-melting fire sprinkler plugs and fusible temperature safety relief elements."],
    [84, "Po", "Polonium", 209, "post-transition", 6, 16, [2, 8, 18, 32, 18, 6], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴", 527, 1235, 9.196, 2.0, "Solid", 1898, "Marie Curie", "Polonium is a rare and highly radioactive metal with no stable isotopes.", "Used in industrial static eliminators for volatile fuel handling facilities."],
    [85, "At", "Astatine", 210, "metalloid", 6, 17, [2, 8, 18, 32, 18, 7], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵", 575, 610, 6.35, 2.2, "Solid", 1940, "Dale R. Corson", "Astatine is a very rare radioactive chemical element.", "Research element investigated for targeted alpha therapy."],
    [86, "Rn", "Radon", 222, "noble-gas", 6, 18, [2, 8, 18, 32, 18, 8], "[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶", 202, 211, 0.00973, 2.2, "Gas", 1900, "Friedrich Ernst Dorn", "Radon is a radioactive, colorless, odorless, tasteless noble gas.", "Naturally occurring radioactive material (NORM) daughter isotope in natural gas production piping."],
    [87, "Fr", "Francium", 223, "alkali-metal", 7, 1, [2, 8, 18, 32, 18, 8, 1], "[Rn] 7s¹", 300, 950, 1.87, 0.7, "Solid", 1939, "Marguerite Perey", "Francium is an extremely radioactive alkali metal; its most stable isotope has a half-life of only 22 minutes.", "Studied in atomic physics labs for atomic structure spectroscopic probing."],
    [88, "Ra", "Radium", 226, "alkaline-earth", 7, 2, [2, 8, 18, 32, 18, 8, 2], "[Rn] 7s²", 973, 2010, 5.5, 0.9, "Solid", 1898, "Marie Curie", "Radium is an almost pure-white alkaline earth metal, but it readily reacts with nitrogen on exposure to air.", "Major contributor to NORM scale deposits on internal pipeline surfaces and tubulars in oilfield production."],
    [89, "Ac", "Actinium", 227, "actinide", 7, 3, [2, 8, 18, 32, 18, 9, 2], "[Rn] 6d¹ 7s²", 1323, 3471, 10.07, 1.1, "Solid", 1899, "André-Louis Debierne", "Actinium is a soft, silvery-white radioactive actinide metal.", "Used as a neutron source in oilfield sub-surface geological formation logging tools."],
    [90, "Th", "Thorium", 232.04, "actinide", 7, 4, [2, 8, 18, 32, 18, 10, 2], "[Rn] 6d² 7s²", 2115, 5061, 11.72, 1.3, "Solid", 1829, "Jöns Jacob Berzelius", "Thorium is a weakly radioactive metallic chemical element with symbol Th and atomic number 90.", "Thorium oxide (ThO2) added to tungsten electrodes (EWTh-2) for enhanced arc stability in pipe GTAW welding."],
    [91, "Pa", "Protactinium", 231.04, "actinide", 7, 5, [2, 8, 18, 32, 20, 9, 2], "[Rn] 5f² 6d¹ 7s²", 1841, 4300, 15.37, 1.5, "Solid", 1913, "Kasimir Fajans", "Protactinium is a dense, silvery-gray actinide metal which readily reacts with oxygen, water vapor and inorganic acids.", "Basic nuclear physics research and radioactive decay dating."],
    [92, "U", "Uranium", 238.03, "actinide", 7, 6, [2, 8, 18, 32, 21, 9, 2], "[Rn] 5f³ 6d¹ 7s²", 1405, 4404, 19.1, 1.38, "Solid", 1789, "Martin Heinrich Klaproth", "Uranium is a silvery-grey metal in the actinide series of the periodic table.", "Depleted uranium used as high-density gamma radiation shielding in portable weld radiography cameras."],
    [93, "Np", "Neptunium", 237, "actinide", 7, 7, [2, 8, 18, 32, 22, 9, 2], "[Rn] 5f⁴ 6d¹ 7s²", 917, 4273, 20.45, 1.36, "Solid", 1940, "Edwin McMillan", "Neptunium is a radioactive actinide metal, the first transuranic element.", "Precursor in the production of Plutonium-238 for deep-space radioisotope power generators."],
    [94, "Pu", "Plutonium", 244, "actinide", 7, 8, [2, 8, 18, 32, 24, 8, 2], "[Rn] 5f⁶ 7s²", 912, 3501, 19.816, 1.28, "Solid", 1940, "Glenn T. Seaborg", "Plutonium is a radioactive actinide metal of silvery-gray appearance that tarnishes when oxidized.", "Nuclear fuel element in pressurized water reactors and radioisotope thermoelectric generators."],
    [95, "Am", "Americium", 243, "actinide", 7, 9, [2, 8, 18, 32, 25, 8, 2], "[Rn] 5f⁷ 7s²", 1449, 2880, 12, 1.13, "Solid", 1944, "Glenn T. Seaborg", "Americium is a synthetic radioactive element in the actinide series.", "Americium-241 is universally used in industrial ionization smoke detectors and downhole neutron density gauges."],
    [96, "Cm", "Curium", 247, "actinide", 7, 10, [2, 8, 18, 32, 25, 9, 2], "[Rn] 5f⁷ 6d¹ 7s²", 1613, 3383, 13.51, 1.28, "Solid", 1944, "Glenn T. Seaborg", "Curium is a transuranic radioactive chemical element named after Marie and Pierre Curie.", "Alpha source for Alpha Particle X-Ray Spectrometers (APXS) in space mineralogy."],
    [97, "Bk", "Berkelium", 247, "actinide", 7, 11, [2, 8, 18, 32, 27, 8, 2], "[Rn] 5f⁹ 7s²", 1259, 2900, 14.78, 1.3, "Solid", 1949, "Glenn T. Seaborg", "Berkelium is a transuranic radioactive chemical element discovered at UC Berkeley.", "Target material for synthesis of heavier superheavy elements including tennessine."],
    [98, "Cf", "Californium", 251, "actinide", 7, 12, [2, 8, 18, 32, 28, 8, 2], "[Rn] 5f¹⁰ 7s²", 1173, 1743, 15.1, 1.3, "Solid", 1950, "Glenn T. Seaborg", "Californium is a radioactive actinide element, the sixth transuranic element to be synthesized.", "Californium-252 is an intense neutron source used in Prompt Gamma Neutron Activation Analysis (PGNAA) of coal and cement."],
    [99, "Es", "Einsteinium", 252, "actinide", 7, 13, [2, 8, 18, 32, 29, 8, 2], "[Rn] 5f¹¹ 7s²", 1133, 1269, 8.84, 1.3, "Solid", 1952, "Albert Ghiorso", "Einsteinium is a synthetic element named after Albert Einstein, discovered in the debris of the first thermonuclear bomb.", "Fundamental actinide chemistry investigations."],
    [100, "Fm", "Fermium", 257, "actinide", 7, 14, [2, 8, 18, 32, 30, 8, 2], "[Rn] 5f¹² 7s²", 1800, null, null, 1.3, "Solid", 1952, "Albert Ghiorso", "Fermium is the heaviest element that can be formed by neutron bombardment of lighter elements.", "Nuclear physics research on spontaneous fission kinetics."],
    [101, "Md", "Mendelevium", 258, "actinide", 7, 15, [2, 8, 18, 32, 31, 8, 2], "[Rn] 5f¹³ 7s²", 1100, null, null, 1.3, "Solid", 1955, "Albert Ghiorso", "Mendelevium is a synthetic element in the actinide series, named after Dmitri Mendeleev.", "Radioactive tracer studies in heavy actinide chemistry."],
    [102, "No", "Nobelium", 259, "actinide", 7, 16, [2, 8, 18, 32, 32, 8, 2], "[Rn] 5f¹⁴ 7s²", 1100, null, null, 1.3, "Solid", 1966, "Joint Institute for Nuclear Research", "Nobelium is a synthetic radioactive element named after Alfred Nobel.", "Investigation of relativistic electron shell effects in heavy atoms."],
    [103, "Lr", "Lawrencium", 266, "actinide", 7, 17, [2, 8, 18, 32, 32, 8, 3], "[Rn] 5f¹⁴ 7s² 7p¹", 1900, null, null, 1.3, "Solid", 1961, "Albert Ghiorso", "Lawrencium is a synthetic chemical element named after Ernest Lawrence.", "Final member of the actinide series in period 7."],
    [104, "Rf", "Rutherfordium", 267, "transition-metal", 7, 4, [2, 8, 18, 32, 32, 10, 2], "[Rn] 5f¹⁴ 6d² 7s²", 2400, 5800, 23.2, null, "Solid", 1969, "Albert Ghiorso", "Rutherfordium is a synthetic chemical element named after physicist Ernest Rutherford.", "First transactinide element investigated for group 4 chemical homologue verification."],
    [105, "Db", "Dubnium", 268, "transition-metal", 7, 5, [2, 8, 18, 32, 32, 11, 2], "[Rn] 5f¹⁴ 6d³ 7s²", null, null, 29.3, null, "Solid", 1970, "Albert Ghiorso", "Dubnium is a synthetic chemical element named after the town of Dubna in Russia.", "Nuclear decay pathway modeling."],
    [106, "Sg", "Seaborgium", 269, "transition-metal", 7, 6, [2, 8, 18, 32, 32, 12, 2], "[Rn] 5f¹⁴ 6d⁴ 7s²", null, null, 35.0, null, "Solid", 1974, "Albert Ghiorso", "Seaborgium is a synthetic chemical element named after the American nuclear chemist Glenn T. Seaborg.", "Heavy group 6 chemical behavior studies."],
    [107, "Bh", "Bohrium", 270, "transition-metal", 7, 7, [2, 8, 18, 32, 32, 13, 2], "[Rn] 5f¹⁴ 6d⁵ 7s²", null, null, 37.1, null, "Solid", 1981, "Peter Armbruster", "Bohrium is a synthetic chemical element named after Danish physicist Niels Bohr.", "Gas-phase thermochromatography investigations."],
    [108, "Hs", "Hassium", 269, "transition-metal", 7, 8, [2, 8, 18, 32, 32, 14, 2], "[Rn] 5f¹⁴ 6d⁶ 7s²", null, null, 40.7, null, "Solid", 1984, "Peter Armbruster", "Hassium is a synthetic chemical element named after the German state of Hesse.", "Group 8 tetroxide volatility comparisons with osmium."],
    [109, "Mt", "Meitnerium", 278, "unknown", 7, 9, [2, 8, 18, 32, 32, 15, 2], "[Rn] 5f¹⁴ 6d⁷ 7s²", null, null, 37.4, null, "Solid", 1982, "Peter Armbruster", "Meitnerium is a synthetic chemical element named after Austrian-Swedish physicist Lise Meitner.", "Relativistic quantum chemistry benchmarking."],
    [110, "Ds", "Darmstadtium", 281, "unknown", 7, 10, [2, 8, 18, 32, 32, 17, 1], "[Rn] 5f¹⁴ 6d⁹ 7s¹", null, null, 34.8, null, "Solid", 1994, "Sigurd Hofmann", "Darmstadtium is a synthetic chemical element named after the German city of Darmstadt.", "Superheavy element synthesis research."],
    [111, "Rg", "Roentgenium", 282, "unknown", 7, 11, [2, 8, 18, 32, 32, 18, 1], "[Rn] 5f¹⁴ 6d¹⁰ 7s¹", null, null, 28.7, null, "Solid", 1994, "Sigurd Hofmann", "Roentgenium is an extremely radioactive synthetic element named after Wilhelm Röntgen.", "Group 11 relativistic contraction experiments."],
    [112, "Cn", "Copernicium", 285, "unknown", 7, 12, [2, 8, 18, 32, 32, 18, 2], "[Rn] 5f¹⁴ 6d¹⁰ 7s²", 283, 340, 23.7, null, "Liquid", 1996, "Sigurd Hofmann", "Copernicium is a synthetic chemical element; it has symbol Cn and atomic number 112. Its known isotopes are extremely radioactive, and have only been created in a laboratory.", "Superheavy group 12 element exhibiting relativistic inertness resembling a noble gas."],
    [113, "Nh", "Nihonium", 286, "unknown", 7, 13, [2, 8, 18, 32, 32, 18, 3], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹", 700, 1400, 16, null, "Solid", 2004, "RIKEN (Japan)", "Nihonium is a synthetic chemical element with the symbol Nh and atomic number 113.", "First element discovered in an Asian laboratory."],
    [114, "Fl", "Flerovium", 289, "unknown", 7, 14, [2, 8, 18, 32, 32, 18, 4], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²", 340, 420, 14, null, "Solid", 1998, "Joint Institute for Nuclear Research", "Flerovium is an extremely radioactive synthetic chemical element.", "Researched for potential island-of-stability nuclear shell closure."],
    [115, "Mc", "Moscovium", 290, "unknown", 7, 15, [2, 8, 18, 32, 32, 18, 5], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³", 670, 1400, 13.5, null, "Solid", 2003, "Joint Institute for Nuclear Research", "Moscovium is an extremely radioactive synthetic element named after the Moscow Oblast.", "High-energy nuclear fusion cross-section studies."],
    [116, "Lv", "Livermorium", 293, "unknown", 7, 16, [2, 8, 18, 32, 32, 18, 6], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴", 709, 1085, 12.9, null, "Solid", 2000, "Lawrence Livermore National Laboratory", "Livermorium is a synthetic chemical element named in honour of Lawrence Livermore National Laboratory.", "Superheavy chalcogen homologue research."],
    [117, "Ts", "Tennessine", 294, "unknown", 7, 17, [2, 8, 18, 32, 32, 18, 7], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵", 723, 883, 7.2, null, "Solid", 2010, "Joint Institute for Nuclear Research / ORNL", "Tennessine is a synthetic chemical element named after the state of Tennessee.", "Heaviest known halogen-group synthetic element."],
    [118, "Og", "Oganesson", 294, "unknown", 7, 18, [2, 8, 18, 32, 32, 18, 8], "[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁸", 325, 450, 5.0, null, "Solid", 2002, "Joint Institute for Nuclear Research", "Oganesson is a synthetic chemical element named after nuclear physicist Yuri Oganessian. It has the highest atomic number and atomic mass of all known elements.", "Predicted to have uniform electron-gas distribution due to strong spin-orbit relativistic effects."]
  ];

  // Map into structured element objects
  const ELEMENTS = RAW_ELEMENTS.map(r => ({
    number: r[0],
    symbol: r[1],
    name: r[2],
    mass: r[3],
    category: r[4],
    period: r[5],
    group: r[6],
    shells: r[7],
    config: r[8],
    mpK: r[9],
    bpK: r[10],
    density: r[11],
    eneg: r[12],
    phase: r[13],
    discDate: r[14],
    discBy: r[15],
    summary: r[16],
    industrial: r[17]
  }));

  // Element lookup dictionary by atomic number and symbol
  const BY_NUM = {};
  const BY_SYM = {};
  ELEMENTS.forEach(el => {
    BY_NUM[el.number] = el;
    BY_SYM[el.symbol.toLowerCase()] = el;
  });

  // =========================================================================
  // 3D BOHR ATOM MODEL CANVAS RENDERER
  // =========================================================================
  class BohrModel3D {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.element = null;
      this.animId = null;
      this.rotX = 0.55; // Tilted angle for 3D perspective
      this.rotY = 0.0;
      this.speed = 1.0;
      this.isPaused = false;
      this.isDragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.time = 0;

      this.initEvents();
    }

    initEvents() {
      const c = this.canvas;
      c.addEventListener("mousedown", (e) => {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });
      window.addEventListener("mouseup", () => {
        this.isDragging = false;
      });
      window.addEventListener("mousemove", (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.rotY += dx * 0.01;
        this.rotX += dy * 0.01;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      // Touch events for mobile
      c.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          this.lastMouseX = e.touches[0].clientX;
          this.lastMouseY = e.touches[0].clientY;
        }
      }, { passive: true });
      window.addEventListener("touchend", () => {
        this.isDragging = false;
      });
      window.addEventListener("touchmove", (e) => {
        if (!this.isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.rotY += dx * 0.012;
        this.rotX += dy * 0.012;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }, { passive: true });
    }

    setElement(el) {
      this.element = el;
      // Only start if canvas is actually visible in DOM
      if (this.canvas && this.canvas.offsetParent !== null && this.canvas.clientWidth > 0) {
        if (!this.animId) {
          this.start();
        } else {
          this.draw();
        }
      }
    }

    updateDimensions() {
      if (!this.canvas) return false;
      const rect = this.canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }
      return true;
    }

    start() {
      if (this.animId) return;
      // Do not start if hidden or detached
      if (!this.canvas || this.canvas.offsetParent === null || this.canvas.clientWidth === 0) {
        return;
      }
      this.updateDimensions();
      const render = () => {
        // Sleep if canvas was hidden or navigated away
        if (!this.canvas || this.canvas.offsetParent === null || this.canvas.clientWidth === 0) {
          this.animId = null;
          return;
        }
        if (!this.isPaused) {
          this.time += 0.02 * this.speed;
          this.rotY += 0.005 * this.speed;
          this.draw();
        }
        this.animId = requestAnimationFrame(render);
      };
      this.animId = requestAnimationFrame(render);
    }

    pause() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      if (!this.isPaused && !this.animId) {
        this.start();
      }
      return this.isPaused;
    }

    resetView() {
      this.rotX = 0.55;
      this.rotY = 0.0;
      this.speed = 1.0;
      this.isPaused = false;
      this.updateDimensions();
      this.draw();
      if (!this.animId) {
        this.start();
      }
    }

    draw() {
      const ctx = this.ctx;
      const c = this.canvas;
      if (!c || c.width === 0 || c.height === 0) {
        if (!this.updateDimensions()) return;
      }
      const w = c.width;
      const h = c.height;

      ctx.clearRect(0, 0, w, h);

      if (!this.element) return;

      const cx = w / 2;
      const cy = h / 2;
      const shells = this.element.shells || [1];
      const maxShells = shells.length;
      const maxRadius = Math.min(w, h) * 0.44;
      const shellGap = maxShells > 1 ? (maxRadius - 20) / (maxShells) : maxRadius * 0.5;

      // Project 3D point (x, y, z) with rotation around X and Y axes
      const project = (x, y, z) => {
        // Rotate around Y
        const cosY = Math.cos(this.rotY);
        const sinY = Math.sin(this.rotY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate around X
        const cosX = Math.cos(this.rotX);
        const sinX = Math.sin(this.rotX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective projection
        const fov = 400;
        const scale = fov / (fov + z2);
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          z: z2,
          scale: scale
        };
      };

      // 1. Draw Concentric 3D Orbital Rings (tilted in space)
      ctx.lineWidth = 1 * (window.devicePixelRatio || 1);
      shells.forEach((electronCount, shellIdx) => {
        const r = 24 + (shellIdx + 1) * shellGap;
        ctx.beginPath();
        const segments = 64;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const px = r * Math.cos(theta);
          const pz = r * Math.sin(theta);
          const pt = project(px, 0, pz);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = "rgba(74, 222, 128, 0.28)"; // Translucent green orbit ring
        ctx.stroke();
      });

      // 2. Draw Nucleus Cluster at Center (Protons: Red/Orange, Neutrons: Blue)
      const numNucleons = Math.min(this.element.number + Math.round(this.element.mass - this.element.number), 42);
      const nucleusRadius = Math.max(12, Math.min(22, 9 + Math.sqrt(this.element.number) * 1.3));

      // Deterministic nucleon positions
      const nucleons = [];
      for (let i = 0; i < numNucleons; i++) {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / numNucleons);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const rad = nucleusRadius * (0.35 + 0.65 * ((i % 5) / 5));
        const nx = rad * Math.sin(phi) * Math.cos(theta);
        const ny = rad * Math.sin(phi) * Math.sin(theta);
        const nz = rad * Math.cos(phi);
        const isProton = (i % 2 === 0);
        nucleons.push({ x: nx, y: ny, z: nz, isProton });
      }

      // Collect all 3D drawable objects (nucleons + electrons) to sort by Z (depth sorting)
      const drawables = [];

      nucleons.forEach(n => {
        const pt = project(n.x, n.y, n.z);
        drawables.push({
          type: "nucleon",
          x: pt.x,
          y: pt.y,
          z: pt.z,
          scale: pt.scale,
          isProton: n.isProton
        });
      });

      // 3. Draw Orbiting Electrons along each shell
      shells.forEach((electronCount, shellIdx) => {
        const r = 24 + (shellIdx + 1) * shellGap;
        // Angular speed proportional to 1 / (shellIdx + 1)^1.2
        const orbitalSpeed = (this.time * (1.6 / Math.pow(shellIdx + 1, 1.1))) * (shellIdx % 2 === 0 ? 1 : -1);

        for (let e = 0; e < electronCount; e++) {
          const theta = orbitalSpeed + (e / electronCount) * Math.PI * 2;
          const ex = r * Math.cos(theta);
          const ez = r * Math.sin(theta);
          const pt = project(ex, 0, ez);
          drawables.push({
            type: "electron",
            x: pt.x,
            y: pt.y,
            z: pt.z,
            scale: pt.scale,
            shell: shellIdx
          });
        }
      });

      // Sort by Z from back to front (painter's algorithm)
      drawables.sort((a, b) => a.z - b.z);

      // Render drawables
      drawables.forEach(d => {
        if (d.type === "nucleon") {
          const radius = Math.max(3, 4.5 * d.scale);
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);

          const grad = ctx.createRadialGradient(
            d.x - radius * 0.35, d.y - radius * 0.35, radius * 0.1,
            d.x, d.y, radius
          );
          if (d.isProton) {
            grad.addColorStop(0, "#fca5a5");
            grad.addColorStop(0.5, "#ef4444");
            grad.addColorStop(1, "#991b1b");
          } else {
            grad.addColorStop(0, "#93c5fd");
            grad.addColorStop(0.5, "#3b82f6");
            grad.addColorStop(1, "#1d4ed8");
          }
          ctx.fillStyle = grad;
          ctx.fill();
        } else if (d.type === "electron") {
          const radius = Math.max(2.5, 3.8 * d.scale);

          // Glow halo
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(74, 222, 128, 0.25)";
          ctx.fill();

          // Electron dot
          ctx.beginPath();
          ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#4ade80"; // Bright neon green
          ctx.shadowColor = "#4ade80";
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    }

    destroy() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }
  }

  // =========================================================================
  // PERIODIC TABLE APPLICATION CONTROLLER
  // =========================================================================
  const PeriodicTable = {
    selectedElement: BY_NUM[112] || BY_NUM[1], // Default Copernicium Cn 112 as shown in user screenshot
    activeFilter: "all",
    searchQuery: "",
    temperatureK: 298.15, // 25°C STP
    bohrVisualizer: null,
    isInitialized: false,

    init() {
      if (this.isInitialized) return;

      const container = document.getElementById("ptableMainContainer");
      if (!container) return;

      this.renderTableGrid();
      this.renderLegend();
      this.initBohrModel();
      this.bindEvents();
      this.selectElement(this.selectedElement.number);

      this.isInitialized = true;
    },

    initBohrModel() {
      const canvas = document.getElementById("ptableBohrCanvas");
      if (canvas) {
        this.bohrVisualizer = new BohrModel3D(canvas);
        if (this.selectedElement) {
          this.bohrVisualizer.setElement(this.selectedElement);
        }
      }
    },

    bindEvents() {
      // Search input
      const searchInp = document.getElementById("ptableSearchInput");
      if (searchInp) {
        searchInp.addEventListener("input", (e) => {
          this.searchQuery = e.target.value.trim().toLowerCase();
          this.applyFilters();
        });
      }

      // Fullscreen button
      const fsBtn = document.getElementById("ptableBtnFullscreen");
      if (fsBtn) {
        fsBtn.addEventListener("click", () => this.toggleFullscreen());
      }

      // Temperature slider
      const tempSlider = document.getElementById("ptableTempSlider");
      if (tempSlider) {
        tempSlider.addEventListener("input", (e) => {
          this.temperatureK = parseFloat(e.target.value);
          const degC = Math.round(this.temperatureK - 273.15);
          const badge = document.getElementById("ptableTempDisplay");
          if (badge) badge.textContent = `${this.temperatureK} K (${degC} °C)`;
          this.updatePhases();
        });
      }
    },

    toggleFullscreen() {
      const container = document.getElementById("ptableMainContainer");
      const btn = document.getElementById("ptableBtnFullscreen");
      if (!container) return;

      const isFs = container.classList.toggle("is-fullscreen");
      if (btn) {
        btn.innerHTML = isFs
          ? `<span>↙</span> Exit full screen`
          : `<span>↗</span> Open in full screen`;
      }

      // If opening in fullscreen, prevent background scroll
      document.body.style.overflow = isFs ? "hidden" : "";
    },

    // Render the 18-column periodic table grid
    renderTableGrid() {
      const grid = document.getElementById("ptableGrid");
      if (!grid) return;

      // Group elements by grid position: [row (1-9)][col (1-18)]
      const gridCells = [];

      // Main body: Period 1 to 7
      ELEMENTS.forEach(el => {
        let row = el.period;
        let col = el.group;

        // Lanthanides row 8 (Ce 58 to Lu 71)
        if (el.number >= 58 && el.number <= 71) {
          row = 8;
          col = (el.number - 58) + 4; // place in columns 4 to 17
        }
        // Actinides row 9 (Th 90 to Lr 103)
        else if (el.number >= 90 && el.number <= 103) {
          row = 9;
          col = (el.number - 90) + 4; // place in columns 4 to 17
        }

        gridCells.push({ element: el, row, col, isPlaceholder: false });
      });

      // Lanthanide placeholder at Period 6, Group 3 (57 La or 57-71)
      gridCells.push({
        placeholderText: "57-71<br>La-Lu",
        row: 6,
        col: 3,
        isPlaceholder: true,
        category: "lanthanide"
      });

      // Actinide placeholder at Period 7, Group 3 (89 Ac or 89-103)
      gridCells.push({
        placeholderText: "89-103<br>Ac-Lr",
        row: 7,
        col: 3,
        isPlaceholder: true,
        category: "actinide"
      });

      let html = "";
      gridCells.forEach(item => {
        if (item.isPlaceholder) {
          html += `
            <div class="ptable-cell ptable-cell-placeholder cat-${item.category}" 
                 style="grid-row: ${item.row}; grid-column: ${item.col};"
                 onclick="window.PeriodicTable.filterCategory('${item.category}')"
                 title="Click to highlight ${item.category}">
              ${item.placeholderText}
            </div>
          `;
        } else {
          const el = item.element;
          const catClass = `cat-${el.category}`;
          html += `
            <div class="ptable-cell ${catClass}" 
                 id="ptCell_${el.number}"
                 data-num="${el.number}"
                 data-category="${el.category}"
                 style="grid-row: ${item.row}; grid-column: ${item.col};"
                 onclick="window.PeriodicTable.selectElement(${el.number})"
                 title="${el.name} (${el.symbol}) - Atomic No: ${el.number}, Mass: ${el.mass}">
              <div class="ptable-cell-top">
                <span class="ptable-cell-num">${el.number}</span>
                <span class="ptable-cell-mass">${Math.round(el.mass)}</span>
              </div>
              <div class="ptable-cell-symbol">${el.symbol}</div>
              <div class="ptable-cell-name">${el.name}</div>
            </div>
          `;
        }
      });

      grid.innerHTML = html;
    },

    // Render Bottom Legend with interactive radio buttons
    renderLegend() {
      const container = document.getElementById("ptableLegend");
      if (!container) return;

      let html = `
        <div class="ptable-legend-item is-active" data-cat="all" onclick="window.PeriodicTable.filterCategory('all')">
          <div class="ptable-radio-dot"></div>
          <span style="font-weight: 700;">All elements</span>
        </div>
      `;

      Object.keys(CATEGORIES).forEach(catKey => {
        const cat = CATEGORIES[catKey];
        html += `
          <div class="ptable-legend-item" data-cat="${catKey}" onclick="window.PeriodicTable.filterCategory('${catKey}')">
            <div class="ptable-radio-dot"></div>
            <div class="ptable-legend-swatch cat-${catKey}"></div>
            <span>${cat.name}</span>
          </div>
        `;
      });

      container.innerHTML = html;
    },

    // Filter by Category
    filterCategory(categoryKey) {
      this.activeFilter = categoryKey;

      // Update legend active pill
      document.querySelectorAll(".ptable-legend-item").forEach(item => {
        item.classList.toggle("is-active", item.getAttribute("data-cat") === categoryKey);
      });

      this.applyFilters();
    },

    applyFilters() {
      const query = this.searchQuery;
      const cat = this.activeFilter;

      ELEMENTS.forEach(el => {
        const cell = document.getElementById(`ptCell_${el.number}`);
        if (!cell) return;

        let matchCat = (cat === "all" || el.category === cat);
        let matchQuery = true;

        if (query) {
          const matchNum = String(el.number) === query;
          const matchSym = el.symbol.toLowerCase() === query;
          const matchName = el.name.toLowerCase().includes(query);
          const matchGroup = el.category.toLowerCase().includes(query);
          matchQuery = matchNum || matchSym || matchName || matchGroup;
        }

        const isVisible = matchCat && matchQuery;
        cell.classList.toggle("is-dimmed", !isVisible);
      });
    },

    updatePhases() {
      const t = this.temperatureK;
      ELEMENTS.forEach(el => {
        const cell = document.getElementById(`ptCell_${el.number}`);
        if (!cell) return;

        let phase = "Solid";
        if (el.mpK !== null && t < el.mpK) {
          phase = "Solid";
        } else if (el.bpK !== null && t > el.bpK) {
          phase = "Gas";
        } else if (el.mpK !== null && el.bpK !== null && t >= el.mpK && t <= el.bpK) {
          phase = "Liquid";
        }
        // Subtly indicate phase state if desired
      });
    },

    // Select Element and display in Inspector
    selectElement(atomicNumber) {
      const el = BY_NUM[atomicNumber];
      if (!el) return;

      this.selectedElement = el;

      // Highlight active cell
      document.querySelectorAll(".ptable-cell").forEach(c => c.classList.remove("is-selected"));
      const activeCell = document.getElementById(`ptCell_${el.number}`);
      if (activeCell) activeCell.classList.add("is-selected");

      // Update Bohr Atom 3D visualizer
      if (this.bohrVisualizer) {
        this.bohrVisualizer.setElement(el);
      }

      // Update Inspector UI
      this.renderInspector(el);
    },

    renderInspector(el) {
      const badge = document.getElementById("ptableBadge");
      const title = document.getElementById("ptableInspectorTitle");
      const cat = document.getElementById("ptableInspectorCategory");
      const summary = document.getElementById("ptableSummary");
      const props = document.getElementById("ptablePropsList");
      const industrial = document.getElementById("ptableIndustrialUse");

      if (badge) {
        badge.className = `ptable-inspector-badge cat-${el.category}`;
        badge.innerHTML = `
          <div class="ptable-badge-top">
            <span>${el.number}</span>
            <span>${Math.round(el.mass)}</span>
          </div>
          <div class="ptable-badge-symbol">${el.symbol}</div>
          <div class="ptable-badge-name">${el.name}</div>
        `;
      }

      if (title) title.textContent = el.name;
      if (cat) cat.textContent = CATEGORIES[el.category]?.name || "Unknown";

      if (summary) {
        const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(el.name)}`;
        summary.innerHTML = `
          ${el.summary}
          <a href="${wikiUrl}" target="_blank" rel="noopener noreferrer">Wikipedia</a>
        `;
      }

      if (props) {
        const densityStr = el.density ? `${el.density} g/cm³` : "Unknown";
        const mpStr = el.mpK ? `${el.mpK} K (${Math.round(el.mpK - 273.15)} °C)` : "Unknown";
        const bpStr = el.bpK ? `${el.bpK} K (${Math.round(el.bpK - 273.15)} °C)` : "Unknown";
        const shellsStr = el.shells ? el.shells.join(", ") : "--";

        props.innerHTML = `
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Atomic mass</span>
            <span class="ptable-prop-val">${el.mass} u</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Electron configuration</span>
            <span class="ptable-prop-val"><code>${el.config}</code></span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Electrons per shell</span>
            <span class="ptable-prop-val">${shellsStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Electronegativity (Pauling)</span>
            <span class="ptable-prop-val">${el.eneg ?? "Unknown"}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Phase at STP (25°C)</span>
            <span class="ptable-prop-val">${el.phase}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Melting point</span>
            <span class="ptable-prop-val">${mpStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Boiling point</span>
            <span class="ptable-prop-val">${bpStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Density</span>
            <span class="ptable-prop-val">${densityStr}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Discovery date</span>
            <span class="ptable-prop-val">${el.discDate}</span>
          </div>
          <div class="ptable-prop-row">
            <span class="ptable-prop-label">Discovered by</span>
            <span class="ptable-prop-val">${el.discBy}</span>
          </div>
        `;
      }

      if (industrial) {
        industrial.innerHTML = `
          <strong>🏭 Refinery, Piping & Material Integrity:</strong>
          ${el.industrial || "Important elemental component in industrial metallurgy, corrosion mechanisms, and chemical process thermodynamics."}
        `;
      }
    },

    toggleBohrAnimation() {
      if (this.bohrVisualizer) {
        const isPaused = this.bohrVisualizer.togglePause();
        const btn = document.getElementById("btnBohrPlayPause");
        if (btn) btn.textContent = isPaused ? "▶ Play" : "⏸ Pause";
      }
    },

    pauseBohrAnimation() {
      if (this.bohrVisualizer) {
        this.bohrVisualizer.pause();
      }
    },

    resumeBohrAnimation() {
      if (this.bohrVisualizer && this.selectedElement) {
        this.bohrVisualizer.updateDimensions();
        this.bohrVisualizer.start();
        const btn = document.getElementById("btnBohrPlayPause");
        if (btn) btn.textContent = "⏸ Pause";
      }
    },

    resetBohrView() {
      if (this.bohrVisualizer) {
        this.bohrVisualizer.resetView();
        const btn = document.getElementById("btnBohrPlayPause");
        if (btn) btn.textContent = "⏸ Pause";
      }
    }
  };

  window.PeriodicTable = PeriodicTable;

  // Auto-init if DOM ready and tab active
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      // Lazy init when subtab opens
    });
  }
})();
