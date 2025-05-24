// estimationModule.js
import { getCookie, toggleContainer, createVariableList } from "./Utils.js";

export function setupEstimationAnalysis(hot) {
  const estimasiOutput = document.getElementById("estimasi-output");
  let selectedVariables = {};
  let headers = [];

  document.getElementById("menu-estimasi").addEventListener("click", function () {
    toggleContainer("estimasi-container");
    const headers = hot.getData()[0];
    estimasiOutput.innerHTML = "";

    displayEstimasiStatistics(headers);

    // Create main container
    const mainContainer = document.createElement("div");
    mainContainer.className = "estimasi-main-container";
    estimasiOutput.appendChild(mainContainer);
  });

  function displayEstimasiStatistics(headers) {
    estimasiOutput.appendChild(createVariableList(headers, handleCheckboxEstimasi));
  }

  function handleCheckboxEstimasi(event) {
    const variableName = event.target.dataset.variable;
    const allData = hot.getData();

    if (headers.length === 0) {
      headers = allData[0];
    }

    selectedVariables[variableName] = event.target.checked;

    const selectedData = {};
    for (const variable in selectedVariables) {
      if (selectedVariables[variable]) {
        const index = headers.indexOf(variable);
        if (index !== -1) {
          const data = allData
            .slice(1)
            .map((row) => row[index])
            .filter(Boolean);
          selectedData[variable] = data;
        } else {
          console.error(`Variable ${variable} tidak ditemukan di headers`);
        }
      }
    }

    console.log("Data yang akan dikirim ke server:", selectedData);

    clearPreviousResults();

    if (Object.keys(selectedData).length === 0) {
      return;
    }

    fetchEstimasiData(selectedData);
  }

  function fetchEstimasiData(selectedData) {
    showLoadingIndicator();

    fetch("/get-survival/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(selectedData),
    })
      .then(handleApiResponse)
      .then((apiResponse) => {
        hideLoadingIndicator();
        if (apiResponse.error) {
          throw new Error(apiResponse.error);
        }
        generateEstimasiResponse(apiResponse);
      })
      .catch((error) => {
        hideLoadingIndicator();
        console.error("Error:", error);
        displayError(getUserFriendlyError(error));
      });
  }

  function handleApiResponse(response) {
    if (!response.ok) {
      return response.json().then((err) => {
        const statusErrorMap = {
          400: "Invalid request data",
          401: "Authentication required",
          403: "Permission denied",
          404: "Endpoint not found",
          429: "Too many requests. Please slow down.",
          500: "Internal server error",
        };

        const errorMessage = err.error || statusErrorMap[response.status] || "Request failed";
        throw new Error(errorMessage);
      });
    }
    return response.json();
  }

  function getUserFriendlyError(error) {
    const errorMap = {
      "Failed to fetch": "Network connection failed. Please check your internet.",
      quota: "API quota exceeded. Please check your plan.",
      insufficient_quota: "API quota exhausted. Please upgrade your plan.",
      timeout: "Request timed out. Please try again.",
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.message.includes(key)) return message;
    }
    return error.message || "An unknown error occurred";
  }

  function clearPreviousResults() {
    document.querySelectorAll(".estimasi-item, .error-message, .loading-indicator").forEach((el) => el.remove());
  }

  function showLoadingIndicator() {
    clearPreviousResults();
    const loader = document.createElement("div");
    loader.className = "loading-indicator";
    loader.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 30px;
        color: #2b2d42;
        background-color: #f8f9fa;
        border-radius: 8px;
        margin: 20px 0;
        width: 90%;
      ">
        <svg style="width: 40px; height: 40px; margin-bottom: 15px; animation: spin 1s linear infinite;" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
        </svg>
        <div style="font-size: 14px; color: #6c757d; margin-top: 5px;">This may take a few moments</div>
      </div>
    `;
    estimasiOutput.appendChild(loader);
  }

  function hideLoadingIndicator() {
    document.querySelector(".loading-indicator")?.remove();
  }

  function displayError(message) {
    clearPreviousResults();

    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `
      <div style="
        padding: 16px;
        margin: 10px 0;
        border: 1px solid #ffb4a9;
        background-color: #ffdbd6;
        color: #c1121f;
        border-radius: 8px;
        display: flex;
        align-items: flex-start;
        font-size: 14px;
        width: 90%;
      ">
        <svg style="flex-shrink: 0; width: 20px; height: 20px; margin-right: 12px; margin-top: 2px;" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        </svg>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Error Processing Request</div>
          <div>${message}</div>
          <div style="margin-top: 8px; font-size: 13px; color: #7a0c00;">
            Please try again or contact support if the problem persists.
          </div>
        </div>
      </div>
    `;
    estimasiOutput.appendChild(errorDiv);
  }

  function generateEstimasiResponse(apiResponse) {
    const estimasiDiv = document.createElement("div");
    estimasiDiv.className = "estimasi-item";
    estimasiDiv.dataset.variable = "survival-analysis";

    let content = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <button class="download-pdf" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 0.8rem;margin-top: 25px;">
            Download PDF
          </button>
        </div>
      </div>
    `;

    // Distribution Comparison Table
    if (apiResponse.all_distributions_results && Object.keys(apiResponse.all_distributions_results).length > 0) {
      content += `
        <div style="margin-bottom: 24px;">
          <h3 style="margin-bottom: 12px;margin-top:12px; color: #2b2d42;">Comparison AIC dan BIC</h3>
          <div style="overflow-x: auto;">
            <table class="distributions-table" style="width: 90%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                  <th style="padding: 12px; text-align: left;">Distribution</th>
                  <th style="padding: 12px; text-align: left;">AIC</th>
                  <th style="padding: 12px; text-align: left;">BIC</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(apiResponse.all_distributions_results)
                  .map(
                    ([dist, result]) => `
                    <tr style="border-bottom: 1px solid #dee2e6;">
                      <td style="padding: 12px;">${dist}</td>
                      <td style="padding: 12px;">${formatStatValue(result.aic)}</td>
                      <td style="padding: 12px;">${formatStatValue(result.bic)}</td>
                    </tr>
                  `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Find the distribution with the smallest AIC and BIC
      let bestAicDist = null;
      let bestAicValue = Infinity;
      let bestBicDist = null;
      let bestBicValue = Infinity;

      Object.entries(apiResponse.all_distributions_results).forEach(([dist, result]) => {
        // AIC comparison
        if (result.aic < bestAicValue) {
          bestAicValue = result.aic;
          bestAicDist = dist;
        }
        // BIC comparison
        if (result.bic < bestBicValue) {
          bestBicValue = result.bic;
          bestBicDist = dist;
        }
      });

      // Analysis Final Section
      content += `
        <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; width: 90%;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: #2b2d42;">Statistical Analysis Final</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">Best by AIC</div>
              <div style="font-size: 16px; font-weight: 500;">${bestAicDist || "N/A"}</div>
              <div style="font-size: 12px; color: #6c757d;">AIC: ${bestAicValue.toFixed(2)}</div>
            </div>
            <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">Best by BIC</div>
              <div style="font-size: 16px; font-weight: 500;">${bestBicDist || "N/A"}</div>
              <div style="font-size: 12px; color: #6c757d;">BIC: ${bestBicValue.toFixed(2)}</div>
            </div>
            ${
              bestAicDist === bestBicDist
                ? `
            <div style="background-color: #e8f5e9; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #2e7d32; margin-bottom: 4px;">Consensus</div>
              <div style="font-size: 16px; font-weight: 500; color: #2e7d32;">${bestAicDist}</div>
              <div style="font-size: 12px; color: #2e7d32;">AIC and BIC agree</div>
            </div>
            `
                : `
            <div style="background-color: #fff3e0; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #e65100; margin-bottom: 4px;">Note</div>
              <div style="font-size: 14px; color: #e65100;">AIC and BIC disagree</div>
              <div style="font-size: 12px; color: #e65100;">Consider model complexity</div>
            </div>
            `
            }
          </div>
          <div style="margin-top: 12px; font-size: 14px; color: #495057;">
            <p style="margin: 8px 0; font-size: 0.8rem;"><strong>AIC (Akaike Information Criterion):</strong> Favors models with better fit but penalizes complexity (lower is better).</p>
            <p style="margin: 8px 0; font-size: 0.8rem;"><strong>BIC (Bayesian Information Criterion):</strong> Stronger penalty for complex models, better for larger datasets (lower is better).</p>
            ${
              bestAicDist !== bestBicDist
                ? `
            <p style="margin: 8px 0; color: #d32f2f;"><strong>Note:</strong> When AIC and BIC disagree, consider BIC for larger datasets as it penalizes complexity more strongly.</p>
            `
                : ""
            }
          </div>
        </div>
      `;
    }

    // Original LLM Analysis Results
    content += `
      <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px; width: 90%;">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #2b2d42;">Analysis Results From LLM</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
          <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">Best Distribution</div>
            <div style="font-size: 16px; font-weight: 500;">${apiResponse.predicted_distribution || "N/A"}</div>
          </div>
          
          ${
            apiResponse.params
              ? `
            <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">Parameters</div>
              <div style="font-size: 16px; font-weight: 500;">
                ${Object.entries(apiResponse.params)
                  .map(([key, value]) => `${key}: ${value !== null && value !== undefined ? (typeof value === "number" ? value.toFixed(4) : value) : "N/A"}`)
                  .join(", ")}
              </div>
            </div>
          `
              : ""
          }
          
          ${
            apiResponse.aic !== undefined && apiResponse.aic !== null
              ? `
            <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">AIC Score</div>
              <div style="font-size: 16px; font-weight: 500;">${apiResponse.aic.toFixed(2)}</div>
            </div>
          `
              : `
            <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">AIC Score</div>
              <div style="font-size: 16px; font-weight: 500;">N/A</div>
            </div>
          `
          }

          ${
            apiResponse.bic !== undefined && apiResponse.bic !== null
              ? `
          <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">BIC Score</div>
            <div style="font-size: 16px; font-weight: 500;">${apiResponse.bic.toFixed(2)}</div>
          </div>
        `
              : `
          <div style="background-color: white; padding: 12px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="font-size: 13px; color: #6c757d; margin-bottom: 4px;">BIC Score</div>
            <div style="font-size: 16px; font-weight: 500;">N/A</div>
          </div>
        `
          }
        </div>
      </div>
    `;

    estimasiDiv.innerHTML = content;
    estimasiOutput.querySelector(".estimasi-main-container").appendChild(estimasiDiv);

    // Add PDF generation handler
    estimasiDiv.querySelector(".download-pdf").addEventListener("click", async () => {
      await generatePDF(estimasiDiv);
    });
  }

  // Add this new function for PDF generation
  async function generatePDF(container) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title with improved styling
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.text("Survival Analysis Report", 105, 20, { align: "center" });

    // Add date with better formatting
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated on: ${new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
      105,
      28,
      { align: "center" }
    );

    // Add section header for distributions table
    doc.setFontSize(14);
    doc.setTextColor(43, 45, 66);
    doc.setFont("helvetica", "bold");
    doc.text("Comparison of AIC and BIC Values", 15, 40);

    // Convert distributions table to PDF with improved styling
    const distributionsTable = container.querySelector(".distributions-table");
    if (distributionsTable) {
      doc.autoTable({
        html: distributionsTable,
        startY: 45,
        styles: {
          fontSize: 10,
          cellPadding: 4,
          lineWidth: 0.25,
          textColor: [33, 37, 41],
        },
        headStyles: {
          fillColor: [248, 249, 250],
          textColor: [33, 37, 41],
          fontStyle: "bold",
          lineWidth: 0.5,
        },
        bodyStyles: {
          lineWidth: 0.25,
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: "bold" },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
        },
        didDrawPage: function (data) {
          // Footer
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text("Survival Analysis Report", data.settings.margin.left, doc.internal.pageSize.height - 10);
        },
      });
    }

    // Get current position after table
    let yPosition = doc.lastAutoTable?.finalY + 15 || 60;

    // Add analysis sections with improved structure
    const sections = container.querySelectorAll("div[style*='background-color: #f8f9fa']");

    for (const section of sections) {
      // Check for page break
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // Add section title
      const title = section.querySelector("h3")?.textContent;
      if (title) {
        doc.setFontSize(14);
        doc.setTextColor(43, 45, 66);
        doc.setFont("helvetica", "bold");
        doc.text(title, 15, yPosition);
        yPosition += 10;
      }

      // Add content blocks with better formatting
      const contentBlocks = section.querySelectorAll("div[style*='background-color: white']");
      for (const block of contentBlocks) {
        const label = block.querySelector("div[style*='font-size: 13px']")?.textContent;
        const value = block.querySelector("div[style*='font-size: 16px']")?.textContent;

        if (label && value) {
          // Label
          doc.setFontSize(10);
          doc.setTextColor(108, 117, 125);
          doc.setFont("helvetica", "italic");
          doc.text(label, 20, yPosition);
          yPosition += 5;

          // Value
          doc.setFontSize(12);
          doc.setTextColor(33, 37, 41);
          doc.setFont("helvetica", "bold");
          doc.text(value, 20, yPosition);
          yPosition += 10;
        }
      }

      // Add additional notes if present
      const notes = section.querySelectorAll("p");
      for (const note of notes) {
        const text = note.textContent;
        if (text) {
          doc.setFontSize(9);
          doc.setTextColor(73, 80, 87);
          doc.setFont("helvetica", "normal");

          // Split long text into multiple lines
          const lines = doc.splitTextToSize(text, 180);
          doc.text(lines, 15, yPosition);
          yPosition += lines.length * 5 + 5;
        }
      }

      yPosition += 10;
    }

    // Add final touches
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("End of Report", 105, yPosition, { align: "center" });

    // Save the PDF
    doc.save("survival_analysis_report.pdf");
  }

  function formatStatValue(value) {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      // Format p-values specially
      if (value.toString().includes("e-")) {
        return value.toExponential(2);
      }
      return value.toFixed(4);
    }
    return value;
  }
}
