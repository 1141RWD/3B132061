// js/app.js

// ===== 首頁封面 + 瀏覽器上一頁控制 =====
const coverScreen = document.getElementById("cover-screen");
const coverCard = document.getElementById("cover-card");
const enterAlbumBtn = document.getElementById("enter-album-btn");

function showCover() {
  if (!coverScreen) return;
  coverScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function enterAlbum(pushState = true) {
  if (!coverScreen) return;
  coverScreen.classList.add("hidden");

  const albumTabBtn = document.querySelector('[data-target="album-view"]');
  if (albumTabBtn) albumTabBtn.click();

  if (pushState && window.history && history.pushState) {
    history.pushState({ page: "album" }, "", "#album");
  }
}

if (coverScreen) coverScreen.addEventListener("click", () => enterAlbum(true));
if (coverCard) {
  coverCard.addEventListener("click", (e) => {
    e.stopPropagation();
    enterAlbum(true);
  });
}
if (enterAlbumBtn) {
  enterAlbumBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    enterAlbum(true);
  });
}

window.addEventListener("popstate", (event) => {
  if (!event.state || event.state.page !== "album") showCover();
  else enterAlbum(false);
});

// ===============================
// Smart Add：檔名/網址 → 推論團體/成員/類別/名稱
// ===============================

const MEMBER_DB = {
  TWICE: ["Mina", "Momo", "Nayeon", "Sana", "Tzuyu", "Jihyo", "Jeongyeon", "Dahyun", "Chaeyoung"],
  MAMAMOO: ["Solar", "Moonbyul", "Wheein", "Hwasa"],
  VIVIZ: ["Eunha", "SinB", "Umji"],
};

const ALIAS_MAP = (() => {
  const map = new Map();
  for (const [group, members] of Object.entries(MEMBER_DB)) {
    for (const m of members) {
      map.set(m.toLowerCase(), { group, member: m });
    }
  }
  map.set("twice", { group: "TWICE", member: "" });
  map.set("mamamoo", { group: "MAMAMOO", member: "" });
  map.set("viviz", { group: "VIVIZ", member: "" });

  // 類別關鍵字
  map.set("badge", { category: "徽章" });
  map.set("徽章", { category: "徽章" });
  map.set("album", { category: "專輯" });
  map.set("專輯", { category: "專輯" });
  map.set("dvd", { category: "周邊" });
  map.set("周邊", { category: "周邊" });

  return map;
})();

function extractTokensFromRef(ref) {
  if (!ref) return [];
  try {
    const clean = decodeURIComponent(ref.split("#")[0].split("?")[0]);
    const last = clean.split("/").pop() || clean;
    const base = last.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
    return base.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  } catch {
    return String(ref).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }
}

