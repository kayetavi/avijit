export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { password } = req.body;

  if (password !== "avijit123") {
    return res.status(401).json({ message: "Incorrect password!" });
  }

  const data = {
    corrosion_rate: "CR = (t_initial - t_final) / (years_elapsed)   (mm/year)",
    remaining_life: "years_remaining = (t_current - Tmin) / CR",

    b31_3: `
t_design = (P × D) / (2 × (S × E × W + P × Y))

Where:
P = Internal design pressure (MPa)
D = Outside diameter (mm)
S = Allowable stress (MPa)
E = Joint efficiency (decimal, 0–1)
W = Weld / high-temperature factor
Y = Coefficient from ASME B31.3 Table
    `,

    asme_viii: `
All inputs converted to base units before calculation:
- Pressure → MPa
- Lengths (D, R) → mm
- Stress → MPa

1) Cylindrical Shell (UG-27(c)(1)):
   t = (P × R) / (S × E − 0.6 × P)

2) Ellipsoidal Head (UG-32(c)):
   t = (P × D) / (2 × S × E − 0.2 × P)

3) Torispherical Head (UG-32(d)):
   t = (0.885 × P × D) / (S × E − 0.1 × P)

4) Hemispherical Head (UG-32(e)):
   t = (P × D) / (2 × S × E − 0.2 × P)

Variables:
P = internal design pressure (MPa)
D = inside/mean diameter used in calc (mm)
R = inside/mean radius used in calc (mm)
S = allowable stress at design temperature (MPa)
E = weld joint efficiency (0–1)
    `,

    internal_corrosion_category: `
Internal Corrosion Category (Based on CF and Wall Ratio)

1. Wall Loss:
   Wall Loss = Corrosion Rate × Years In Service

2. Remaining Wall Thickness:
   Remaining  Wall Thickness = Nominal Thickness − Wall Loss

3. Wall Ratio:
   Wall Ratio = Nominal Thickness - Wall Loss ÷ Required Thickness

4. Remaining Life: 
   Remaining Life = Remaining Wall Thickness - Required Thickness ÷ Corrosion Rate
   
5. Estimated Half-Life : 
   Estimated Half-Life = Remaining Life ÷ 2

   
6. Internal Corrosion Factor (CF):
   CF = (Operating Time × Corrosion Rate) ÷ Remaining Thickness

7. Category Assignment (based on CF):
   - CF ≥ 1000           → Category 1
   - 100 ≤ CF < 1000     → Category 2
   - 10 ≤ CF < 100       → Category 3
   - 1 ≤ CF < 10         → Category 4
   - CF < 1              → Category 5

8. Adjustment Rule (if Wall Ratio < 1):
   Final Category = max(1, Initial Category − 2)

9. Fractional Wall Ratio:
    FWR = (Corrosion Rate × Years in Service) ÷ Nominal Thickness
  
     
10. Damage Factor (DF):
   DF represents the probability of failure due to internal corrosion and is used in Risk-Based Inspection (RBI) calculations.

**DF Calculation Using ART Tables:**

   - Calculate Fractional Wall Ratio (FWR):
     FWR = Remaining Thickness ÷ Nominal Thickness

   - Determine Corrosion Rate (CR), Equipment Age (years), FWR.

   - Check ART (Assessment and Risk Tool) tables with:
     - Corrosion Rate (CR)
     - Equipment Age
     - Fractional Wall Ratio (FWR)
     - Number of previous inspections
     - Confidence Level in inspection results (Very High - VH, High - H, Medium - M, Low - L)

   - ART tables provide a DF value based on the combination of above parameters.

 
───────────────────────────────────────────────
**Example:**

Given:
- Years In Service = 5 years
- Corrosion Rate = 1.5 mm/year
- Nominal Thickness = 10 mm
- Required Thickness = 8 mm

Step 1: Calculate Wall Loss  
Wall Loss = 1.5 × 5 = 7.5 mm  

Step 2: Calculate Remaining Thickness  
Remaining Thickness = 10 − 7.5 = 2.5 mm  

Step 3: Remaining Life  
Remaining Life = 2.5 - 8 ÷ 1.5 = 8.66  

Step 4: Estimated Half-Life  
Estimated Half-Life = 8.66 ÷ 2 = 4.38

Step 5: Calculate Wall Ratio  
Wall Ratio = 10 -7.5 ÷ 8 = 0.3125

Step 6: Calculate Corrosion Factor (CF)  
CF = (5 × 1.5) ÷ 2.5 = 3.0  

Step 7: Assign Category based on CF  
Category = 4 (since 1 ≤ CF < 10)  

Step 8: Apply Adjustment Rule (Wall Ratio < 1)  
Adjusted Category = max(1, 4 − 2) = 2  

✅ Final Internal Corrosion Category: 2

Step 7: Fractional Wall Ratio:

 Example:
     Selected Corrosion Rate = 0.726 mm/year
     Years In Service = 10 year
     Nominal Thickness = 14 mm
     Wall Ratio = 0.726 x 10 ÷ 14 = 0.5185

Step 9: Damage Factor (DF):


**DF Calculation Example Using ART:**

 Example:
Calculate Fractional Wall Ratio:  
FWR = 0.5185

Use ART tables with CR = 0.726, Age = 10, FWR = 0.51, along with number of inspections and confidence level (VH, H, M, L) to find the Damage Factor (DF).
    `,

    mill_tolerance_text: `
Mill Tolerance (API 5L, IS, Others):

API 5L (Seamless):
  t_nom ≤ 4 mm → 0.5 mm
  4 < t_nom < 25 mm → 0.125 × t_nom
  t_nom ≥ 25 mm → 0.1 × t_nom

API 5L (Welded):
  t_nom ≤ 5 mm → 0.5 mm
  5 < t_nom < 15 mm → 0.1 × t_nom
  t_nom ≥ 15 mm → 1.5 mm

(IS / others per table below)

Mill_Tolerance = t_nominal × Mill_Tolerance - CA
    `,

    mill_tolerance_table: [
      { material: "A53", type: "%", value: "12.5%" },
      { material: "A106", type: "%", value: "12.5%" },
      { material: "A312/A312M", type: "%", value: "12.5%" },
      { material: "A530", type: "%", value: "12.5%" },
      { material: "A790", type: "%", value: "12.5%" },
      { material: "A135 / A135M", type: "%", value: "12.5%" },
      { material: "A358 / A358M", type: "mm", value: "0.3 mm" },
      { material: "A409 / A409M", type: "mm", value: "0.46 mm" },
      { material: "A451 / A451M", type: "mm", value: "0.3 mm" },
      { material: "A524", type: "%", value: "12.5%" },
      { material: "A587", type: "%", value: "12.5%" },
      { material: "A671 / A671M", type: "mm", value: "0.3 mm" },
      { material: "A672 / A672M", type: "mm", value: "0.3 mm" },
      { material: "A691 / A691M", type: "mm", value: "0.3 mm" },
      { material: "IS-3589 (SAW & Seamless Pipe)", type: "%", value: "12.5%" },
      { material: "IS-3589 (ERW Pipe)", type: "%", value: "10%" },
      { material: "IS-1239 (Welded: Light Tubes)", type: "%", value: "8%" },
      { material: "IS-1239 (Welded: Medium/Heavy)", type: "%", value: "10%" },
      { material: "IS-1239 (Seamless)", type: "%", value: "12.5%" }
    ],

    volume_formulas: {
      cylinder: "V = π × r² × L",
      sphere: "V = (4/3) × π × r³",
      frustum: "V = (1/3) × π × h × (R² + R × r + r²)",
      hemispherical_head: "V = (2/3) × π × r³",
      ellipsoidal_head: "V = (π / 24) × D³   (for 2:1 ellipsoidal head)",
      torispherical_head: "V ≈ 0.9 × π × r² × (D / 4)"
    }
  };

  return res.status(200).json(data);
}
