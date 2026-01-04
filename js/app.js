// js/app.js

// ===== 首頁封面 + 瀏覽器上一頁控制 =====
const coverScreen = document.getElementById("cover-screen");
const coverCard = document.getElementById("cover-card");
const enterAlbumBtn = document.getElementById("enter-album-btn");

// 顯示封面
function showCover() {
  if (!coverScreen) return;
  coverScreen.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "instant" });
}

// 進入收藏冊內容頁
function enterAlbum(pushState = true) {
  if (!coverScreen) return;
  coverScreen.classList.add("hidden"); // 隱藏封面

  // 切到「收藏冊」分頁
  const albumTabBtn = document.querySelector('[data-target="album-view"]');
  if (albumTabBtn) {
    albumTabBtn.click();
  }

  // 第一次進內容頁時，把狀態推進 history
  if (pushState && window.history && history.pushState) {
    history.pushState({ page: "album" }, "", "#album");
  }
}

// 點整個封面（空白也算）
if (coverScreen) {
  coverScreen.addEventListener("click", () => enterAlbum(true));
}

// 點封面卡片本身
if (coverCard) {
  coverCard.addEventListener("click", (e) => {
    e.stopPropagation();
    enterAlbum(true);
  });
}

// 點「進入我的收藏冊」按鈕
if (enterAlbumBtn) {
  enterAlbumBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    enterAlbum(true);
  });
}

// 監聽瀏覽器上一頁 / 下一頁
window.addEventListener("popstate", (event) => {
  // 沒有 state 或不是 album，就顯示封面
  if (!event.state || event.state.page !== "album") {
    showCover();
  } else {
    // 回到 album 狀態時，確保封面關掉（但不要再 pushState）
    enterAlbum(false);
  }
});

// ===============================
// Smart Add：圖片 → 推論團體/成員（可接 AI）
// ===============================

// 1) 成員對照表（你可以一直加）
const MEMBER_DB = {
  TWICE: ["Mina", "Momo", "Nayeon", "Sana", "Tzuyu", "Jihyo", "Jeongyeon", "Dahyun", "Chaeyoung"],
  MAMAMOO: ["Solar", "Moonbyul", "Wheein", "Hwasa"],
  VIVIZ: ["Eunha", "SinB", "Umji"]
};

// 2) 產生 alias（小寫匹配用）
const ALIAS_MAP = (() => {
  const map = new Map();
  for (const [group, members] of Object.entries(MEMBER_DB)) {
    for (const m of members) {
      map.set(m.toLowerCase(), { group, member: m });
      // 你可自行加常見暱稱 / 拼法
      if (m === "Jeongyeon") map.set("jungyeon", { group, member: m });
      if (m === "Moonbyul") map.set("moonbyul", { group, member: m });
      if (m === "SinB") map.set("sinb", { group, member: m });
    }
  }
  // 團體關鍵字（路徑/網址裡有也算）
  map.set("twice", { group: "TWICE", member: "" });
  map.set("mamamoo", { group: "MAMAMOO", member: "" });
  map.set("viviz", { group: "VIVIZ", member: "" });
  return map;
})();

// 3) 解析字串（從 URL/檔名抓關鍵字）
function extractTokensFromImageRef(imageRef) {
  if (!imageRef) return [];
  try {
    // 去掉 query/hash，取最後一段檔名
    const clean = decodeURIComponent(imageRef.split("#")[0].split("?")[0]);
    const last = clean.split("/").pop() || clean;
    // 去掉副檔名
    const base = last.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
    // 以非字母數字切割
    return base.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  } catch {
    return imageRef.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }
}

// 4) 本地規則推論（不靠 AI，最穩）
function inferLocal(imageRef) {
  const tokens = extractTokensFromImageRef(imageRef);
  let guessedGroup = "";
  let guessedMember = "";

  for (const t of tokens) {
    const hit = ALIAS_MAP.get(t);
    if (!hit) continue;

    if (hit.member && !guessedMember) {
      guessedMember = hit.member;
      guessedGroup = hit.group;
      break; // 找到成員就很強，直接收工
    }
    if (hit.group && !guessedGroup) {
      guessedGroup = hit.group;
    }
  }

  // 如果只有成員沒團體（理論上不會），補回去
  if (guessedMember && !guessedGroup) {
    for (const [g, ms] of Object.entries(MEMBER_DB)) {
      if (ms.some((x) => x.toLowerCase() === guessedMember.toLowerCase())) {
        guessedGroup = g;
        break;
      }
    }
  }

  return { group: guessedGroup, member: guessedMember, confidence: guessedMember ? 0.9 : guessedGroup ? 0.6 : 0.0 };
}

