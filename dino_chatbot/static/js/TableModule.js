// Inisialisasi tabel dengan data default menggunakan library Handsontable
export function initializeTable() {
  // Data awal (default) yang digunakan untuk mengisi tabel, termasuk header
  const defaultData = [
    ["time_to_event", "event_status"], // header
    [13.03, 1],
    [12.6, 0],
    [13.68, 1],
    [8.93, 0],
    [17.43, 0],
    [5.68, 0],
    [15.19, 1],
    [9.4, 1],
    [9.84, 1],
    [5.35, 0],
    [3.84, 0],
    [6.59, 1],
    [9.51, 0],
    [12.08, 1],
    [11.81, 0],
    [13.05, 1],
    [5.79, 1],
    [11.22, 1],
    [1.64, 0],
    [7.72, 1],
    [10.87, 1],
    [10.11, 1],
    [7.44, 0],
    [8.6, 0],
    [12.93, 0],
    [11.96, 0],
    [2.99, 0],
    [1.38, 0],
    [8.39, 1],
    [8.29, 0],
    [10.87, 1],
    [13.72, 0],
    [2.73, 0],
    [9.97, 0],
    [13.81, 1],
    [6.71, 0],
    [5.62, 1],
  ];

  // Mendapatkan elemen DOM tempat tabel akan dirender
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

  // Mengembalikan instance Handsontable
  return hot;
}
