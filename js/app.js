// js/app.js

// ===== 防呆：確保 UI 函式存在 =====
window.renderStats = window.renderStats || function () { console.warn("renderStats missing"); };
// 注意：這裡移除了 window.renderAchievements 的防呆，因為我們會在 ui.js 定義它，
// 且不希望 app.js 後面的舊代碼覆蓋它。

window.getToastSeenSet = window.getToastSeenSet || function () {
  try {
    const raw = localStorage.getItem("toast_seen") || "[]";
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
};

window.setToastSeenSet = window.setToastSeenSet || function (set) {
  try {
    localStorage.setItem("toast_seen", JSON.stringify([...set]));
  } catch {}
};

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
// Smart Add 邏輯 (保持不變)
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
  const joined = keep.join(" ");
  return joined.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function inferFromText(textRef) {
  const tokens = extractTokensFromRef(textRef);
  let group = "";
  let member = "";
  let category = "";

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

  const removeSet = new Set(["twice","mamamoo","viviz","badge","album","dvd","photocard","card","pc"]);
  if (member) removeSet.add(member.toLowerCase());

  const titlePart = prettifyTitleFromTokens(tokens, removeSet);

  let name = "";
  if (member) name = `${member} ${category}`;
  else if (titlePart) name = `${titlePart} ${category}`;
  else if (group) {
    if (category === "周邊") name = `${group} 周邊`;
    else name = `${group} ${category}`;
  } else name = `${category}`;

  if (category === "周邊" && tokens.includes("dvd") && !/dvd/i.test(name)) {
    name = name.replace(/周邊$/,"DVD");
  }

  return { group, member, category, name };
}

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

  if (!urlInput) return;
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
    if (catSelect && (!catSelect.dataset.touched || catSelect.dataset.touched !== "1")) {
      catSelect.value = r.category || "小卡";
    }
    if (r.group && !groupInput.value.trim()) groupInput.value = r.group;
    if (r.member && !memberInput.value.trim()) memberInput.value = r.member;
    if (!nameInput.value.trim() && r.name) nameInput.value = r.name;

    if (r.member && r.group) {
      setSmartStatus(`已判斷：${r.group} · ${r.member}（${catSelect.value}）`, "ok");
    } else if (r.group) {
      setSmartStatus(`判斷到團體：${r.group}（成員不確定，可自行修改）`, "warn");
    } else {
      setSmartStatus("目前無法判斷團體/成員，你可以手動輸入～", "warn");
    }
  }

  if (catSelect) {
    catSelect.addEventListener("change", () => {
      catSelect.dataset.touched = "1";
      if (!nameInput.value.trim()) {
        const member = memberInput.value.trim();
        if (member) nameInput.value = `${member} ${catSelect.value}`;
      }
    });
  }

  urlInput.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (!url) {
      setPreviewImage("");
      setSmartStatus("貼上圖片 / 上傳檔案後會自動填入「團體 / 成員 / 類別 / 名稱」");
      return;
    }
    applyInference(url, url);
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    applyInference(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
      urlInput.value = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ===============================
// 主程式：Tabs / Modal / 新增 / 翻頁
// ===============================

let currentPageIndex = 0;
let pendingSlotForNewCard = null; // 修正變數 scope 問題

// 1. Tabs 切換
const tabButtons = document.querySelectorAll(".tab-button");
const views = document.querySelectorAll(".view");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    views.forEach((v) => v.classList.toggle("active", v.id === target));

    if (target === "album-view") {
      renderAlbum(currentPageIndex);
    } else if (target === "list-view") {
      applyListFilter();
    } else if (target === "stats-view") {
      renderStats();
      if (typeof renderAchievements === 'function') renderAchievements();
    }
  });
});

// 2. Modal 控制
const cardModal = document.getElementById("card-modal");
const addModal = document.getElementById("add-modal");

document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", () => closeAllModals());
});

function closeAllModals() {
  if (cardModal) cardModal.classList.add("hidden");
  if (addModal) addModal.classList.add("hidden");
}

function openAddModal() {
  resetSmartAddUI();
  if (!addModal) return;
  addModal.classList.remove("hidden");
  const name = document.getElementById("add-name");
  if (name) name.focus();
}