// 5) 未來 AI 接口（先保留架構，現在回傳 null）
async function inferFromAI(/* imageRef */) {
  // ✅ 之後你要接 AI 時，把這邊換成 fetch 到你的 API 即可，例如：
  // const res = await fetch("/api/infer", { method:"POST", body: JSON.stringify({ imageRef }) });
  // return await res.json(); // { group, member, confidence }
  return null;
}

// 6) 統一推論入口（先本地、再 AI）
async function inferFromImage(imageRef) {
  const local = inferLocal(imageRef);
  if (local.confidence >= 0.9) return local;

  const ai = await inferFromAI(imageRef);
  if (ai && (ai.group || ai.member)) return ai;

  return local;
}

// 7) 綁定新增 modal 的 UI 行為
function wireSmartAddModal() {
  const imageInput = document.getElementById("add-image");
  const nameInput = document.getElementById("add-name");
  const groupInput = document.getElementById("add-group");
  const memberInput = document.getElementById("add-member");
  const catSelect = document.getElementById("add-category");
  const statusEl = document.getElementById("smart-status");
  const previewEl = document.getElementById("add-image-preview");
  const toggleBtn = document.getElementById("toggle-advanced");
  const advArea = document.getElementById("advanced-area");
  const fileInput = document.getElementById("add-image-file");


  if (!imageInput || !statusEl || !previewEl) return;

  // 進階收合
  if (toggleBtn && advArea) {
    toggleBtn.addEventListener("click", () => {
      advArea.classList.toggle("hidden");
      toggleBtn.textContent = advArea.classList.contains("hidden") ? "進階設定" : "收合進階";
    });
  }

  async function runInfer() {
    const ref = imageInput.value.trim();

    // 預覽（有圖就顯示）
    if (ref) {
      previewEl.classList.add("has-img");
      previewEl.style.backgroundImage = `url(${ref})`;
    } else {
      previewEl.classList.remove("has-img");
      previewEl.style.backgroundImage = "";
    }

    const result = await inferFromImage(ref);

    // 自動填入（不要覆蓋使用者已手動輸入的內容：只有空白才填）
    if (result.group && !groupInput.value.trim()) groupInput.value = result.group;
    if (result.member && !memberInput.value.trim()) memberInput.value = result.member;

    // 名稱自動帶入（只有空白才帶）
    if (!nameInput.value.trim()) {
      const cat = catSelect?.value || "小卡";
      if (result.member) nameInput.value = `${result.member} ${cat}`;
    }

    // 提示文案
    if (result.member && result.group) {
      statusEl.className = "smart-status ok";
      statusEl.textContent = `已自動判斷：${result.group} · ${result.member}（可直接按「加入收藏」或自行修改）`;
    } else if (result.group) {
      statusEl.className = "smart-status warn";
      statusEl.textContent = `判斷到團體：${result.group}（成員不確定，你可以補一下）`;
    } else if (ref) {
      statusEl.className = "smart-status warn";
      statusEl.textContent = "圖片已填入，但目前無法判斷團體/成員（你可以手動輸入）";
    } else {
      statusEl.className = "smart-status";
      statusEl.textContent = "貼上圖片後會自動填入「團體 / 成員」，你只要確認就好";
    }

    // 上傳圖片 → 轉成 DataURL → 當成 imageUrl 使用（可預覽、可存）
    if (fileInput) {
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];
        if (!file) return;

        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // 填入 add-image，沿用你原本的流程
        imageInput.value = dataUrl;
        await runInfer();
      });
    }

  }

  // 貼上/輸入後推論
  imageInput.addEventListener("change", runInfer);
  imageInput.addEventListener("blur", runInfer);

  // 類別改變時，如果名稱還空白，更新名稱
  if (catSelect) {
    catSelect.addEventListener("change", () => {
      if (!nameInput.value.trim()) {
        const m = memberInput.value.trim();
        if (m) nameInput.value = `${m} ${catSelect.value}`;
      }
    });
  }
}

