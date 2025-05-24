// utils.js
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

export function createVariableList(headers, onChangeCallback) {
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

export function getCookie(name) {
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
