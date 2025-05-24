// descriptiveModule.js
import { getCookie, toggleContainer, createVariableList } from "./Utils.js";

export function setupDescriptiveAnalysis(hot) {
  const descriptiveOutput = document.getElementById("descriptive-output");

  // Add global styles
  const style = document.createElement("style");
  style.textContent = `
    .descriptive-main-container {
      width: 90%;
      font-family: Arial, sans-serif;
    }
    .stats-container {
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .visualization-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    .visualization-item {
      background: white;
      padding: 15px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
    }
    .fade-out {
      opacity: 0;
      transition: opacity 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);

  document.getElementById("menu-descriptive").addEventListener("click", function () {
    toggleContainer("descriptive-container");
    const headers = hot.getData()[0];
    descriptiveOutput.innerHTML = "";

    // Create main container with 70% width
    const mainContainer = document.createElement("div");
    mainContainer.className = "descriptive-main-container";
    descriptiveOutput.appendChild(mainContainer);

    displayDescriptiveStatistics(headers, mainContainer);
  });

  function displayDescriptiveStatistics(headers, container) {
    const headerContainer = document.createElement("div");
    headerContainer.innerHTML = `
      <p style="margin: 0 0 20px 0; color: #555; font-size: 0.9rem;">
        Select variables to view detailed statistics and visualizations
      </p>
    `;
    container.appendChild(headerContainer);

    container.appendChild(createVariableList(headers, handleCheckboxChange));
  }

  function handleCheckboxChange(event) {
    const variableIndex = event.target.dataset.index;
    const variableName = event.target.dataset.variable;
    const checkbox = event.target;

    if (!checkbox?.parentNode) {
      console.error("Element not found");
      return;
    }

    if (checkbox.checked) {
      checkbox.parentNode.style.opacity = "0.7";
      checkbox.disabled = true;

      const allData = hot.getData();
      const variableData = allData
        .slice(1)
        .map((row) => row[variableIndex])
        .filter(Boolean);

      const isNumeric = !isNaN(variableData[0]);

      fetch("/get-statistics/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          variable: variableName,
          data: variableData,
          isNumeric,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((err) => {
              throw new Error(err.error || `Server error: ${response.status}`);
            });
          }
          return response.json();
        })
        .then((stats) => {
          if (stats.error) throw new Error(stats.error);
          displayStatistics(variableName, stats);
          checkbox.disabled = false;
          checkbox.parentNode.style.opacity = "1";
        })
        .catch((error) => {
          console.error("Error:", error);
          checkbox.checked = false;
          checkbox.disabled = false;
          checkbox.parentNode.style.opacity = "1";
          showErrorNotification(`Failed to load statistics: ${error.message}`);
        });
    } else {
      removeStatistics(variableName);
    }
  }

  function displayStatistics(variableName, stats) {
    removeStatistics(variableName);

    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";
    statsContainer.dataset.variable = variableName;

    statsContainer.innerHTML = `
    <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <h3 style="margin: 0; color: #333;">
          <span style="margin-right: 8px;">📊</span>
          ${variableName}
        </h3>
      </div>
      <div>
        <button class="download-pdf" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 10px; font-size: 0.8rem;">
          Download PDF
        </button>
        <button style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;" 
                class="close-stats">×</button>
      </div>
    </div>
    <div class="stats-content">
      ${buildStatisticsTable(variableName, stats)}
    </div>
  `;

    if (stats.boxplot || stats.histogram || stats.barchart) {
      const vizGrid = document.createElement("div");
      vizGrid.className = "visualization-grid";

      if (stats.boxplot) {
        vizGrid.appendChild(createVisualizationItem("Boxplot", stats.boxplot));
      }
      if (stats.histogram) {
        vizGrid.appendChild(createVisualizationItem("Histogram", stats.histogram));
      }
      if (stats.barchart) {
        vizGrid.appendChild(createVisualizationItem("Distribution", stats.barchart));
      }

      statsContainer.querySelector(".stats-content").appendChild(vizGrid);
    }

    // Add event listeners
    statsContainer.querySelector(".close-stats").addEventListener("click", () => {
      removeStatistics(variableName);
      const checkbox = document.querySelector(`input[data-variable="${variableName}"]`);
      if (checkbox) checkbox.checked = false;
    });

    // Add PDF generation handler
    statsContainer.querySelector(".download-pdf").addEventListener("click", async () => {
      await generatePDF(variableName, statsContainer);
    });

    descriptiveOutput.querySelector(".descriptive-main-container").appendChild(statsContainer);
  }

  function createVisualizationItem(title, imageData) {
    const item = document.createElement("div");
    item.className = "visualization-item";
    item.innerHTML = `
      <h4 style="margin-top: 0; margin-bottom: 10px; color: #4a4e69; font-size: 1rem;">${title}</h4>
      <img src="data:image/png;base64,${imageData}" 
           alt="${title}" 
           style="width: 100%; height: auto; border-radius: 4px;">
    `;
    return item;
  }

  function buildStatisticsTable(variableName, stats) {
    let tableHTML = `
      <div>
        <table class="stats-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f1f1f1; font-weight: 600;">Statistic</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f1f1f1; font-weight: 600;">Value</th>
    `;

    if (stats.type === "Numeric") {
      tableHTML += `
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Mean</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.mean)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Median</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.median)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Mode</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.mode)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Standard Deviation</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.std)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Skewness</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.skewness)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Kurtosis</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.kurtosis)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Minimum</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.min)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Maximum</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.max)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Sum</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.sum)}</td>
            </tr>
            <tr>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">Count</td>
              <td style="padding: 5px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.count)}</td>
            </tr>
      `;
    } else {
      tableHTML += `
              <th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f1f1f1; font-weight: 600;">Count</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd; background-color: #f1f1f1; font-weight: 600;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;">Unique Values</td>
              <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;">${formatStatValue(stats.uniqueCount)}</td>
              <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;"></td>
              <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;"></td>
            </tr>
      `;

      const total = Object.values(stats.categoryCount).reduce((sum, count) => sum + count, 0);
      for (const [category, count] of Object.entries(stats.categoryCount)) {
        const percentage = ((count / total) * 100).toFixed(1);
        tableHTML += `
          <tr>
            <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;">${category}</td>
            <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;">${count}</td>
            <td style="padding: 8px 12px; text-align: left; border-bottom: 1px solid #ddd;">${percentage}%</td>
          </tr>
        `;
      }
    }

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    return tableHTML;
  }

  function formatStatValue(value) {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      if (Number.isInteger(value)) return value.toString();
      return value.toFixed(4).replace(/\.?0+$/, "");
    }
    return value;
  }

  function removeStatistics(variableName) {
    const statsItem = descriptiveOutput.querySelector(`.stats-container[data-variable="${variableName}"]`);
    if (statsItem) {
      statsItem.classList.add("fade-out");
      setTimeout(() => statsItem.remove(), 300);
    }
  }

  function showErrorNotification(message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ffebee;
      color: #c62828;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1000;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 10px;">⚠️</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  async function generatePDF(variableName, container) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(`Descriptive Analysis: ${variableName}`, 15, 15);

    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 22);

    // Convert stats table to PDF
    const table = container.querySelector(".stats-table");
    if (table) {
      doc.autoTable({
        html: table,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [241, 241, 241] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: "auto" },
        },
      });
    }

    // Add visualizations
    const visualizations = container.querySelectorAll(".visualization-item");
    let yPosition = doc.lastAutoTable?.finalY + 10 || 30;

    for (const viz of visualizations) {
      // Add new page if needed
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 15;
      }

      const title = viz.querySelector("h4").textContent;
      const imgElement = viz.querySelector("img");

      // Add visualization title
      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(title, 15, yPosition);
      yPosition += 7;

      // Add visualization image
      if (imgElement) {
        try {
          const canvas = await html2canvas(imgElement);
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = 180;
          const imgHeight = (canvas.height / canvas.width) * imgWidth;

          // Adjust position if image would go off page
          if (yPosition + imgHeight > 280) {
            doc.addPage();
            yPosition = 15;
          }

          doc.addImage(imgData, "PNG", 15, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15;
        } catch (error) {
          console.error("Error converting visualization to image:", error);
        }
      }
    }

    // Save the PDF
    doc.save(`analysis_${variableName.replace(/\s+/g, "_")}.pdf`);
  }
}