// ✅ 等 DOM ready 後綁定（避免抓不到元素）
document.addEventListener("DOMContentLoaded", () => {
  wireSmartAddModal();
});

// ===== 以下是原本的主程式邏輯 =====

let currentPageIndex = 0;

// Tabs 切換
const tabButtons = document.querySelectorAll(".tab-button");
const views = document.querySelectorAll(".view");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    views.forEach((v) => {
      v.classList.toggle("active", v.id === target);
    });

    if (target === "album-view") {
      renderAlbum(currentPageIndex);
      warmAlbumSnapshot();
    } else if (target === "list-view") {
      applyListFilter();
    } else if (target === "stats-view") {
      renderStats();
    }
  });
});

// Album 翻頁（加翻頁動畫）
document.getElementById("prev-page").addEventListener("click", async () => {
  await bookFlip("prev", () => {
    if (currentPageIndex > 0) currentPageIndex--;
    renderAlbum(currentPageIndex);
  });
});

document.getElementById("next-page").addEventListener("click", async () => {
  await bookFlip("next", () => {
    currentPageIndex++;
    renderAlbum(currentPageIndex);
  });
});

// Modal 控制
const cardModal = document.getElementById("card-modal");
const addModal = document.getElementById("add-modal");

document.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", () => closeAllModals());
});

function closeAllModals() {
  cardModal.classList.add("hidden");
  addModal.classList.add("hidden");
}

// 被 ui.js 呼叫：開啟新增 Modal
function openAddModal() {
  const form = document.getElementById("add-card-form");
  form.reset();
  addModal.classList.remove("hidden");
  document.getElementById("add-name").focus();
}

function openCardModal(cardId) {
  const card = findCardById(cardId);
  if (!card) return;

  cardModal.dataset.cardId = card.id;

  const pageLabel = `第 ${card.pageIndex + 1} 頁`;
  const slotLabel = `第 ${card.slotIndex + 1} 格`;

  // 左側大圖 & 標籤
  const imgDiv = document.getElementById("detail-image");
  if (card.imageUrl) {
    imgDiv.style.backgroundImage = `url(${card.imageUrl})`;
  } else {
    imgDiv.style.backgroundImage = "";
  }

  document.getElementById("detail-group-tag").textContent =
    card.group || "UNKNOWN";

  const catPill = document.getElementById("detail-category-pill");
  catPill.textContent = card.category || "未分類";

  const favPill = document.getElementById("detail-fav-pill");
  if (card.isFavorite) {
    favPill.classList.remove("is-hidden");
  } else {
    favPill.classList.add("is-hidden");
  }

  // 右側基本資訊
  document.getElementById("detail-name").textContent = card.name;
  document.getElementById("detail-subname").textContent = [
    card.group || "未設定團體",
    card.member || ""
  ]
    .filter(Boolean)
    .join(" · ");

  const noteText =
    card.note && card.note.trim().length > 0
      ? card.note
      : "這張收藏目前還沒有備註，可以之後再補上～";
  document.getElementById("detail-note").textContent = noteText;

  document.getElementById("detail-series").textContent =
    card.series || "—";
  document.getElementById("detail-date").textContent =
    card.gotDate || "—";

  document.getElementById("detail-page").textContent = pageLabel;
  document.getElementById("detail-slot").textContent = slotLabel;
  document.getElementById("detail-status").textContent = card.isFavorite
    ? "本命卡 · In Binder"
    : "一般收藏 · In Binder";

  // 本命按鈕文字
  const toggleBtn = document.getElementById("toggle-favorite-btn");
  toggleBtn.textContent = card.isFavorite ? "取消本命標記" : "設為本命卡 💖";

  cardModal.classList.remove("hidden");
}

// Modal backdrop click
[cardModal, addModal].forEach((modal) => {
  const backdrop = modal.querySelector(".modal-backdrop");
  backdrop.addEventListener("click", () => closeAllModals());
});

