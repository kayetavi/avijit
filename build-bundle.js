import fs from "fs";
import path from "path";
import { minify } from "terser";
import CleanCSS from "clean-css";

const cssFilesToBundle = [
  "assets/css/style.css",
  "assets/css/scec8div1.css",
  "assets/css/crackingmechanism.css",
  "assets/css/remaininglife.css",
  "assets/css/Damage_criteria.css",
  "assets/css/Toxic.css",
  "assets/css/simple.css",
  "assets/css/probability.css",
  "assets/css/inventory.css",
  "assets/css/bk_stress.css",
  "assets/css/chatbot.css",
  "assets/css/inspectionconfidence.css",
  "assets/css/api581cof.css",
  "assets/css/stylePipe883.css",
  "assets/css/global-style.css",
  "assets/css/Flowdiagrams.css",
  "assets/css/cduvdu.css",
  "assets/css/msp.css",
  "assets/css/h2u.css",
  "assets/css/dark-mode.css",
  "assets/css/chemical-suite.css",
  "assets/css/periodic-table.css",
  "assets/css/stream-comparator.css",
  "assets/css/unit-converter.css",
  "assets/css/admin-control-center.css",
  "assets/css/ccd-ai-platform.css",
  "assets/css/structural-thickness.css"
];

const filesToBundle = [
  // 1. Session & Auth Security (installs global safe JSON stringify and API fetch interceptor)
  "js/firebase-auth.js",

  // 2. Calculation modules & utilities
  "js/chart.js",
  "js/fluid-selector.js",
  "js/chatbot.js",
  "js/inventory.js",
  "js/inspectioncofidence.js",
  "js/pipeDataScript_883.js",
  "js/bk_stressData.js",
  "js/bk_stressscript.js",
  "js/bk_stress_dataloader.js",
  "js/b313.js",
  "js/simple.js",
  "js/viiidiv1.js",
  "js/remaining.js",
  "js/Toxic.js",
  "js/data.js",
  "js/Damagemechanism.js",
  "js/main.js",
  "js/main-cduvdu.js",
  "js/msp.js",
  "js/h2u.js",
  "js/categoryLoader.js",
  "js/search.js",
  "js/mechanism.js",
  "js/global-script.js",
  "js/probability.js",
  "js/api581.js",
  "js/savedata.js",
  "js/Damage_mechanisms_criteria.js",
  "js/bulkupload.js",
  "js/logic.js",

  // 3. RBAC, Navigation, Chemistry, Converters & Visualizers
  "js/rbac.js",
  "js/recent-tabs.js",
  "js/chemical-suite.js",
  "js/structural-thickness.js",
  "js/stream-comparator.js",
  "js/unit-converter.js",
  "js/periodic-table.js",
  "js/nace-classifier.js",
  "js/injection-mixing-viz.js",
  "js/ccd-ai-platform.js",
  "js/corrosion-rate.js",
  "js/damage-explorer.js",

  // 4. Admin Management Center
  "js/admin-panel.js",

  // 5. Dashboard Shell UI State & Controls
  "js/dashboard-shell.js",

  // 6. Enterprise APM Deep Router & Template Manager
  "js/apm-router.js"
];

async function minifySingle(srcFile, outFile) {
  if (!fs.existsSync(srcFile)) {
    console.warn(`File not found for minification: ${srcFile}`);
    return;
  }
  const code = fs.readFileSync(srcFile, "utf8");
  const minified = await minify(code, {
    ecma: 2020,
    sourceMap: false,
    mangle: { toplevel: false },
    compress: { drop_debugger: true },
    format: { comments: false }
  });
  if (minified.error) {
    console.error(`Minification error for ${srcFile}:`, minified.error);
    process.exit(1);
  }
  fs.writeFileSync(outFile, minified.code, "utf8");
  console.log(`Successfully generated standalone minified script: ${outFile} (${minified.code.length} characters)`);
}

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

  console.log("Bundling calculation, logic and shell scripts into assets/app-engine.min.js...");
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

  // Also compile auxiliary standalone scripts so raw JS in /js/ is never exposed
  await minifySingle("js/login.js", path.resolve("assets/login.min.js"));
  await minifySingle("js/help.js", path.resolve("assets/help.min.js"));
  await minifySingle("js/dashboard-preload.js", path.resolve("assets/dashboard-preload.min.js"));
}

bundle().catch(err => {
  console.error("Bundle failure:", err);
  process.exit(1);
});
