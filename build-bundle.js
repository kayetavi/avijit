import fs from "fs";
import path from "path";
import { minify } from "terser";
import CleanCSS from "clean-css";

const cssFilesToBundle = [
  "style.css",
  "scec8div1.css",
  "crackingmechanism.css",
  "remaininglife.css",
  "Damage_criteria.css",
  "Toxic.css",
  "simple.css",
  "probability.css",
  "inventory.css",
  "bk_stress.css",
  "chatbot.css",
  "inspectionconfidence.css",
  "api581cof.css",
  "stylePipe883.css",
  "global-style.css",
  "Flowdiagrams.css",
  "cduvdu.css",
  "msp.css",
  "h2u.css",
  "dark-mode.css",
  "chemical-suite.css",
  "periodic-table.css",
  "stream-comparator.css",
  "unit-converter.css",
  "admin-control-center.css",
  "ccd-ai-platform.css",
  "structural-thickness.css"
];

const filesToBundle = [
  "chart.js",
  "fluid-selector.js",
  "chatbot.js",
  "inventory.js",
  "inventoryChart.js",
  "cylinderviz.js",
  "inspectioncofidence.js",
  "pipeDataScript_883.js",
  "bk_stressData.js",
  "bk_stressscript.js",
  "bk_stress_dataloader.js",
  "b313.js",
  "simple.js",
  "viiidiv1.js",
  "remaining.js",
  "Toxic.js",
  "data.js",
  "Damagemechanism.js",
  "main.js",
  "main-cduvdu.js",
  "msp.js",
  "h2u.js",
  "categoryLoader.js",
  "search.js",
  "mechanism.js",
  "global-script.js",
  "probability.js",
  "api581.js",
  "savedata.js",
  "Damage_mechanisms_criteria.js",
  "bulkupload.js",
  "js/logic.js",
  "js/rbac.js",
  "js/recent-tabs.js",
  "chemical-suite.js",
  "structural-thickness.js",
  "stream-comparator.js",
  "unit-converter.js",
  "injection-mixing-viz.js"
];

async function bundle() {
  console.log("Bundling CSS stylesheets into assets/app-bundle.min.css...");
  let combinedCSS = "";
  for (const file of cssFilesToBundle) {
    if (!fs.existsSync(file)) {
      console.warn(`CSS file not found, skipping: ${file}`);
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    combinedCSS += `\n/* CSS: ${file} */\n${content}\n`;
  }

  const cleanedCSS = new CleanCSS({ level: 1 }).minify(combinedCSS);
  const cssOutPath = path.resolve("assets/app-bundle.min.css");
  fs.writeFileSync(cssOutPath, cleanedCSS.styles, "utf8");
  console.log(`Successfully generated CSS bundle: ${cssOutPath} (${cleanedCSS.styles.length} characters)`);

  console.log("Bundling calculation and logic scripts into assets/app-engine.min.js...");
  let combinedCode = "";

  for (const file of filesToBundle) {
    if (!fs.existsSync(file)) {
      console.warn(`JS File not found, skipping: ${file}`);
      continue;
    }
    const content = fs.readFileSync(file, "utf8");
    combinedCode += `\n/* Module: ${file} */\n${content};\n`;
  }

  console.log(`Combined raw JS code length: ${combinedCode.length} characters`);

  const minified = await minify(combinedCode, {
    ecma: 2020,
    sourceMap: false,
    mangle: {
      toplevel: false // preserve global functions called by HTML onclick/onchange handlers
    },
    compress: {
      drop_console: false,
      drop_debugger: true
    },
    format: {
      comments: false // strip all proprietary comments
    }
  });

  if (minified.error) {
    console.error("Minification error:", minified.error);
    process.exit(1);
  }

  const outPath = path.resolve("assets/app-engine.min.js");
  fs.writeFileSync(outPath, minified.code, "utf8");
  console.log(`Successfully generated protected JS bundle: ${outPath} (${minified.code.length} characters)`);
}

bundle().catch(err => {
  console.error("Bundle failure:", err);
  process.exit(1);
});