// 本命切換
document
  .getElementById("toggle-favorite-btn")
  .addEventListener("click", () => {
    const id = Number(cardModal.dataset.cardId);
    const card = findCardById(id);
    if (!card) return;
    card.isFavorite = !card.isFavorite;
    saveCards();

    // 更新畫面
    renderAlbum(currentPageIndex);
    applyListFilter();
    renderStats();
    openCardModal(id); // 重新更新文字
  });

// 刪除卡片
document.getElementById("delete-card-btn").addEventListener("click", () => {
  const id = Number(cardModal.dataset.cardId);
  if (!id) return;

  if (!confirm("確定要刪除這張收藏嗎？")) return;

  cards = cards.filter((c) => c.id !== id);
  saveCards();
  closeAllModals();
  const maxPage = getMaxPageIndex();
  if (currentPageIndex > maxPage) {
    currentPageIndex = maxPage;
  }
  renderAlbum(currentPageIndex);
  applyListFilter();
  renderStats();
});

// 新增表單提交
document
  .getElementById("add-card-form")
  .addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("add-name").value.trim();
    if (!name) return;

    const group = document.getElementById("add-group").value.trim();
    const member = document.getElementById("add-member").value.trim();
    const category = document.getElementById("add-category").value;
    const imageUrl = document.getElementById("add-image").value.trim();
    const gotDate = document.getElementById("add-date").value;
    const series = document.getElementById("add-series").value.trim();
    const note = document.getElementById("add-note").value.trim();

    // 如果有指定要新增到哪一格，就用 pendingSlotForNewCard
    let target;
    if (pendingSlotForNewCard) {
      target = {
        pageIndex: pendingSlotForNewCard.pageIndex,
        slotIndex: pendingSlotForNewCard.slotIndex
      };
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
      slotIndex: target.slotIndex
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
  el.addEventListener("input", () => applyListFilter());
});

function applyListFilter() {
  const filter = {
    keyword: searchInput.value || "",
    category: categoryFilter.value || "",
    favoriteOnly: favoriteFilter.value === "favorite"
  };
  renderList(filter);
}

async function captureAlbumSnapshot() {
  const album = document.querySelector(".album");
  // 只截「卡冊本體」，背景透明
  const canvas = await html2canvas(album, { backgroundColor: null, scale: 1 });
  return canvas.toDataURL("image/png");
}

let albumSnapshotCache = null;
let snapshotBusy = false;

async function warmAlbumSnapshot() {
  if (snapshotBusy) return;
  snapshotBusy = true;

  try {
    const album = document.querySelector(".album");
    // 等下一幀，確保 renderAlbum() 的 DOM 已經真的畫到螢幕上
    await new Promise((r) => requestAnimationFrame(() => r()));
    const canvas = await html2canvas(album, { backgroundColor: null, scale: 1 });
    albumSnapshotCache = canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("snapshot failed", e);
  } finally {
    snapshotBusy = false;
  }
}

async function bookFlip(direction, onMidFlip) {
  const album = document.querySelector(".album");
  const paper = document.getElementById("pageFlipPaper");
  const shadow = document.getElementById("pageFlipShadow");
  if (!album || !paper || !shadow) return;

  if (
    album.classList.contains("is-bookflip-next") ||
    album.classList.contains("is-bookflip-prev")
  )
    return;

  // 1) 先用快取快照立即開始動畫
  if (!albumSnapshotCache) {
    await warmAlbumSnapshot();
  }
  paper.style.backgroundImage = `url(${albumSnapshotCache})`;

  const isPrev = direction === "prev";
  paper.classList.toggle("is-prev", isPrev);
  shadow.classList.toggle("is-prev", isPrev);

  album.classList.add(isPrev ? "is-bookflip-prev" : "is-bookflip-next");

  // 2) 翻到一半換內容
  setTimeout(() => {
    onMidFlip?.();
  }, 360);

  // 3) 翻完清掉狀態 + 再預先截下一張
  setTimeout(() => {
    album.classList.remove("is-bookflip-next", "is-bookflip-prev");
    paper.style.backgroundImage = "";
    warmAlbumSnapshot();
  }, 760);
}

// 初始化
loadCards();
renderAlbum(currentPageIndex);
applyListFilter();
renderStats();
