// =============================================
//   WARDAI — APP.JS
//   All frontend logic + StyleBot chatbot
// =============================================


// ─── CANVAS PARTICLE BACKGROUND ───
(function initCanvas() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticles() {
    particles = [];
    const count = Math.floor((W * H) / 18000);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.45 + 0.08,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        hue: Math.random() > 0.5 ? 265 : 198
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue},80%,70%,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize(); createParticles(); draw();
  window.addEventListener("resize", () => { resize(); createParticles(); });
})();


// ─── TOAST ───
function showToast(message, type = "info", duration = 3200) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = { success: "✦", error: "✕", info: "·" };
  toast.innerHTML = `<span>${icons[type] || "·"}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px) scale(0.9)";
    toast.style.transition = "all .3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}


// ─── LOADING OVERLAY ───
function showLoading(show) {
  const el = document.getElementById("loadingOverlay");
  show ? el.classList.remove("hidden") : el.classList.add("hidden");
}


// ─── IMAGE PREVIEW ───
function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById("imagePreview").src = e.target.result;
    document.getElementById("imagePreview").classList.remove("hidden");
    document.getElementById("uploadPlaceholder").classList.add("hidden");
  };
  reader.readAsDataURL(file);
}


// ─── WARDROBE PANEL ───
function showWardrobe() {
  document.getElementById("wardrobeSection").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  renderWardrobe();
}

function closeWardrobe() {
  document.getElementById("wardrobeSection").classList.add("hidden");
  document.body.style.overflow = "";
}


// ─── ADD CLOTH (backend flow preserved) ───
async function addCloth() {
  const file     = document.getElementById("imageInput").files[0];
  const name     = document.getElementById("type").value.trim();
  const category = document.getElementById("category").value;
  const occasion = document.getElementById("occasion").value;

  if (!file || !name || !category) {
    showToast("Please fill all fields!", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = async function () {
    const imageData = reader.result;
    const color     = await getDominantColor(imageData);

    const item = {
      id:           Date.now(),
      type:         category,
      originalType: name,
      occasion,
      color,
      image:        imageData
    };

    saveToLocal(item);
    showToast(`"${name}" added to wardrobe!`, "success");

    // Reset form
    document.getElementById("imageInput").value = "";
    document.getElementById("type").value       = "";
    document.getElementById("category").value   = "";
    document.getElementById("imagePreview").classList.add("hidden");
    document.getElementById("uploadPlaceholder").classList.remove("hidden");

    renderWardrobe();
    updateStats();
  };
  reader.readAsDataURL(file);
}


// ─── LOCAL STORAGE ───
function saveToLocal(item) {
  const data = JSON.parse(localStorage.getItem("wardrobe")) || [];
  data.push(item);
  localStorage.setItem("wardrobe", JSON.stringify(data));
}

function getLocalData() {
  return JSON.parse(localStorage.getItem("wardrobe")) || [];
}


// ─── DELETE ───
function deleteCloth(id) {
  let data = getLocalData();
  const item = data.find(i => i.id === id);
  data = data.filter(i => i.id !== id);
  localStorage.setItem("wardrobe", JSON.stringify(data));
  if (item) showToast(`"${item.originalType}" removed`, "info");
  renderWardrobe();
  updateStats();
}


// ─── RENDER WARDROBE ───
function renderWardrobe() {
  const container = document.getElementById("wardrobe");
  const countEl   = document.getElementById("itemsCount");
  const items     = getLocalData();

  container.innerHTML = "";
  if (countEl) countEl.textContent = items.length;

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-wardrobe">No pieces yet — add your first item above ✦</div>`;
    return;
  }

  const typeLabels = { top: "Top", bottom: "Bottom", shoes: "Footwear" };

  items.forEach(item => {
    const card  = document.createElement("div");
    card.className = "wardrobe-card";
    const label = typeLabels[item.type] || item.type;

    card.innerHTML = `
      <img src="${item.image}" alt="${item.originalType}" loading="lazy" />
      <div class="card-info">
        <div class="card-name">${item.originalType}</div>
        <div class="card-type">${label} · ${item.occasion}</div>
      </div>
      <button class="btn-remove" onclick="deleteCloth(${item.id})">Remove</button>
    `;
    container.appendChild(card);
  });
}


// ─── UPDATE STATS ───
function updateStats() {
  const el = document.getElementById("statTotal");
  if (el) el.textContent = getLocalData().length;
}


// ─── WEATHER (backend flow preserved) ───
async function getWeather() {
  try {
    const res  = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=28.6&longitude=77.2&current_weather=true"
    );
    const data = await res.json();
    const temp = data.current_weather.temperature;

    const label = document.getElementById("weatherLabel");
    if (label) label.textContent = `${temp} °C`;

    return temp;
  } catch (e) {
    console.warn("Weather fetch failed:", e);
    return 25;
  }
}


