// Menampilkan hanya satu container tertentu berdasarkan ID, dan menyembunyikan yang lain
export function toggleContainer(showContainerId) {
  const allContainers = document.querySelectorAll(".container");
  allContainers.forEach((container) => {
    container.style.display = "none";
  });

  const showContainer = document.getElementById(showContainerId);
  if (showContainer) {
    showContainer.style.display = "block";
  }
}

// Membuat daftar variabel dalam bentuk elemen <ul> dengan checkbox per variabel
export function createVariableList(headers, onChangeCallback) {
  const list = document.createElement("ul");
  list.classList.add("variabel-statistic");

  headers.forEach((header, index) => {
    if (header?.trim()) {
      const listItem = document.createElement("li");

      // Setiap variabel diwakili checkbox dengan metadata (index dan nama variabel)
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.index = index;
      checkbox.dataset.variable = header.trim();

      // Callback dipicu saat checkbox diubah
      checkbox.addEventListener("change", onChangeCallback);
      listItem.appendChild(checkbox);
      listItem.appendChild(document.createTextNode(` ${header}`));
      list.appendChild(listItem);
    }
  });

  return list;
}

// Mengambil nilai cookie berdasarkan nama yang diberikan
export function getCookie(name) {
  let cookieValue = null;

  // Mengecek dan memproses cookie yang tersedia di dokumen
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
    for (const cookie of cookies) {
      // Mencocokkan cookie berdasarkan nama yang dicari
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
