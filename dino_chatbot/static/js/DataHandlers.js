export function setupDataHandlers(hot) {
  // Handler untuk menu "Clear Data"
  document.getElementById("clear-data").addEventListener("click", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    // Ambil data dari tabel dan periksa apakah seluruh sel kosong
    const data = hot.getData();
    let isEmpty = true;

    for (let row of data) {
      if (row.some((cell) => cell !== null && cell !== "" && cell !== undefined)) {
        isEmpty = false;
        break;
      }
    }

    // Jika data kosong, tampilkan notifikasi informasi
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

    // Jika ada data, tampilkan konfirmasi sebelum menghapus
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
        const newData = [];
        const colCount = hot.countCols();

        for (let i = 0; i < 10; i++) {
          newData.push(Array(colCount).fill(""));
        }

        // Muat data kosong ke Handsontable dan render ulang
        hot.loadData(newData);
        hot.render();

        // Tampilkan notifikasi sukses
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

  // Handler untuk menu "Export Data"
  document.getElementById("export-data").addEventListener("click", function (event) {
    event.preventDefault();

    // Ambil data dari tabel dan periksa apakah kosong
    const data = hot.getData();

    let isEmpty = true;
    for (let row of data) {
      if (row.some((cell) => cell !== null && cell !== "" && cell !== undefined)) {
        isEmpty = false;
        break;
      }
    }

    // Jika kosong, tampilkan notifikasi peringatan
    if (isEmpty) {
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

    // Ekspor data ke file Excel
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "data.xlsx");

    // Tampilkan notifikasi sukses
    Swal.fire({
      title: "Export Successful!",
      text: "Your data has been downloaded as 'data.xlsx'",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
      timerProgressBar: true,
    });
  });

  // Handler untuk menu "Import Data"
  document.getElementById("import-data").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Tampilkan notifikasi loading saat proses pembacaan file
    Swal.fire({
      title: "Processing File...",
      html: `Reading <b>${file.name}</b>`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    // Ketika file berhasil dibaca
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const importedData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Tampilkan data ke tabel
      hot.loadData(importedData);

      // Tampilkan notifikasi sukses
      Swal.fire({
        title: "Import Successful!",
        text: `Data from ${file.name} has been loaded.`,
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
    };

    // Jika terjadi error saat membaca file
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
