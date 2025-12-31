// js/app.js

// ===== 封面畫面控制 =====
const coverScreen = document.getElementById("cover-screen");
const coverCard = document.getElementById("cover-card");
const enterAlbumBtn = document.getElementById("enter-album-btn");

function enterAlbum() {
  if (!coverScreen) return;
  coverScreen.classList.add("hidden"); // 隱藏封面

  // 確保進來時在「收藏冊」分頁
  const albumTabBtn = document.querySelector('[data-target="album-view"]');
  if (albumTabBtn) {
    albumTabBtn.click();
  }
}

// 點整個封面（空白也算）
if (coverScreen) {
  coverScreen.addEventListener("click", enterAlbum);
}

// 點封面卡片本身
if (coverCard) {
  coverCard.addEventListener("click", (e) => {
    e.stopPropagation();
    enterAlbum();
  });
}

// 點按鈕
if (enterAlbumBtn) {
  enterAlbumBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    enterAlbum();
  });
}
// ===== 封面畫面控制結束 =====

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
    await new Promise(r => requestAnimationFrame(() => r()));
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

  if (album.classList.contains("is-bookflip-next") || album.classList.contains("is-bookflip-prev")) return;

  // ✅ 1) 先用「快取快照」立即開始動畫（最順的關鍵）
  if (!albumSnapshotCache) {
    // 第一次沒有 cache 才現截（會慢一點點）
    await warmAlbumSnapshot();
  }
  paper.style.backgroundImage = `url(${albumSnapshotCache})`;

  const isPrev = direction === "prev";
  paper.classList.toggle("is-prev", isPrev);
  shadow.classList.toggle("is-prev", isPrev);

  album.classList.add(isPrev ? "is-bookflip-prev" : "is-bookflip-next");

  // ✅ 2) 翻到一半換內容
  setTimeout(() => {
    onMidFlip?.();
  }, 360);

  // ✅ 3) 翻完清掉狀態 + 再預先截下一張（備用）
  setTimeout(() => {
    album.classList.remove("is-bookflip-next", "is-bookflip-prev");
    paper.style.backgroundImage = "";
    // 換完頁後先把新頁快照準備好，下次按就會超順
    warmAlbumSnapshot();
  }, 760);
}

// 初始化
loadCards();
renderAlbum(currentPageIndex);
applyListFilter();
renderStats();
