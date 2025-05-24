// dataHandlers.js
export function setupDataHandlers(hot) {
  // Clear data handler
  document.getElementById("clear-data").addEventListener("click", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Check if table is empty
    const data = hot.getData();
    let isEmpty = true;

    for (let row of data) {
      if (row.some((cell) => cell !== null && cell !== "" && cell !== undefined)) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      Swal.fire({
        title: "No Data to Clear!",
        text: "The table is already empty.",
        icon: "info",
        showConfirmButton: false,
        timer: 1500,
      });
      return;
    }

    const originalConfirm = window.confirm;
    window.confirm = () => true;

    Swal.fire({
      title: "Clear All Data?",
      text: "This will delete all data in the table. This cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      allowOutsideClick: false,
      didOpen: () => {
        window.confirm = originalConfirm;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        // Clear data
        const newData = [];
        const colCount = hot.countCols();

        for (let i = 0; i < hot.countRows(); i++) {
          newData.push(Array(colCount).fill(""));
        }

        hot.loadData(newData);
        hot.render();

        // Success notification
        Swal.fire({
          title: "Cleared!",
          text: "All data has been cleared successfully",
          icon: "success",
          showConfirmButton: false,
          timer: 1500,
          confirmButtonColor: "#3085d6",
        });
      }
    });
  });

  // Export data handler
  document.getElementById("export-data").addEventListener("click", function (event) {
    event.preventDefault();

    // Get data from handsontable
    const data = hot.getData();

    // Check if data is empty
    let isEmpty = true;
    for (let row of data) {
      if (row.some((cell) => cell !== null && cell !== "" && cell !== undefined)) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      // Show warning if data is empty
      Swal.fire({
        title: "No Data to Export!",
        text: "The table is empty. Please add some data before exporting.",
        icon: "warning",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      return;
    }

    // Proceed with export if data exists
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "data.xlsx");

    // Success notification
    Swal.fire({
      title: "Export Successful!",
      text: "Your data has been downloaded as 'data.xlsx'",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  });

  document.getElementById("import-data").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Tampilkan loading
    Swal.fire({
      title: "Processing File...",
      html: `Reading <b>${file.name}</b>`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const importedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      hot.loadData(importedData);

      // Notifikasi sukses
      Swal.fire({
        title: "Import Successful!",
        text: `Data from ${file.name} has been loaded.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    };

    reader.onerror = () => {
      Swal.fire({
        title: "Error!",
        text: "Failed to read the file.",
        icon: "error",
      });
    };

    reader.readAsArrayBuffer(file);
  });
}
