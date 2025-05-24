// main.js
import { initializeTable } from "./TableModule.js";
import { setupDescriptiveAnalysis } from "./DescriptiveModule.js";
import { setupSurvivalAnalysis } from "./SurvivalModule.js";
import { setupEstimationAnalysis } from "./EstimationModule.js";
import { setupDataHandlers } from "./DataHandlers.js";

document.addEventListener("DOMContentLoaded", function () {
  // Initialize the table
  const hot = initializeTable();

  // Setup analysis modules
  setupDescriptiveAnalysis(hot);
  setupSurvivalAnalysis(hot);
  setupEstimationAnalysis(hot);

  // Setup data import/export/clear handlers
  setupDataHandlers(hot);
});