function prettifyTitleFromTokens(tokens, removeSet) {
  const keep = tokens.filter(t => t && !removeSet.has(t));
  if (keep.length === 0) return "";
  // 把 feel_special -> Feel Special
  const joined = keep.join(" ");
  return joined
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function inferFromText(textRef) {
  const tokens = extractTokensFromRef(textRef);

  let group = "";
  let member = "";
  let category = ""; // 小卡/專輯/周邊/徽章

  for (const t of tokens) {
    const hit = ALIAS_MAP.get(t);
    if (!hit) continue;

    if (hit.member && !member) {
      member = hit.member;
      group = hit.group;
    }
    if (hit.group && !group) group = hit.group;
    if (hit.category && !category) category = hit.category;
  }

  if (!category) category = "小卡";

  // 自動名稱：成員優先，其次團體+title
  const removeSet = new Set([
    "twice","mamamoo","viviz",
    "badge","album","dvd",
    "photocard","card","pc"
  ]);
  // 也把 member token 移除，避免重複
  if (member) removeSet.add(member.toLowerCase());

  const titlePart = prettifyTitleFromTokens(tokens, removeSet);

  let name = "";
  if (member) {
    name = `${member} ${category}`;
  } else if (titlePart) {
    name = `${titlePart} ${category}`;
  } else if (group) {
    // DVD 常見想要顯示團體
    if (category === "周邊") name = `${group} 周邊`;
    else name = `${group} ${category}`;
  } else {
    name = `${category}`;
  }

  // 如果 titlePart 很像 Lights / Feel Special 且類別周邊，補 DVD 字樣
  if (category === "周邊" && tokens.includes("dvd") && !/dvd/i.test(name)) {
    name = name.replace(/周邊$/,"DVD");
  }

  return { group, member, category, name };
}

// ===== Smart Add UI helpers =====
function setPreviewImage(urlOrDataUrl) {
  const preview = document.getElementById("add-image-preview");
  if (!preview) return;

  if (!urlOrDataUrl) {
    preview.classList.add("is-empty");
    preview.style.backgroundImage = "";
    preview.textContent = "預覽";
    return;
  }
  preview.classList.remove("is-empty");
  preview.textContent = "";
  preview.style.backgroundImage = `url(${urlOrDataUrl})`;
  preview.style.backgroundSize = "cover";
  preview.style.backgroundPosition = "center";
}

function setSmartStatus(text, type = "") {
  const el = document.getElementById("smart-status");
  if (!el) return;
  el.className = "smart-status" + (type ? ` ${type}` : "");
  el.textContent = text;
}

// ✅ 你 console 報錯的元兇：一定要有這個
function resetSmartAddUI() {
  const form = document.getElementById("add-card-form");
  if (form) form.reset();

  const urlInput = document.getElementById("add-image");
  const fileInput = document.getElementById("add-image-file");
  if (fileInput) fileInput.value = "";
  if (urlInput) urlInput.value = "";

  setPreviewImage("");
  setSmartStatus("貼上圖片 / 上傳檔案後會自動填入「團體 / 成員 / 類別 / 名稱」");

  const adv = document.getElementById("advanced-area");
  const btn = document.getElementById("toggle-advanced");
  if (adv) adv.classList.add("hidden");
  if (btn) btn.textContent = "進階設定";
}

function wireSmartAddModal() {
  const urlInput = document.getElementById("add-image");
  const fileInput = document.getElementById("add-image-file");
  const nameInput = document.getElementById("add-name");
  const groupInput = document.getElementById("add-group");
  const memberInput = document.getElementById("add-member");
  const catSelect = document.getElementById("add-category");
  const toggleBtn = document.getElementById("toggle-advanced");
  const advArea = document.getElementById("advanced-area");

  if (!urlInput || !fileInput || !nameInput || !groupInput || !memberInput || !catSelect) {
    console.warn("[SmartAdd] missing elements, check IDs in HTML.");
    return;
  }

  // 避免重複綁定：用 dataset 記錄
  if (urlInput.dataset.bound === "1") return;
  urlInput.dataset.bound = "1";

  if (toggleBtn && advArea) {
    toggleBtn.addEventListener("click", () => {
      advArea.classList.toggle("hidden");
      toggleBtn.textContent = advArea.classList.contains("hidden") ? "進階設定" : "收合進階";
    });
  }

  function applyInference(hintText, previewUrl = "") {
    if (previewUrl) setPreviewImage(previewUrl);

    const r = inferFromText(hintText);

    // 類別：如果使用者還沒改過就自動選
    if (catSelect && (!catSelect.dataset.touched || catSelect.dataset.touched !== "1")) {
      catSelect.value = r.category || "小卡";
    }

    // 團體 / 成員：只在空白時填入
    if (r.group && !groupInput.value.trim()) groupInput.value = r.group;
    if (r.member && !memberInput.value.trim()) memberInput.value = r.member;

    // 名稱：空白才帶入
    if (!nameInput.value.trim() && r.name) nameInput.value = r.name;

    // 狀態提示
    if (r.member && r.group) {
      setSmartStatus(`已判斷：${r.group} · ${r.member}（${catSelect.value}）`, "ok");
    } else if (r.group) {
      setSmartStatus(`判斷到團體：${r.group}（成員不確定，可自行修改）`, "warn");
    } else {
      setSmartStatus("目前無法判斷團體/成員，你可以手動輸入～", "warn");
    }
  }

  // 類別被使用者手動改過就不要再自動覆蓋
  catSelect.addEventListener("change", () => {
    catSelect.dataset.touched = "1";
    // 如果名稱空白，順便用目前成員更新一次
    if (!nameInput.value.trim()) {
      const member = memberInput.value.trim();
      if (member) nameInput.value = `${member} ${catSelect.value}`;
    }
  });

  // 貼網址：預覽 + 推論（注意：有些站會擋外連，預覽看不到是正常的）
  urlInput.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (!url) {
      setPreviewImage("");
      setSmartStatus("貼上圖片 / 上傳檔案後會自動填入「團體 / 成員 / 類別 / 名稱」");
      return;
    }
    applyInference(url, url);
  });

  // 上傳圖片：用檔名推論 + 用 DataURL 做預覽
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    // 先用檔名做推論（最穩）
    applyInference(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // ✅ 預覽用 DataURL 一定能顯示
      setPreviewImage(dataUrl);
      // ✅ 也把 add-image 塞入 DataURL，讓你送出後能顯示圖片（你如果不想刷新保留，就之後再改存取策略）
      urlInput.value = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

// ===============================
// ===== 以下是原本主程式：Tabs/Modal/新增 =====
// ===============================

let currentPageIndex = 0;

// Tabs
const tabButtons = document.querySelectorAll(".tab-button");
const views = document.querySelectorAll(".view");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    views.forEach((v) => v.classList.toggle("active", v.id === target));

    if (target === "album-view") renderAlbum(currentPageIndex);
    if (target === "list-view") applyListFilter();
    if (target === "stats-view") renderStats();
  });
});

