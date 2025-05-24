document.addEventListener("DOMContentLoaded", function () {
  const defaultData = [
    ["", "", "", ""], // header kolom
  ];

  for (let i = 0; i < 10; i++) {
    defaultData.push(["", "", "", ""]);
  }

  const container = document.getElementById("table-container");
  const hot = new Handsontable(container, {
    data: defaultData,
    rowHeaders: true,
    colHeaders: true,
    contextMenu: true,
    manualRowResize: true,
    manualColumnResize: true,
    filters: true,
    dropdownMenu: true,
    stretchH: "none",
    autoColumnSize: true,
    rowHeights: 25,
    colWidths: 120,
    minRows: 14,
    minCols: 7,
    licenseKey: "non-commercial-and-evaluation",
  });

  // membuat variabel
  const descriptiveContainer = document.getElementById("descriptive-container");
  const descriptiveOutput = document.getElementById("descriptive-output");
  const survivalContainer = document.getElementById("survival-container");
  const survivalOutput = document.getElementById("survival-output");
  const estimasiContainer = document.getElementById("estimasi-container");
  const estimasiOutput = document.getElementById("estimasi-output");

  // fungsi untuk menu descriptive
  document.getElementById("menu-descriptive").addEventListener("click", function () {
    toggleContainer("descriptive-container");
    const headers = hot.getData()[0];
    descriptiveOutput.innerHTML = "";
    displayDescriptiveStatistics(headers);
  });

  // fungsi untuk menu survival
  document.getElementById("menu-survival").addEventListener("click", function () {
    toggleContainer("survival-container");
    const headers = hot.getData()[0];
    survivalOutput.innerHTML = "";
    displaySurvivalStatistics(headers);
  });

  // Fungsi untuk menu estimasi
  document.getElementById("menu-estimasi").addEventListener("click", function () {
    toggleContainer("estimasi-container");
    const headers = hot.getData()[0];
    estimasiOutput.innerHTML = "";
    displayEstimasiStatistics(headers);
  });

  // fungsi untuk menghapus data
  document.getElementById("clear-data").addEventListener("click", function () {
    const rowCount = hot.countRows();
    const colCount = hot.countCols();
    const emptyData = Array.from({ length: rowCount }, () => Array(colCount).fill(""));
    hot.loadData(emptyData);
    descriptiveOutput.innerHTML = "";
    const checkboxes = descriptiveContainer.querySelectorAll("input[type='checkbox']");
    checkboxes.forEach((checkbox) => {
      // Uncheck checkbox
      checkbox.checked = false;
    });
    const listItems = descriptiveContainer.querySelectorAll("ul li");
    listItems.forEach((item) => item.remove());
    descriptiveContainer.style.display = "none";
    survivalContainer.style.display = "none";
    estimasiContainer.style.display = "none";
  });

  // fungsi untuk export-data
  document.getElementById("export-data").addEventListener("click", function () {
    const data = hot.getData();
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "data.xlsx");
  });

  // fungsi untuk import data
  document.getElementById("import-data").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const importedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      hot.loadData(importedData);
    };

    reader.readAsArrayBuffer(file);
  });

  // event-listener untuk perubahan yang terjadi pada data
  hot.addHook("afterChange", function (changes) {
    if (changes) {
      changes.forEach(function (change) {
        const col = change[1];
        const variableName = hot.getData()[0][col];
        const checkbox = document.querySelector(`input[data-variable="${variableName}"]`);
        if (checkbox?.checked) {
          checkbox.checked = false;
          removeStatistics(variableName);
        }
      });
    }
  });

  // menampilkan descriptive statistics
  function displayDescriptiveStatistics(headers) {
    descriptiveOutput.appendChild(createVariableList(headers, handleCheckboxChange));
  }

  // menampilkan survival statistics
  function displaySurvivalStatistics(headers) {
    survivalOutput.appendChild(createVariableList(headers, handleCheckboxSurvival));
  }

  // Menampilkan statistik estimasi
  function displayEstimasiStatistics(headers) {
    estimasiOutput.appendChild(createVariableList(headers, handleCheckboxEstimasi));
  }

  // membuat daftar variabel
  function createVariableList(headers, onChangeCallback) {
    const list = document.createElement("ul");
    list.classList.add("variabel-statistic");
    headers.forEach((header, index) => {
      if (header?.trim()) {
        const listItem = document.createElement("li");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.index = index;
        checkbox.dataset.variable = header.trim();
        checkbox.addEventListener("change", onChangeCallback);
        listItem.appendChild(checkbox);
        listItem.appendChild(document.createTextNode(` ${header}`));
        list.appendChild(listItem);
      }
    });
    return list;
  }

  // fungsi toggle container
  function toggleContainer(showContainerId) {
    const allContainers = document.querySelectorAll(".container");

    // looping untuk menyembunyikan semua container
    allContainers.forEach((container) => {
      container.style.display = "none";
    });

    // menampilkan container yang sesuai dengan ID yang dipilih
    const showContainer = document.getElementById(showContainerId);
    if (showContainer) {
      showContainer.style.display = "block";
    }
  }

  // fungsi untuk handle deskriptive statistik
  function handleCheckboxChange(event) {
    const variableIndex = event.target.dataset.index;
    const variableName = event.target.dataset.variable;

    if (event.target.checked) {
      // jika checkbox di-check maka data di proses
      const allData = hot.getData();
      const variableData = allData
        .slice(1)
        .map((row) => row[variableIndex])
        .filter(Boolean); // hilangkan nilai kosong/null

      const isNumeric = !isNaN(variableData[0]);

      // kirim data ke server atau proses statistik lokal
      fetch("/get-statistics/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ variable: variableName, data: variableData, isNumeric }),
      })
        .then((response) => response.json())
        .then((stats) => {
          if (stats.error) {
            console.error(stats.error);
            return;
          }
          displayStatistics(variableName, stats);
        })
        .catch((error) => console.error("An error occurred:", error));
    } else {
      // jika checkbox di uncheck maka data statistik akan di hapus
      removeStatistics(variableName);
    }
  }

  // fungsi menampilkan statistik descriptive
  function displayStatistics(variableName, stats) {
    const statsDiv = document.createElement("div");
    statsDiv.classList.add("stats-item");
    statsDiv.dataset.variable = variableName;

    let statsContent = `
      <h1>${variableName}</h1>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Variable</th>
    `;

    if (stats.type === "Numeric") {
      // jika tipe data numerik maka akan di jalankan
      statsContent += `
            <th>Mean</th>
            <th>Median</th>
            <th>Mode</th>
            <th>Std Dev</th>
            <th>Kurtosis</th>
            <th>Skewness</th>
            <th>Min</th>
            <th>Max</th>
            <th>Sum</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${variableName}</td>
            <td>${stats.mean ?? "N/A"}</td>
            <td>${stats.median ?? "N/A"}</td>
            <td>${stats.mode ?? "N/A"}</td>
            <td>${stats.std ?? "N/A"}</td>
            <td>${stats.kurtosis ?? "N/A"}</td>
            <td>${stats.skewness ?? "N/A"}</td>
            <td>${stats.min ?? "N/A"}</td>
            <td>${stats.max ?? "N/A"}</td>
            <td>${stats.sum ?? "N/A"}</td>
            <td>${stats.count ?? "N/A"}</td>
          </tr>
      `;
    } else if (stats.type === "Categorical") {
      // jika tipe data kategorikal maka ini yang di jalankan
      statsContent += `
        <th>Mode</th>
        <th>Unique Count</th>
      `;

      // menambahkan header untuk setiap kategori
      for (const category of Object.keys(stats.categoryCount)) {
        statsContent += `<th>${category}</th>`;
      }

      statsContent += `
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${variableName}</td>
            <td>${stats.mode ?? "N/A"}</td>
            <td>${stats.uniqueCount ?? "N/A"}</td>
      `;

      // menambahkan kategori dan menghitung jumlahnya
      for (const category of Object.keys(stats.categoryCount)) {
        statsContent += `
          <td>${stats.categoryCount[category]}</td>
        `;
      }

      statsContent += `</tr>`;
    }

    statsContent += `
        </tbody>
      </table>
    `;

    statsDiv.innerHTML = statsContent;

    // menambah boxplot jika tersedia
    if (stats.boxplot) {
      const boxplotContainer = document.createElement("div");
      boxplotContainer.classList.add("container-graph");

      const boxplotImg = document.createElement("img");
      boxplotImg.src = `data:image/png;base64,${stats.boxplot}`;
      boxplotImg.alt = "Boxplot for " + variableName;

      boxplotContainer.appendChild(boxplotImg);
      statsDiv.appendChild(boxplotContainer);
    }

    if (stats.histogram) {
      const histogramContainer = document.createElement("div");
      histogramContainer.classList.add("container-graph");

      const histogramImg = document.createElement("img");
      histogramImg.src = `data:image/png;base64,${stats.histogram}`;
      histogramImg.alt = "Histogram for " + variableName;

      histogramContainer.appendChild(histogramImg);
      statsDiv.appendChild(histogramContainer);
    }

    // menambah bar-chart jika tersedia
    if (stats.barchart) {
      const barChartContainer = document.createElement("div");
      barChartContainer.classList.add("container-graph");

      const barChartImg = document.createElement("img");
      barChartImg.src = `data:image/png;base64,${stats.barchart}`;
      barChartImg.alt = "Bar Chart for " + variableName;

      barChartContainer.appendChild(barChartImg);
      statsDiv.appendChild(barChartContainer);
    }

    // menambahkan elemen ke dalam container statistik
    document.getElementById("descriptive-output").appendChild(statsDiv);
  }

  // objek untuk menyimpan status checkbox
  let selectedVariables = {};
  // variabel untuk menyimpan header dari data
  let headers = [];

  // fungsi untuk handle checkbox survival
  function handleCheckboxSurvival(event) {
    const variableName = event.target.dataset.variable;

    const allData = hot.getData();
    if (headers.length === 0) {
      headers = allData[0]; // anggap baris pertama adalah headers
    }

    // jika time_to_event belum dicentang, tidak boleh memilih event_status
    if (variableName === "event_status" && !selectedVariables["time_to_event"]) {
      alert("Harus memilih 'Time to Event' terlebih dahulu.");
      // Membatalkan pencentangan event_status
      event.target.checked = false;
      selectedVariables[variableName] = false;
      return;
    }

    // update status checkbox untuk variabel yang dipilih
    selectedVariables[variableName] = event.target.checked;

    // mengambil data sesuai dengan checkbox yang dicentang
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

    // memastikan 'time_to_event' atau 'event_status' dicentang
    if (!selectedVariables["time_to_event"] && !selectedVariables["event_status"]) {
      alert("Pilih 'time_to_event' atau 'event_status' untuk analisis.");
      event.target.checked = false;
      return;
    }

    // menampilkan data yang akan dikirim ke server
    console.log("Data yang akan dikirim ke server:", selectedData);

    // menghapus hasil yang sebelumnya ditampilkan jika ada
    const existingSurvivalDiv = document.querySelector(".survival-item");
    if (existingSurvivalDiv) {
      existingSurvivalDiv.remove();
    }

    // jika tidak ada checkbox yang dicentang, tidak perlu memanggil API
    if (!selectedVariables["time_to_event"] && !selectedVariables["event_status"]) {
      return;
    }

    // mengirim data ke server jika ada checkbox yang dicentang
    fetch("/get-survival/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(selectedData),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        if (apiResponse.error) {
          console.error(apiResponse.error);
          return;
        }
        // menampilkan hasil distribusi setelah hasil yang lama dihapus
        generateAPIResponse(apiResponse);
      })
      .catch((error) => console.error("An error occurred:", error));
  }

  // fungsi menampilkan hasil dari survival analisis
  function generateAPIResponse(apiResponse) {
    // Membuat div untuk menampilkan hasil distribusi survival
    const survivalDiv = document.createElement("div");
    survivalDiv.classList.add("survival-item");

    // Membuat konten untuk survivalDiv
    let survivalContent = `
      <h2>Survival Analysis Result</h2>
      <p><strong>Distribusi Estimasi:</strong> ${apiResponse.predicted_distribution ?? "No prediction available."}</p>
    `;

    // Menambahkan informasi median_survival jika tersedia
    if (apiResponse.median_survival !== undefined && apiResponse.median_survival !== null) {
      survivalContent += `
            <h3>Median Survival</h3>
            <p><strong>Waktu Median Survival:</strong> ${apiResponse.median_survival}</p>
        `;
    } else {
      survivalContent += `<p><strong>Median Survival:</strong> Tidak tersedia</p>`;
    }

    // Menambahkan informasi hazard_function jika tersedia
    if (apiResponse.hazard_function && Array.isArray(apiResponse.hazard_function)) {
      survivalContent += `
            <h3>Hazard Function</h3>
            <ul>
                ${apiResponse.hazard_function.map((value, index) => `<li>Index ${index}: ${value}</li>`).join("")}
            </ul>
        `;
    } else {
      survivalContent += `<p><strong>Hazard Function:</strong> Tidak tersedia</p>`;
    }

    // Menambahkan informasi kaplan_meier jika tersedia
    if (apiResponse.kaplan_meier) {
      const km = apiResponse.kaplan_meier;
      const timeline = km.timeline;
      const survivalFunction = km.survival_function;
      const confidenceInterval = km.confidence_interval;

      // Membuat tabel untuk Survival Function dan Confidence Interval
      let tableContent = `
            <h3>Kaplan Meier Data</h3>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                    <tr>
                        <th>Timeline</th>
                        <th>Survival Function</th>
                        <th>Confidence Interval (Lower Bound)</th>
                        <th>Confidence Interval (Upper Bound)</th>
                    </tr>
                </thead>
                <tbody>
        `;

      // Mengisi data ke dalam tabel
      for (let i = 0; i < timeline.length; i++) {
        const lowerBound = confidenceInterval ? confidenceInterval[i * 2] : "N/A";
        const upperBound = confidenceInterval ? confidenceInterval[i * 2 + 1] : "N/A";
        tableContent += `
                <tr>
                    <td>${timeline[i]}</td>
                    <td>${survivalFunction[i]}</td>
                    <td>${lowerBound}</td>
                    <td>${upperBound}</td>
                </tr>
            `;
      }

      tableContent += `
                </tbody>
            </table>
        `;

      survivalContent += tableContent;
    } else {
      survivalContent += `<p><strong>Kaplan Meier Data:</strong> Tidak tersedia</p>`;
    }

    // Menambahkan pdf dan distribusi plot jika tersedia
    if (apiResponse.distribusi_plot) {
      survivalContent += `
            <p><strong>Distribusi Plot:</strong></p>
            <img src="data:image/png;base64,${apiResponse.distribusi_plot}" alt="Distribusi Plot" style="width:500px; height:400px;">
        `;
    } else {
      survivalContent += `<p><strong>Distribusi Plot:</strong> Tidak tersedia</p>`;
    }

    // Menambahkan hazard plot jika tersedia
    if (apiResponse.hazard_plot) {
      survivalContent += `
            <p><strong>Hazard Plot:</strong></p>
            <img src="data:image/png;base64,${apiResponse.hazard_plot}" alt="Hazard Plot" style="width:500px; height:400px;">
        `;
    } else {
      survivalContent += `<p><strong>Hazard Plot:</strong> Tidak tersedia</p>`;
    }

    // Menambahkan kaplan meier plot jika tersedia
    if (apiResponse.kaplan_meier_plot) {
      survivalContent += `
            <p><strong>Kaplan Meier Plot:</strong></p>
            <img src="data:image/png;base64,${apiResponse.kaplan_meier_plot}" alt="Kaplan Meier Plot" style="width:500px; height:400px;">
        `;
    } else {
      survivalContent += `<p><strong>Kaplan Meier Plot:</strong> Tidak tersedia</p>`;
    }

    // Menambahkan konten ke dalam survivalDiv
    survivalDiv.innerHTML = survivalContent;

    // Menambahkan div survival ke dalam output
    document.getElementById("survival-output").appendChild(survivalDiv);
  }

  // Fungsi untuk menangani checkbox estimasi
  function handleCheckboxEstimasi(event) {
    const variableName = event.target.dataset.variable;

    const allData = hot.getData();
    if (headers.length === 0) {
      headers = allData[0]; // Anggap baris pertama adalah headers
    }

    // Update status checkbox untuk variabel yang dipilih
    selectedVariables[variableName] = event.target.checked;

    // Mengambil data sesuai dengan checkbox yang dicentang
    const selectedData = {};
    for (const variable in selectedVariables) {
      if (selectedVariables[variable]) {
        const index = headers.indexOf(variable); // Temukan index berdasarkan header
        if (index !== -1) {
          const data = allData
            .slice(1)
            .map((row) => row[index])
            .filter(Boolean); // Ambil data untuk variabel ini, hilangkan nilai null/undefined
          selectedData[variable] = data;
        } else {
          console.error(`Variable ${variable} tidak ditemukan di headers`);
        }
      }
    }

    // Menampilkan data yang akan dikirim ke server
    console.log("Data yang akan dikirim ke server:", selectedData);

    // Menghapus hasil yang sebelumnya ditampilkan jika ada
    const existingEstimasiDiv = document.querySelector(".estimasi-item");
    if (existingEstimasiDiv) {
      existingEstimasiDiv.remove();
    }

    // Jika tidak ada checkbox yang dicentang, tidak perlu memanggil API
    if (Object.keys(selectedData).length === 0) {
      return;
    }

    // Mengirim data ke server jika ada checkbox yang dicentang
    fetch("/get-survival/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(selectedData),
    })
      .then((response) => response.json())
      .then((apiResponse) => {
        if (apiResponse.error) {
          console.error(apiResponse.error);
          return;
        }
        // Menampilkan hasil estimasi setelah hasil yang lama dihapus
        generateEstimasiResponse(apiResponse);
      })
      .catch((error) => console.error("An error occurred:", error));
  }

  function generateEstimasiResponse(apiResponse) {
    // Create a div to display the estimation results
    const estimasiDiv = document.createElement("div");
    estimasiDiv.classList.add("estimasi-item");

    // Initialize estimation content
    let estimasiContent = "";

    // Create a table for distribution results if data is available
    if (apiResponse.all_distributions_results !== undefined && Object.keys(apiResponse.all_distributions_results).length > 0) {
      // Create the table element
      let tableHTML = `
            <h3>Distribution Comparison Results</h3>
            <table class="stats-table" style="width: 80%">
                <thead>
                    <tr>
                        <th>Distribution</th>
                        <th>AIC</th>
                        <th>KS</th>
                        <th>p-value</th>
                    </tr>
                </thead>
                <tbody>
        `;

      // Loop through each distribution
      for (const dist in apiResponse.all_distributions_results) {
        const result = apiResponse.all_distributions_results[dist];

        // Get AIC, KS_STATS, and p-value values
        const aicValue = result.aic !== null && result.aic !== undefined ? result.aic.toFixed(4) : "Cannot be calculated";
        const ksStatsValue = result.ks_stat !== null && result.ks_stat !== undefined ? result.ks_stat.toFixed(4) : "Cannot be calculated";
        const pValue = result.p_value !== null && result.p_value !== undefined ? result.p_value.toFixed(4) : "Cannot be calculated";

        // Add a row to the table
        tableHTML += `
                <tr>
                    <td>${dist}</td>
                    <td>${aicValue}</td>
                    <td>${ksStatsValue}</td>
                    <td>${pValue}</td>
                </tr>
            `;
      }

      tableHTML += `
                </tbody>
            </table>
        `;

      // Add the table to the content
      estimasiContent += tableHTML;
    }

    // Add information about the predicted distribution and its AIC
    estimasiContent += `
        <h3>Estimation Analysis Result</h3>
        <p><strong>Estimated Distribution:</strong> ${apiResponse.predicted_distribution ?? "No prediction available."}</p>
    `;

    if (apiResponse.aic !== undefined) {
      estimasiContent += `<p><strong>AIC (Estimated Distribution):</strong> ${apiResponse.aic}</p>`;
    }

    if (apiResponse.params !== undefined) {
      let paramValues = Object.values(apiResponse.params).map((value) => (typeof value === "number" ? value.toFixed(2) : value));
      estimasiContent += `<p><strong>Parameters:</strong> ${paramValues.join(", ")}</p>`;
    }

    // Add the content to the estimasiDiv
    estimasiDiv.innerHTML = estimasiContent;

    // Append the estimasiDiv to the output
    document.getElementById("estimasi-output").appendChild(estimasiDiv);
  }

  function removeStatistics(variableName) {
    const statsItem = descriptiveOutput.querySelector(`.stats-item`);
    if (statsItem) {
      statsItem.remove();
    }

    // menghapus data statistik yang sedang diproses (opsional jika ada logika tambahan)
    console.log(`Statistics for variable ${variableName} removed.`);
  }

  // fungsi untuk mendapatkan cookie CSRF
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
      for (const cookie of cookies) {
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
});
