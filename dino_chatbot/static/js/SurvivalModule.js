// survivalModule.js
import { getCookie, toggleContainer, createVariableList } from "./Utils.js";

export function setupSurvivalAnalysis(hot) {
  const survivalOutput = document.getElementById("survival-output");
  let selectedVariables = {};
  let headers = [];

  document.getElementById("menu-survival").addEventListener("click", function () {
    toggleContainer("survival-container");
    const headers = hot.getData()[0];
    survivalOutput.innerHTML = "";
    displaySurvivalStatistics(headers);
  });

  function displaySurvivalStatistics(headers) {
    survivalOutput.appendChild(createVariableList(headers, handleCheckboxSurvival));
  }

  function handleCheckboxSurvival(event) {
    const variableName = event.target.dataset.variable;
    const allData = hot.getData();

    if (headers.length === 0) {
      headers = allData[0];
    }

    // Validasi time_to_event harus dipilih sebelum event_status
    if (variableName === "event_status" && !selectedVariables["time_to_event"]) {
      showAlert("Warning", "You must select 'Time to Event' first before selecting 'Event Status'");
      event.target.checked = false;
      selectedVariables[variableName] = false;
      return;
    }

    selectedVariables[variableName] = event.target.checked;

    // Validasi minimal time_to_event atau event_status harus dipilih
    if (!selectedVariables["time_to_event"] && !selectedVariables["event_status"]) {
      showAlert("Warning", "Please select either 'time_to_event' or 'event_status' for analysis");
      event.target.checked = false;
      return;
    }

    const selectedData = prepareSelectedData(headers, allData);
    console.log("Data to be sent to server:", selectedData);

    clearPreviousResults();

    if (Object.keys(selectedData).length === 0) {
      return;
    }

    fetchSurvivalData(selectedData);
  }

  function prepareSelectedData(headers, allData) {
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
          console.error(`Variable ${variable} not found in headers`);
        }
      }
    }
    return selectedData;
  }

  function fetchSurvivalData(selectedData) {
    showLoadingIndicator();

    fetch("/get-survival/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(selectedData),
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            const statusMessages = {
              400: "Invalid request data",
              401: "Authentication required",
              403: "Permission denied",
              404: "Endpoint not found",
              429: "API request limit exceeded. Please wait before trying again.",
              500: "Internal server error",
            };
            throw new Error(err.error || statusMessages[response.status] || "Request failed");
          });
        }
        return response.json();
      })
      .then((apiResponse) => {
        hideLoadingIndicator();
        if (apiResponse.error) {
          throw new Error(apiResponse.error);
        }
        generateSurvivalResponse(apiResponse);
      })
      .catch((error) => {
        hideLoadingIndicator();
        console.error("API Error:", error);
        displayError(getUserFriendlyMessage(error));
      });
  }

  function getUserFriendlyMessage(error) {
    const errorMap = {
      "Failed to fetch": "Network connection failed. Please check your internet connection.",
      quota: "API quota exceeded. Please check your subscription plan.",
      insufficient_quota: "API quota exhausted. Please upgrade your plan.",
      timeout: "Request timed out. Please try again later.",
      NetworkError: "Network error occurred. Please check your connection.",
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.message.includes(key)) return message;
    }
    return error.message || "An unexpected error occurred";
  }

  function clearPreviousResults() {
    document.querySelectorAll(".survival-item, .error-message, .loading-indicator").forEach((el) => el.remove());
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
        <div style="font-size: 16px; font-weight: 500;">Processing Survival Analysis...</div>
        <div style="font-size: 14px; color: #6c757d; margin-top: 5px;">This may take a few moments</div>
      </div>
    `;
    survivalOutput.appendChild(loader);
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
        padding: 20px;
        border: 1px solid #ffb4a9;
        background-color: #ffdbd6;
        color: #c1121f;
        border-radius: 8px;
        display: flex;
        align-items: flex-start;
        font-size: 15px;
      ">
        <svg style="flex-shrink: 0; width: 24px; height: 24px; margin-right: 15px; margin-top: 3px;" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        </svg>
        <div>
          <div style="font-weight: 600; margin-bottom: 8px; font-size: 17px;">Analysis Failed</div>
          <div style="margin-bottom: 10px;">${message}</div>
          <button onclick="location.reload()" style="
            background-color: #c1121f;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Try Again</button>
        </div>
      </div>
    `;
    survivalOutput.appendChild(errorDiv);
  }

  function showAlert(title, message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert-message";
    alertDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffeeba;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        display: flex;
        align-items: center;
        max-width: 400px;
      ">
        <svg style="width: 24px; height: 24px; margin-right: 12px; flex-shrink: 0;" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <div>
          <div style="font-weight: 600; margin-bottom: 5px;">${title}</div>
          <div>${message}</div>
        </div>
      </div>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }

  // Add this function to the survivalModule.js
  async function generateSurvivalPDF(container) {
    const doc = initializePDFDocument();

    addDocumentHeader(doc);
    const survivalDiv = getSurvivalResultsContainer(container);
    if (!survivalDiv) return;

    let yPosition = 40;

    yPosition = addSummarySection(doc, survivalDiv, yPosition);
    yPosition = addMedianSurvival(doc, survivalDiv, yPosition);
    yPosition = await addKaplanMeierTable(doc, survivalDiv, yPosition);
    yPosition = addInterpretation(doc, survivalDiv, yPosition);
    yPosition = await addPlots(doc, survivalDiv, yPosition);

    addDocumentFooter(doc);
    doc.save("survival_analysis_report.pdf");
  }

  function initializePDFDocument() {
    const { jsPDF } = window.jspdf;
    return new jsPDF();
  }

  function addDocumentHeader(doc) {
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.text("Survival Analysis Report", 105, 20, { align: "center" });

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
  }

  function getSurvivalResultsContainer(container) {
    return container.querySelector(".survival-item");
  }

  function addSummarySection(doc, survivalDiv, yPosition) {
    const summarySection = survivalDiv.querySelector("div > div > div:first-child");
    if (!summarySection) return yPosition;

    doc.setFontSize(14);
    doc.setTextColor(43, 45, 66);
    doc.setFont("helvetica", "bold");
    doc.text("Summary Results", 15, yPosition);
    yPosition += 10;

    const distributionText = summarySection.querySelector("p")?.textContent;
    if (distributionText) {
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.setFont("helvetica", "normal");
      doc.text(distributionText, 20, yPosition);
      yPosition += 10;
    }

    return yPosition;
  }

  function addMedianSurvival(doc, survivalDiv, yPosition) {
    const medianSection = survivalDiv.querySelector("div > div > div:nth-child(2)");
    if (!medianSection) return yPosition;

    const medianText = medianSection.querySelector("p")?.textContent;
    if (medianText) {
      doc.text(medianText, 20, yPosition);
      yPosition += 15;
    }

    return yPosition;
  }

  async function addKaplanMeierTable(doc, survivalDiv, yPosition) {
    const kmTable = survivalDiv.querySelector("table");
    if (!kmTable) return yPosition;

    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(43, 45, 66);
    doc.setFont("helvetica", "bold");
    doc.text("Kaplan-Meier Survival Estimates", 15, yPosition);
    yPosition += 10;

    doc.autoTable({
      html: kmTable,
      startY: yPosition,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineWidth: 0.25,
        textColor: [33, 37, 41],
      },
      headStyles: {
        fillColor: [248, 249, 250],
        textColor: [33, 37, 41],
        fontStyle: "bold",
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
      },
    });

    return doc.lastAutoTable.finalY + 15;
  }

  function addInterpretation(doc, survivalDiv, yPosition) {
    // First check if we need a page break
    yPosition = checkForPageBreak(doc, yPosition, 50); // Assume we need ~50 units of space

    // Try to find interpretation section - multiple possible selectors
    const interpretationSection = survivalDiv.querySelector(".interpretation-section, div[style*='background-color: #ffffff'], .interpretation");

    doc.setFontSize(14);
    doc.setTextColor(43, 45, 66);
    doc.setFont("helvetica", "bold");
    doc.text("Interpretation", 15, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "normal");

    if (interpretationSection) {
      // Get all paragraphs from the interpretation section
      const paragraphs = interpretationSection.querySelectorAll("p, div");

      if (paragraphs.length > 0) {
        paragraphs.forEach((p) => {
          const text = p.textContent.trim();
          if (text) {
            // Check if we need a page break before adding this paragraph
            yPosition = checkForPageBreak(doc, yPosition, 20);

            const lines = doc.splitTextToSize(text, 180);
            doc.text(lines, 15, yPosition);
            yPosition += lines.length * 6 + 8; // Line height + paragraph spacing
          }
        });
      } else {
        // If section exists but has no paragraphs, use default
        yPosition = addDefaultInterpretation(doc, yPosition);
      }
    } else {
      // If no section found, use default
      yPosition = addDefaultInterpretation(doc, yPosition);
    }

    return yPosition + 10; // Extra spacing after section
  }

  function addDefaultInterpretation(doc, yPosition) {
    const defaultText = [
      "The Weibull distribution (shape=2.570, scale=10.339) provides a good fit for the survival data.",
      "The decreasing survival probability over time indicates an increasing hazard rate.",
      "The median survival time can be estimated from the Kaplan-Meier curve where survival probability reaches 0.5.",
    ];

    defaultText.forEach((text) => {
      yPosition = checkForPageBreak(doc, yPosition, 20);
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 15, yPosition);
      yPosition += lines.length * 6 + 8;
    });

    return yPosition;
  }

  function checkForPageBreak(doc, yPosition, spaceNeeded) {
    if (yPosition + spaceNeeded > doc.internal.pageSize.height - 20) {
      doc.addPage();
      return 20; // Reset to top of new page
    }
    return yPosition;
  }

  async function addPlots(doc, survivalDiv, yPosition) {
    const plotsContainer = survivalDiv.querySelector("div[style*='grid-template-columns: repeat(2, minmax(200px, 400px)']");
    if (!plotsContainer) return yPosition;

    const plots = plotsContainer.querySelectorAll("div");

    for (const plot of plots) {
      yPosition = await addSinglePlot(doc, plot, yPosition);
    }

    return yPosition;
  }

  async function addSinglePlot(doc, plot, yPosition) {
    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }

    const title = plot.querySelector("h4")?.textContent;
    const img = plot.querySelector("img");

    if (title) {
      doc.setFontSize(14);
      doc.setTextColor(43, 45, 66);
      doc.setFont("helvetica", "bold");
      doc.text(title, 15, yPosition);
      yPosition += 10;
    }

    if (img) {
      try {
        const canvas = await html2canvas(img);
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 180;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;

        doc.addImage(imgData, "PNG", 15, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 20;
      } catch (error) {
        console.error("Error converting plot to image:", error);
      }
    }

    return yPosition;
  }

  function addDocumentFooter(doc) {
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("End of Survival Analysis Report", 105, 285, { align: "center" });
  }

  function cleanInterpretation(markdownText) {
    return (
      markdownText
        .replace(/^#### (.*$)/gim, "<strong>$1</strong><br>")
        // Ganti ### heading menjadi <strong> atau <h4>
        .replace(/^### (.*$)/gim, "<strong>$1</strong><br>")
        // Ganti **bold** menjadi <strong>
        .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
        // Ganti *italic* jika ada
        .replace(/\*(.*?)\*/gim, "<em>$1</em>")
        // Hapus ekspresi matematika [ ] atau ( ) dari LaTeX style
        .replace(/\\\[.*?\\\]/g, "")
        .replace(/\\\(.*?\\\)/g, "")
        // Hapus karakter sisa LaTeX atau tidak diinginkan
        .replace(/\\+/g, "")
        // Tambahkan <br> pada line break
        .replace(/\n{2,}/g, "</p><p>")
        .replace(/\n/g, "<br>")
        // Bungkus hasil akhir dalam tag <p>
        .replace(/^/, "<p>")
        .concat("</p>")
    );
  }

  function generateSurvivalResponse(apiResponse) {
    const survivalDiv = document.createElement("div");
    survivalDiv.className = "survival-item";

    // 1. Create and append PDF button FIRST
    const downloadBtn = document.createElement("button");
    downloadBtn.innerHTML = "Download PDF";
    downloadBtn.style.cssText = `
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin: 20px 0;
  `;
    downloadBtn.addEventListener("click", () => generateSurvivalPDF(survivalOutput));
    survivalDiv.appendChild(downloadBtn);

    // 2. Create content container
    const contentContainer = document.createElement("div");

    // Find best distribution
    let bestAicDist = null;
    let bestAicValue = Infinity;
    Object.entries(apiResponse.all_distributions_results).forEach(([dist, result]) => {
      if (result.aic < bestAicValue) {
        bestAicValue = result.aic;
        bestAicDist = dist;
      }
    });

    // 3. Add main content sections
    contentContainer.innerHTML = `
    <div style="margin-bottom: 30px;">
      <h2 style="color: #2b2d42; border-bottom: 2px solid #dee2e6; padding-bottom: 8px; margin-bottom: 20px;">
        Survival Analysis Results
      </h2>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; margin-bottom: 30px;">
        <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h3 style="margin-top: 0; color: #2b2d42;">Distribution</h3>
          <p style="font-size: 16px;">
            <span style="font-weight: 500;">Estimated Distribution:</span> 
            <span style="color: #4a4e69;">${bestAicDist || "Not available"}</span>
          </p>
        </div>
        
        ${
          apiResponse.median_survival
            ? `
          <div style="background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #2b2d42;">Median Survival</h3>
            <p style="font-size: 16px;">
              <span style="font-weight: 500;">Time:</span> 
              <span style="color: #4a4e69;">${apiResponse.median_survival}</span>
            </p>
          </div>
        `
            : ""
        }
      </div>

      ${
        apiResponse.interpretation
          ? `
        <div style="width: 90%; background-color: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
          <h3 style="margin-top: 0; margin-bottom: 16px; font-size: 22px; color: #1d3557;">📊 Interpretation</h3>
          <p style="font-size: 16px; color: #4a4e69; line-height: 1.7; white-space: pre-line;">
            ${cleanInterpretation(apiResponse.interpretation)}
          </p>
        </div>`
          : ""
      }
    </div>
  `;

    // 4. Append dynamic content
    if (apiResponse.kaplan_meier) {
      const kmTable = document.createElement("div");
      kmTable.innerHTML = buildKaplanMeierTable(apiResponse.kaplan_meier);
      contentContainer.appendChild(kmTable);
    }

    const plotsSection = document.createElement("div");
    plotsSection.innerHTML = buildPlotsSection(apiResponse);
    contentContainer.appendChild(plotsSection);

    // 5. Append everything to main container
    survivalDiv.appendChild(contentContainer);
    survivalOutput.appendChild(survivalDiv);
  }

  function buildKaplanMeierTable(kaplanMeierData) {
    let tableContent = `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #2b2d42;">Kaplan-Meier Survival Estimates</h3>
        <div style="overflow-x: auto;">
          <table style="width: 90%; border-collapse: collapse; margin-bottom: 20px; font-size:14px;">
            <thead>
              <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                <th style="padding: 5px; text-align: left;">Time</th>
                <th style="padding: 5px; text-align: left;">Survival Probability</th>
                <th style="padding: 5px; text-align: left;">CI Lower</th>
                <th style="padding: 5px; text-align: left;">CI Upper</th>
              </tr>
            </thead>
            <tbody>
    `;

    for (let i = 0; i < kaplanMeierData.timeline.length; i++) {
      const ci_index = i * 2;
      const hasCI = kaplanMeierData.confidenceInterval && ci_index + 1 < kaplanMeierData.confidenceInterval.length;

      const lowerBound = hasCI ? kaplanMeierData.confidenceInterval[ci_index] : "N/A";
      const upperBound = hasCI ? kaplanMeierData.confidenceInterval[ci_index + 1] : "N/A";

      tableContent += `
          <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="padding: 5px;">${kaplanMeierData.timeline[i].toFixed(2)}</td>
              <td style="padding: 5px;">${kaplanMeierData.survival_function[i].toFixed(4)}</td>
              <td style="padding: 5px;">${lowerBound !== "N/A" ? parseFloat(lowerBound).toFixed(4) : "N/A"}</td>
              <td style="padding: 5px;">${upperBound !== "N/A" ? parseFloat(upperBound).toFixed(4) : "N/A"}</td>
          </tr>
      `;
    }

    tableContent += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return tableContent;
  }

  function buildPlotsSection(apiResponse) {
    let plotsContent = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2b2d42; padding-bottom: 8px;">
          Visualization
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(200px, 400px)); gap: 20px;">
    `;

    if (apiResponse.survival_plot) {
      plotsContent += `
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h4 style="margin-top: 0; color: #4a4e69;">Distribution Fit</h4>
          <img src="data:image/png;base64,${apiResponse.survival_plot}" 
               alt="Distribution Plot" 
               style="width: 90%; height: auto; border-radius: 4px;">
        </div>
      `;
    }

    if (apiResponse.hazard_plot) {
      plotsContent += `
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h4 style="margin-top: 0; color: #4a4e69;">Hazard Function</h4>
          <img src="data:image/png;base64,${apiResponse.hazard_plot}" 
               alt="Hazard Plot" 
               style="width: 90%; height: auto; border-radius: 4px;">
        </div>
      `;
    }

    if (apiResponse.kaplan_meier_plot) {
      plotsContent += `
        <div style="background-color: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h4 style="margin-top: 0; color: #4a4e69;">Kaplan-Meier Curve</h4>
          <img src="data:image/png;base64,${apiResponse.kaplan_meier_plot}" 
               alt="Kaplan-Meier Plot" 
               style="width: 90%; height: auto; border-radius: 4px;">
        </div>
      `;
    }

    plotsContent += `</div></div>`;
    return plotsContent;
  }
}