// ─── AI SUGGESTION (backend flow 100% preserved) ───
async function getSuggestion() {
  const items = getLocalData();

  if (items.length === 0) {
    showToast("Add clothes to your wardrobe first!", "error");
    return;
  }

  showLoading(true);
  const temp = await getWeather();

  const structuredWardrobe = {
    tops:    items.filter(i => i.type === "top")   .map(i => ({ id: i.id, name: i.originalType })),
    bottoms: items.filter(i => i.type === "bottom").map(i => ({ id: i.id, name: i.originalType })),
    shoes:   items.filter(i => i.type === "shoes") .map(i => ({ id: i.id, name: i.originalType }))
  };

  try {
    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weather: temp, wardrobe: structuredWardrobe })
    });

    const data = await res.json();

    const top    = items.find(i => i.id == data.topId);
    const bottom = items.find(i => i.id == data.bottomId);
    const shoe   = items.find(i => i.id == data.shoesId);

    renderOutfit([top, bottom, shoe], data.summary);

  } catch (err) {
    console.error("Suggestion error:", err);
    showToast("Could not get suggestion. Try again.", "error");
  } finally {
    showLoading(false);
  }
}


// ─── RENDER OUTFIT ───
function renderOutfit(pieces, summary) {
  const outfitSection = document.getElementById("outfitSection");
  const outfitEl      = document.getElementById("outfit");
  const summaryEl     = document.getElementById("summary");

  outfitEl.innerHTML = "";

  const badgeClasses = { top: "badge-top", bottom: "badge-bottom", shoes: "badge-shoes" };
  const typeLabels   = { top: "Top", bottom: "Bottom", shoes: "Footwear" };

  pieces.forEach(item => {
    if (!item) return;
    const div = document.createElement("div");
    div.className = "outfit-item";

    div.innerHTML = `
      <img src="${item.image}" alt="${item.originalType}" />
      <div class="outfit-item-info">
        <div class="outfit-item-name">${item.originalType}</div>
        <div class="outfit-item-type">${typeLabels[item.type] || item.type}</div>
        <span class="outfit-item-badge ${badgeClasses[item.type] || 'badge-top'}">${typeLabels[item.type] || item.type}</span>
      </div>
    `;
    outfitEl.appendChild(div);
  });

  if (summaryEl) summaryEl.textContent = summary || "";

  outfitSection.classList.remove("hidden");
  outfitSection.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Outfit ready — looking good! ✦", "success");
}


// ─── DOMINANT COLOR (unchanged) ───
function getDominantColor(imageDataUrl) {
  const img    = new Image();
  img.src      = imageDataUrl;
  const canvas = document.createElement("canvas");
  const ctx    = canvas.getContext("2d");

  return new Promise(resolve => {
    img.onload = function () {
      canvas.width  = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i+1]; b += data[i+2]; count++;
      }
      resolve(`rgb(${Math.floor(r/count)},${Math.floor(g/count)},${Math.floor(b/count)})`);
    };
  });
}


// =============================================
//   STYLEBOT — FASHION CHATBOT
// =============================================

let chatHistory    = [];   // { role, content }[]
let chatOpen       = false;
let chatTyping     = false;

function toggleChat() {
  chatOpen = !chatOpen;
  const win    = document.getElementById("chatWindow");
  const fabIcon  = document.getElementById("chatFabIcon");
  const fabClose = document.getElementById("chatFabClose");

  if (chatOpen) {
    win.classList.remove("hidden");
    fabIcon.classList.add("hidden");
    fabClose.classList.remove("hidden");
    document.getElementById("chatInput").focus();
    scrollChatToBottom();
  } else {
    win.classList.add("hidden");
    fabIcon.classList.remove("hidden");
    fabClose.classList.add("hidden");
  }
}

function scrollChatToBottom() {
  const msgs = document.getElementById("chatMessages");
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

function getTimeStr() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appendMessage(role, content) {
  const msgs = document.getElementById("chatMessages");
  const div  = document.createElement("div");
  div.className = `chat-msg ${role}`;

  div.innerHTML = `
    <div class="msg-bubble">${content}</div>
    <div class="msg-time">${getTimeStr()}</div>
  `;

  msgs.appendChild(div);
  scrollChatToBottom();
}

function showTypingIndicator() {
  const msgs = document.getElementById("chatMessages");
  const div  = document.createElement("div");
  div.className = "chat-msg bot";
  div.id        = "typingIndicator";

  div.innerHTML = `
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  msgs.appendChild(div);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

function hideSuggestions() {
  const el = document.getElementById("chatSuggestions");
  if (el) el.style.display = "none";
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const text  = input.value.trim();
  if (!text || chatTyping) return;

  input.value = "";
  hideSuggestions();
  appendMessage("user", escapeHtml(text));

  chatHistory.push({ role: "user", content: text });

  chatTyping = true;
  document.getElementById("chatSendBtn").disabled = true;

  showTypingIndicator();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory })
    });

    const data = await res.json();
    removeTypingIndicator();

    const reply = data.reply || "Sorry, I couldn't respond. Try again!";
    appendMessage("bot", formatBotReply(reply));
    chatHistory.push({ role: "assistant", content: reply });

    // Keep history manageable
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

  } catch (err) {
    removeTypingIndicator();
    appendMessage("bot", "⚠️ Connection issue. Please try again.");
  } finally {
    chatTyping = false;
    document.getElementById("chatSendBtn").disabled = false;
    document.getElementById("chatInput").focus();
  }
}

function sendSuggestion(text) {
  document.getElementById("chatInput").value = text;
  sendMessage();
}

// Basic HTML escaping for user messages
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Format bot reply — allow basic markdown-ish bold/italic
function formatBotReply(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}


// ─── INIT ───
document.addEventListener("DOMContentLoaded", () => {
  renderWardrobe();
  updateStats();
  getWeather();
});