function openCardModal(cardId) {
  const card = findCardById(cardId);
  if (!card) return;

  if (cardModal) cardModal.dataset.cardId = card.id;

  const imgDiv = document.getElementById("detail-image");
  if (imgDiv) imgDiv.style.backgroundImage = card.imageUrl ? `url(${card.imageUrl})` : "";

  const gTag = document.getElementById("detail-group-tag");
  if(gTag) gTag.textContent = card.group || "UNKNOWN";
  
  const cPill = document.getElementById("detail-category-pill");
  if(cPill) cPill.textContent = card.category || "未分類";

  const favPill = document.getElementById("detail-fav-pill");
  if (favPill) {
    if (card.isFavorite) favPill.classList.remove("is-hidden");
    else favPill.classList.add("is-hidden");
  }

  const dName = document.getElementById("detail-name");
  if(dName) dName.textContent = card.name;
  
  const dSub = document.getElementById("detail-subname");
  if(dSub) dSub.textContent = [card.group || "未設定團體", card.member || ""].filter(Boolean).join(" · ");
  
  const dNote = document.getElementById("detail-note");
  if(dNote) dNote.textContent = card.note?.trim() ? card.note : "這張收藏目前還沒有備註，可以之後再補上～";
  
  document.getElementById("detail-series").textContent = card.series || "—";
  document.getElementById("detail-date").textContent = card.gotDate || "—";
  document.getElementById("detail-page").textContent = `第 ${card.pageIndex + 1} 頁`;
  document.getElementById("detail-slot").textContent = `第 ${card.slotIndex + 1} 格`;
  document.getElementById("detail-status").textContent = card.isFavorite ? "本命卡 · In Binder" : "一般收藏 · In Binder";

  const toggleBtn = document.getElementById("toggle-favorite-btn");
  if(toggleBtn) toggleBtn.textContent = card.isFavorite ? "取消本命標記" : "設為本命卡 💖";
  // 重新綁定刪除/最愛按鈕
  
  // 刪除按鈕
  const delBtn = document.getElementById("delete-card-btn");
  if (delBtn) {
    delBtn.onclick = () => {
      if (confirm("確定要刪除這張收藏嗎？此動作無法復原。")) {
         cards = cards.filter(c => c.id !== card.id);
         saveCards();
         closeAllModals();
         renderAlbum(currentPageIndex);
         applyListFilter();
         renderStats();
         showToast("已刪除收藏", {icon: "🗑️"});
      }
    };
  }

  // 最愛按鈕
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      card.isFavorite = !card.isFavorite;
      saveCards();
      openCardModal(card.id); // 刷新 Modal 狀態
      renderAlbum(currentPageIndex); // 刷新背景
      if (typeof renderAchievements === 'function') renderAchievements();
    };
  }

  cardModal.classList.remove("hidden");
}

// 3. 翻頁按鈕事件監聽 (✅ 這是你原本漏掉的！)
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");

if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      renderAlbum(currentPageIndex);
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    const maxPage = getMaxPageIndex();
    // 允許翻到最後一頁的下一頁(空白頁)
    if (currentPageIndex <= maxPage) {
      currentPageIndex++;
      renderAlbum(currentPageIndex);
    }
  });
}

// 4. 新增表單提交
const addForm = document.getElementById("add-card-form");
if (addForm) {
  addForm.addEventListener("submit", (e) => {
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
    if (typeof renderAchievements === 'function') renderAchievements();
  });
}

// 5. 搜尋與篩選
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

// 6. 統計 renderStats
// ✅ 修正：移除不存在的 getAllCardsSafe()，改成直接用 cards
function renderStats() {
  const all = cards; // 直接用全域變數
  const total = all.length;
  const fav = all.filter(c => !!c.isFavorite).length;

  const summaryEl = document.getElementById("stats-summary");
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="stat-chip">
        <div class="stat-chip__label">總收藏</div>
        <div class="stat-chip__value">${total}</div>
      </div>
      <div class="stat-chip">
        <div class="stat-chip__label">本命卡</div>
        <div class="stat-chip__value">${fav}</div>
      </div>
      <div class="stat-chip">
        <div class="stat-chip__label">一般收藏</div>
        <div class="stat-chip__value">${Math.max(0, total - fav)}</div>
      </div>
    `;
  }

  // 依團體
  const groupMap = new Map();
  for (const c of all) {
    const g = (c.group || "UNKNOWN").trim() || "UNKNOWN";
    groupMap.set(g, (groupMap.get(g) || 0) + 1);
  }
  const groupList = [...groupMap.entries()].sort((a, b) => b[1] - a[1]);

  const groupEl = document.getElementById("stats-by-group");
  if (groupEl) {
    if (groupList.length === 0) {
      groupEl.innerHTML = `<div class="empty-hint">目前還沒有收藏資料</div>`;
    } else {
      const max = Math.max(...groupList.map(([, v]) => v), 1);
      groupEl.innerHTML = groupList.map(([name, count]) => {
        const w = Math.round((count / max) * 100);
        return `
          <div class="bar-row">
            <div class="bar-row__head">
              <span class="bar-row__label">${name}</span>
              <strong class="bar-row__value">${count}</strong>
            </div>
            <div class="bar">
              <div class="bar__fill" style="width:${w}%"></div>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // 依類別
  const catMap = new Map();
  for (const c of all) {
    const cat = (c.category || "未分類").trim() || "未分類";
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  }
  const catList = [...catMap.entries()].sort((a, b) => b[1] - a[1]);

  const catEl = document.getElementById("stats-by-category");
  if (catEl) {
    if (catList.length === 0) {
      catEl.innerHTML = `<div class="empty-hint">目前還沒有收藏資料</div>`;
    } else {
      const max = Math.max(...catList.map(([, v]) => v), 1);
      catEl.innerHTML = catList.map(([name, count]) => {
        const w = Math.round((count / max) * 100);
        return `
          <div class="bar-row">
            <div class="bar-row__head">
              <span class="bar-row__label">${name}</span>
              <strong class="bar-row__value">${count}</strong>
            </div>
            <div class="bar">
              <div class="bar__fill" style="width:${w}%"></div>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

// 注意：這裡移除了 app.js 裡面的 renderAchievements，
// 讓它完全依賴 ui.js 裡面的版本，避免衝突。

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  wireSmartAddModal();
  loadCards();
  renderAlbum(currentPageIndex);
  applyListFilter();
  renderStats();
  if (typeof renderAchievements === 'function') renderAchievements();
});