// Modal 控制
const cardModal = document.getElementById("card-modal");
const addModal = document.getElementById("add-modal");

document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", () => closeAllModals());
});

function closeAllModals() {
  if (cardModal) cardModal.classList.add("hidden");
  if (addModal) addModal.classList.add("hidden");
}

// ✅ 被 ui.js 呼叫：開啟新增 Modal
function openAddModal() {
  resetSmartAddUI();           // ✅ 不會再報 resetSmartAddUI undefined
  if (!addModal) return;
  addModal.classList.remove("hidden");
  const name = document.getElementById("add-name");
  if (name) name.focus();
}

// 卡片詳情（你原本應該已有）
function openCardModal(cardId) {
  const card = findCardById(cardId);
  if (!card) return;

  cardModal.dataset.cardId = card.id;

  const imgDiv = document.getElementById("detail-image");
  imgDiv.style.backgroundImage = card.imageUrl ? `url(${card.imageUrl})` : "";

  document.getElementById("detail-group-tag").textContent = card.group || "UNKNOWN";
  document.getElementById("detail-category-pill").textContent = card.category || "未分類";

  const favPill = document.getElementById("detail-fav-pill");
  if (card.isFavorite) favPill.classList.remove("is-hidden");
  else favPill.classList.add("is-hidden");

  document.getElementById("detail-name").textContent = card.name;
  document.getElementById("detail-subname").textContent = [card.group || "未設定團體", card.member || ""].filter(Boolean).join(" · ");
  document.getElementById("detail-note").textContent = card.note?.trim() ? card.note : "這張收藏目前還沒有備註，可以之後再補上～";
  document.getElementById("detail-series").textContent = card.series || "—";
  document.getElementById("detail-date").textContent = card.gotDate || "—";
  document.getElementById("detail-page").textContent = `第 ${card.pageIndex + 1} 頁`;
  document.getElementById("detail-slot").textContent = `第 ${card.slotIndex + 1} 格`;
  document.getElementById("detail-status").textContent = card.isFavorite ? "本命卡 · In Binder" : "一般收藏 · In Binder";

  const toggleBtn = document.getElementById("toggle-favorite-btn");
  toggleBtn.textContent = card.isFavorite ? "取消本命標記" : "設為本命卡 💖";

  cardModal.classList.remove("hidden");
}

// backdrop click
[cardModal, addModal].forEach((modal) => {
  if (!modal) return;
  const backdrop = modal.querySelector(".modal-backdrop");
  if (backdrop) backdrop.addEventListener("click", () => closeAllModals());
});

// 新增表單提交
document.getElementById("add-card-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("add-name").value.trim();
  if (!name) return;

  const group = document.getElementById("add-group").value.trim();
  const member = document.getElementById("add-member").value.trim();
  const category = document.getElementById("add-category").value;
  const imageUrl = document.getElementById("add-image").value.trim();
  const gotDate = document.getElementById("add-date")?.value || "";
  const series = document.getElementById("add-series")?.value.trim() || "";
  const note = document.getElementById("add-note").value.trim();

  let target;
  if (pendingSlotForNewCard) {
    target = { pageIndex: pendingSlotForNewCard.pageIndex, slotIndex: pendingSlotForNewCard.slotIndex };
  } else {
    target = findFirstEmptySlot();
  }
  pendingSlotForNewCard = null;

  const newCard = {
    id: Date.now(),
    name,
    group,
    member,
    category,
    series,
    gotDate,
    note,
    imageUrl,
    isFavorite: false,
    pageIndex: target.pageIndex,
    slotIndex: target.slotIndex,
  };

  cards.push(newCard);
  saveCards();
  closeAllModals();

  currentPageIndex = target.pageIndex;
  renderAlbum(currentPageIndex);
  applyListFilter();
  renderStats();
});

// List filter
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const favoriteFilter = document.getElementById("favorite-filter");

[searchInput, categoryFilter, favoriteFilter].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", () => applyListFilter());
});

function applyListFilter() {
  const filter = {
    keyword: searchInput?.value || "",
    category: categoryFilter?.value || "",
    favoriteOnly: favoriteFilter?.value === "favorite",
  };
  renderList(filter);
}

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  wireSmartAddModal();
  loadCards();
  renderAlbum(currentPageIndex);
  applyListFilter();
  renderStats();
});
