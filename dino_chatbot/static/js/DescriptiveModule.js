import { getCookie, toggleContainer, createVariableList } from "./Utils.js";

// Fungsi utama untuk setup analisis deskriptif
export function setupDescriptiveAnalysis(hot) {
  const descriptiveOutput = document.getElementById("descriptive-output");

  // Event listener ketika menu "Descriptive" diklik
  document.getElementById("menu-descriptive").addEventListener("click", function () {
    toggleContainer("descriptive-container");
    const headers = hot.getData()[0];
    descriptiveOutput.innerHTML = "";

    // Buat container utama dan tampilkan daftar variabel
    const container = document.createElement("div");
    container.className = "descriptive-main-container";
    descriptiveOutput.appendChild(container);

    displayDescriptiveStatistics(headers, container);
  });

  // Menampilkan pilihan checkbox untuk setiap variabel
  function displayDescriptiveStatistics(headers, container) {
    const headerContainer = document.createElement("div");
    headerContainer.innerHTML = `
      <p class="paragraph">
        Select variables to view detailed statistics and visualizations
      </p>
    `;
    container.appendChild(headerContainer);

    container.appendChild(createVariableList(headers, handleCheckboxChange));
  }

  // Handler saat checkbox variabel diklik
  function handleCheckboxChange(event) {
    const variableIndex = event.target.dataset.index;
    const variableName = event.target.dataset.variable;
    const checkbox = event.target;

    if (!checkbox?.parentNode) {
      console.error("Element not found");
      return;
    }

    //  Jika dicentang, ambil data dan kirim ke backend
    if (checkbox.checked) {
      checkbox.parentNode.style.opacity = "0.7";
      checkbox.disabled = true;

      const allData = hot.getData();
      const variableData = allData
        .slice(1)
        .map((row) => row[variableIndex])
        .filter((val) => val !== "" && val !== null && val !== undefined);

      const isNumeric = !isNaN(variableData[0]);

      // Kirim permintaan ke backend
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
      // Jika checkbox dibatalkan
      removeStatistics(variableName);
    }
  }

  // Menampilkan statistik dan visualisasi
  function displayStatistics(variableName, stats) {
    removeStatistics(variableName);

    const statsContainer = document.createElement("div");
    statsContainer.className = "stats-container";
    statsContainer.dataset.variable = variableName;

    // Konten HTML untuk statistik
    statsContainer.innerHTML = `
    <div class="stats">
      <div>
        <h3>
          <span>📊</span>
          ${variableName}
        </h3>
      </div>
      <div>
        <button class="download-pdf">
          Download PDF
        </button>
        <button class="close-stats">×</button>
      </div>
    </div>
    <div class="stats-content">
      ${buildStatisticsTable(variableName, stats)}
    </div>
  `;

    // Jika ada visualisasi, tampilkan
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

    // Event untuk tombol tutup
    statsContainer.querySelector(".close-stats").addEventListener("click", () => {
      removeStatistics(variableName);
      const checkbox = document.querySelector(`input[data-variable="${variableName}"]`);
      if (checkbox) checkbox.checked = false;
    });

    // Event untuk download PDF
    statsContainer.querySelector(".download-pdf").addEventListener("click", async () => {
      await generatePDF(variableName, statsContainer);
    });

    descriptiveOutput.querySelector(".descriptive-main-container").appendChild(statsContainer);
  }

  // Buat elemen visualisasi
  function createVisualizationItem(title, imageData) {
    const item = document.createElement("div");
    item.className = "visualization-item";
    item.innerHTML = `
      <h4 class="tittle-image">${title}</h4>
      <img class="image-data" src="data:image/png;base64,${imageData}" 
           alt="${title}">
    `;
    return item;
  }

  // Membangun tabel statistik (numerik atau kategorikal)
  function buildStatisticsTable(variableName, stats) {
    let tableHTML = `
      <div>
        <table class="stats-table" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th>Statistic</th>
              <th>Value</th>
    `;

    if (stats.type === "Numeric") {
      tableHTML += `
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mean</td>
              <td>${formatStatValue(stats.mean)}</td>
            </tr>
            <tr>
              <td>Median</td>
              <td>${formatStatValue(stats.median)}</td>
            </tr>
            <tr>
              <td>Mode</td>
              <td>${formatStatValue(stats.mode)}</td>
            </tr>
            <tr>
              <td>Standard Deviation</td>
              <td>${formatStatValue(stats.std)}</td>
            </tr>
            <tr>
              <td>Skewness</td>
              <td>${formatStatValue(stats.skewness)}</td>
            </tr>
            <tr>
              <td>Kurtosis</td>
              <td>${formatStatValue(stats.kurtosis)}</td>
            </tr>
            <tr>
              <td>Minimum</td>
              <td>${formatStatValue(stats.min)}</td>
            </tr>
            <tr>
              <td>Maximum</td>
              <td>${formatStatValue(stats.max)}</td>
            </tr>
            <tr>
              <td>Sum</td>
              <td>${formatStatValue(stats.sum)}</td>
            </tr>
            <tr>
              <td>Count</td>
              <td>${formatStatValue(stats.count)}</td>
            </tr>
      `;
    } else {
      tableHTML += `
              <th">Count</th>
              <th">Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td">Unique Values</td>
              <td">${formatStatValue(stats.uniqueCount)}</td>
              <td"></td>
              <td"></td>
            </tr>
      `;

      const total = Object.values(stats.categoryCount).reduce((sum, count) => sum + count, 0);
      for (const [category, count] of Object.entries(stats.categoryCount)) {
        const percentage = ((count / total) * 100).toFixed(1);
        tableHTML += `
          <tr>
            <td">${category}</td>
            <td">${count}</td>
            <td">${percentage}%</td>
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

  // Format nilai statistik agar lebih rapi
  function formatStatValue(value) {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      if (Number.isInteger(value)) return value.toString();
      return value.toFixed(4).replace(/\.?0+$/, "");
    }
    return value;
  }

  // Menghapus statistik tertentu dari tampilan
  function removeStatistics(variableName) {
    const statsItem = descriptiveOutput.querySelector(`.stats-container[data-variable="${variableName}"]`);
    if (statsItem) {
      statsItem.classList.add("fade-out");
      setTimeout(() => statsItem.remove(), 300);
    }
  }

  // Menampilkan notifikasi kesalahan
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

    // Fungsi untuk menambahkan halaman baru dan reset posisi Y
    function addNewPage() {
      doc.addPage();
      return 15; // posisi Y awal untuk halaman baru
    }

    // Tambahkan judul dan tanggal
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.text(`Descriptive Analysis: ${variableName}`, 15, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const generatedDate = new Date().toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Generated on: ${generatedDate}`, 15, 22);

    // Tambahkan tabel statistik
    const table = container.querySelector(".stats-table");
    let yPosition = 30;
    if (table) {
      doc.autoTable({
        html: table,
        startY: yPosition,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [241, 241, 241] },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: "auto" },
          2: { cellWidth: "auto" },
        },
        didDrawPage: (data) => {
          yPosition = data.cursor.y + 10; // update posisi y setelah tabel
        },
      });
    }

    // Tambahkan visualisasi (gambar)
    const visualizations = container.querySelectorAll(".visualization-item");

    for (const viz of visualizations) {
      if (yPosition > 250) {
        yPosition = addNewPage();
      }

      const title = viz.querySelector("h4")?.textContent || "Visualization";
      const imgElement = viz.querySelector("img");

      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text(title, 15, yPosition);
      yPosition += 7;

      if (imgElement) {
        try {
          // Konversi gambar ke canvas via html2canvas
          const canvas = await html2canvas(imgElement, { backgroundColor: null });
          const imgData = canvas.toDataURL("image/png");

          const maxWidth = 180;
          const scale = maxWidth / canvas.width;
          const imgWidth = maxWidth;
          const imgHeight = canvas.height * scale;

          // Jika gambar tidak muat di halaman, tambah halaman baru
          if (yPosition + imgHeight > 280) {
            yPosition = addNewPage();
          }

          doc.addImage(imgData, "PNG", 15, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 15; // beri jarak bawah gambar
        } catch (error) {
          console.error("Error converting visualization to image:", error);
          // Opsional: bisa tampilkan notif kesalahan ke user di UI
        }
      }
    }

    // Save file PDF dengan nama yang aman untuk filesystem
    const safeName = variableName.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
    doc.save(`analysis_${safeName}.pdf`);
  }
}
