function exportToExcel(variableName, stats) {
  // Install library sheetjs terlebih dahulu: npm install xlsx
  import("xlsx")
    .then((XLSX) => {
      // Prepare data
      let data = [];

      if (stats.type === "Numeric") {
        data = [
          ["Statistic", "Value"],
          ["Mean", stats.mean],
          ["Median", stats.median],
          ["Mode", stats.mode],
          ["Standard Deviation", stats.std],
          ["Skewness", stats.skewness],
          ["Kurtosis", stats.kurtosis],
          ["Minimum", stats.min],
          ["Maximum", stats.max],
          ["Sum", stats.sum],
          ["Count", stats.count],
        ];
      } else {
        data = [["Category", "Count", "Percentage"]];
        const total = Object.values(stats.categoryCount).reduce((sum, count) => sum + count, 0);

        for (const [category, count] of Object.entries(stats.categoryCount)) {
          const percentage = ((count / total) * 100).toFixed(1);
          data.push([category, count, `${percentage}%`]);
        }
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "Statistics");

      // Export to file
      XLSX.writeFile(wb, `${variableName}_statistics.xlsx`);
    })
    .catch((err) => {
      console.error("Error loading xlsx library:", err);
      showErrorNotification("Failed to export to Excel");
    });
}
