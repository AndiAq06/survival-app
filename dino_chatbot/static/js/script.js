const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const deleteChatButton = document.querySelector("#delete-chat-button");
const greetingElement = document.getElementById("greeting");

//  fungsi untuk greetings
function getGreeting() {
  const now = new Date();
  const hours = now.getHours();
  if (hours >= 5 && hours < 12) {
    return "Good Morning";
  } else if (hours >= 12 && hours < 15) {
    return "Good Afternoon";
  } else if (hours >= 15 && hours < 18) {
    return "Good Evening";
  } else {
    return "Good Night";
  }
}

if (greetingElement) {
  greetingElement.textContent = `${getGreeting()}`;
} else {
  console.log("Element with ID 'greeting' not found.");
}

// state variables
let userMessage = null;
let isResponseGenerating = false;

// membuat element pesan baru dan mengembalikannya
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// fungsi untuk typing effect untuk menampilkan kata per kata
const showTypingEffect = (text, textElement, incomingMessageDiv, callback) => {
  const words = text.split(" ");
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    textElement.innerText += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    if (currentWordIndex === words.length) {
      clearInterval(typingInterval); // menghentikan interval saat selesai mengetik
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");

      // jalankan callback jika tersedia
      if (typeof callback === "function") {
        callback();
      }
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight);
  }, 75);

  // fungsi untuk membuat persamaan matematika
  MathJax.typeset();
};

// fetch resnponse dari backend
document.getElementById("input-form").onsubmit = async function (event) {
  event.preventDefault(); // Mencegah reload halaman setelah submit

  // ambil input pengguna
  const userInput = document.getElementById("user-input").value.trim();
  console.log("User Input:", userInput);

  try {
    // kirim data ke backend menggunakan fetch
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

    const data = {
      // kirim langsung input pengguna ke backend
      user_input: userInput,
    };

    console.log("Parsed Data:", data);

    const response = await fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      // kirim data dalam format JSON
      body: JSON.stringify(data),
    });

    // respons dari backend
    const result = await response.json();
    console.log("result", result);

    // memastikan respons berhasil
    if (!response.ok) throw new Error(result.error?.message || "Server Error");

    // panggil fungsi generateAPIResponse dengan data yang diterima
    // tampilkan loading
    const incomingMessageDiv = showLoadingAnimation();
    generateAPIResponse(result, incomingMessageDiv);
  } catch (error) {
    console.error("Error:", error.message);
    alert("An error occurred: " + error.message);
  }
};

// fungsi untuk memproses API Response
const generateAPIResponse = (apiResponse, incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
    if (!apiResponse || typeof apiResponse !== "object") {
      throw new Error("API response is empty or not a valid object.");
    }

    // ambil respons teks dari API
    const responseText = apiResponse.result || "";

    // bersihkan format markdown jika ada
    const cleanResponse = responseText.replace(/\*\*(.*?)\*\*/g, "$1");

    // menampilkan hasil dengan efek mengetik
    showTypingEffect(cleanResponse, textElement, incomingMessageDiv);
  } catch (error) {
    console.error("Error in generateAPIResponse:", error.message);
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
};

// memnampilkan loading animation ketika menunggu response dari API
const showLoadingAnimation = () => {
  let existingLoading = document.querySelector(".message.loading");
  if (existingLoading) return existingLoading;

  // jika tidak ada loading, buat baru
  const html = `<div class="message-content">
                  <img class="avatar" src="static/images/gemini.svg" alt="icon">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);

  chatContainer.scrollTo(0, chatContainer.scrollHeight);
  MathJax.typeset();
  return incomingMessageDiv;
};

// copy message ke clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; // Show confirmation icon
  setTimeout(() => (copyButton.innerText = "content_copy"), 1000);
};

// handle sending outgoing chat messages
const handleOutgoingChat = () => {
  userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return;
  isResponseGenerating = true;

  const html = `<div class="message-content">
                  <img class="avatar" src="static/images/icon.png" alt="User avatar">
                  <p class="text"></p>
                </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);

  typingForm.reset(); // Clear input field
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
};

// fungsi untuk menghapus semua chat
deleteChatButton.addEventListener("click", () => {
  Swal.fire({
    title: "Delete All Chats?",
    text: "Are you sure you want to delete all the chats?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      chatContainer.innerHTML = "";
      Swal.fire("Deleted!", "All chats have been deleted.", "success");
    }
  });
});

// tambahkan event listener untuk setiap suggestion
suggestions.forEach((suggestion) => {
  suggestion.addEventListener("click", async () => {
    // ambil teks dari elemen yang diklik
    const userMessage = suggestion.querySelector(".text").innerText.trim();
    console.log("Suggestion Clicked:", userMessage);

    try {
      // kirim data ke backend menggunakan fetch
      const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]").value;

      const data = {
        user_input: userMessage, // kirim teks dari suggestion
      };

      console.log("Parsed Data:", data);

      const response = await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify(data), // kirim data dalam format JSON
      });

      const result = await response.json(); // respons dari backend
      console.log("result", result);

      // pastikan respons berhasil
      if (!response.ok) throw new Error(result.error?.message || "Server Error");

      // panggil fungsi generateAPIResponse dengan data yang diterima
      const incomingMessageDiv = showLoadingAnimation();
      generateAPIResponse(result, incomingMessageDiv);
    } catch (error) {
      console.error("Error:", error.message);
      alert("An error occurred: " + error.message);
    }
  });
});

// prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingChat();
  // fungsi untuk menampilkan persamaan matematika
  MathJax.typeset();
});
