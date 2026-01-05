// js/app.js
// ===============================
// 0) 等 DOM 好了再跑，避免抓不到元素
// ===============================
document.addEventListener("DOMContentLoaded", () => {
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

    // 切到「收藏冊」分頁
    const albumTabBtn = document.querySelector('[data-target="album-view"]');
    if (albumTabBtn) albumTabBtn.click();

    if (pushState && window.history && history.pushState) {
      history.pushState({ page: "album" }, "", "#album");
    }
  }

  // 點整個封面（空白也算）
  if (coverScreen) coverScreen.addEventListener("click", () => enterAlbum(true));

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

  // 監聽瀏覽器上一頁/下一頁
  window.addEventListener("popstate", (event) => {
    if (!event.state || event.state.page !== "album") {
      showCover();
    } else {
      enterAlbum(false);
    }
  });

  // ===============================
  // 1) 主程式狀態
  // ===============================
  window.currentPageIndex = window.currentPageIndex ?? 0;

  // ===============================
  // 2) Tabs 切換
  // ===============================
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
        warmAlbumSnapshot();
      } else if (target === "list-view") {
        applyListFilter();
      } else if (target === "stats-view") {
        renderStats();
      }
    });
  });

  // ===============================
  // 3) Album 翻頁（含翻頁動畫）
  // ===============================
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (prevBtn) {
    prevBtn.addEventListener("click", async () => {
      await bookFlip("prev", () => {
        if (currentPageIndex > 0) currentPageIndex--;
        renderAlbum(currentPageIndex);
      });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", async () => {
      await bookFlip("next", () => {
        currentPageIndex++;
        renderAlbum(currentPageIndex);
      });
    });
  }

  // ===============================
  // 4) Modal 控制
  // ===============================
  const cardModal = document.getElementById("card-modal");
  const addModal = document.getElementById("add-modal");

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => closeAllModals());
  });

  function closeAllModals() {
    if (cardModal) cardModal.classList.add("hidden");
    if (addModal) addModal.classList.add("hidden");
  }

  // Modal backdrop click
  [cardModal, addModal].forEach((modal) => {
    if (!modal) return;
    const backdrop = modal.querySelector(".modal-backdrop");
    if (!backdrop) return;
    backdrop.addEventListener("click", () => closeAllModals());
  });

  // 被 ui.js 呼叫：開啟新增 Modal
  window.openAddModal = function openAddModal() {
    const form = document.getElementById("add-card-form");
    if (form) form.reset();

    // 清掉預覽 & 狀態文字
    resetSmartAddUI();

    if (addModal) addModal.classList.remove("hidden");
    const nameEl = document.getElementById("add-name");
    if (nameEl) nameEl.focus();
  };

  window.openCardModal = function openCardModal(cardId) {
    const card = findCardById(cardId);
    if (!card || !cardModal) return;

    cardModal.dataset.cardId = card.id;

    const pageLabel = `第 ${card.pageIndex + 1} 頁`;
    const slotLabel = `第 ${card.slotIndex + 1} 格`;

    const imgDiv = document.getElementById("detail-image");
    if (imgDiv) {
      imgDiv.style.backgroundImage = card.imageUrl ? `url(${card.imageUrl})` : "";
    }

    const groupTag = document.getElementById("detail-group-tag");
    if (groupTag) groupTag.textContent = card.group || "UNKNOWN";

    const catPill = document.getElementById("detail-category-pill");
    if (catPill) catPill.textContent = card.category || "未分類";

    const favPill = document.getElementById("detail-fav-pill");
    if (favPill) {
      favPill.classList.toggle("is-hidden", !card.isFavorite);
    }

    const nameEl = document.getElementById("detail-name");
    if (nameEl) nameEl.textContent = card.name;

    const subEl = document.getElementById("detail-subname");
    if (subEl) {
      subEl.textContent = [card.group || "未設定團體", card.member || ""]
        .filter(Boolean)
        .join(" · ");
    }

    const noteText =
      card.note && card.note.trim().length > 0
        ? card.note
        : "這張收藏目前還沒有備註，可以之後再補上～";
    const noteEl = document.getElementById("detail-note");
    if (noteEl) noteEl.textContent = noteText;

    const seriesEl = document.getElementById("detail-series");
    if (seriesEl) seriesEl.textContent = card.series || "—";

    const dateEl = document.getElementById("detail-date");
    if (dateEl) dateEl.textContent = card.gotDate || "—";

    const pageEl = document.getElementById("detail-page");
    if (pageEl) pageEl.textContent = pageLabel;

    const slotEl = document.getElementById("detail-slot");
    if (slotEl) slotEl.textContent = slotLabel;

    const statusEl = document.getElementById("detail-status");
    if (statusEl) {
      statusEl.textContent = card.isFavorite ? "本命卡 · In Binder" : "一般收藏 · In Binder";
    }

    const toggleBtn = document.getElementById("toggle-favorite-btn");
    if (toggleBtn) toggleBtn.textContent = card.isFavorite ? "取消本命標記" : "設為本命卡 💖";

    cardModal.classList.remove("hidden");
  };

  // 本命切換
  const favBtn = document.getElementById("toggle-favorite-btn");
  if (favBtn) {
    favBtn.addEventListener("click", () => {
      const id = Number(cardModal?.dataset.cardId);
      const card = findCardById(id);
      if (!card) return;
      card.isFavorite = !card.isFavorite;
      saveCards();
      renderAlbum(currentPageIndex);
      applyListFilter();
      renderStats();
      openCardModal(id);
    });
  }

  // 刪除卡片
  const delBtn = document.getElementById("delete-card-btn");
  if (delBtn) {
    delBtn.addEventListener("click", () => {
      const id = Number(cardModal?.dataset.cardId);
      if (!id) return;
      if (!confirm("確定要刪除這張收藏嗎？")) return;

      cards = cards.filter((c) => c.id !== id);
      saveCards();
      closeAllModals();

      const maxPage = getMaxPageIndex();
      if (currentPageIndex > maxPage) currentPageIndex = maxPage;

      renderAlbum(currentPageIndex);
      applyListFilter();
      renderStats();
    });
  }

  // ===============================
  // 5) 新增表單提交
  // ===============================
  const addForm = document.getElementById("add-card-form");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("add-name")?.value.trim();
      if (!name) return;

      const group = document.getElementById("add-group")?.value.trim() || "";
      const member = document.getElementById("add-member")?.value.trim() || "";
      const category = document.getElementById("add-category")?.value || "小卡";
      const imageUrl = document.getElementById("add-image")?.value.trim() || "";
      const gotDate = document.getElementById("add-date")?.value || "";
      const series = document.getElementById("add-series")?.value.trim() || "";
      const note = document.getElementById("add-note")?.value.trim() || "";

      let target;
      if (window.pendingSlotForNewCard) {
        target = {
          pageIndex: pendingSlotForNewCard.pageIndex,
          slotIndex: pendingSlotForNewCard.slotIndex
        };
      } else {
        target = findFirstEmptySlot();
      }
      window.pendingSlotForNewCard = null;

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
      const ok = saveCards();
      if (!ok) {
        // 存不進去就撤回，避免刷新後消失造成你以為有存到
        cards = cards.filter(c => c.id !== newCard.id);
        return;
      }

      closeAllModals();
      currentPageIndex = target.pageIndex;
      renderAlbum(currentPageIndex);
      applyListFilter();
      renderStats();
    });
  }

  // ===============================
  // 6) List filter
  // ===============================
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const favoriteFilter = document.getElementById("favorite-filter");
  const sortSelect = document.getElementById("sort-select");

  [searchInput, categoryFilter, favoriteFilter, sortSelect].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => applyListFilter());
    el.addEventListener("change", () => applyListFilter());
  });

  function applyListFilter() {
    const filter = {
      keyword: searchInput?.value || "",
      category: categoryFilter?.value || "",
      favoriteOnly: favoriteFilter?.value === "favorite",
      sortKey: sortSelect?.value || "newest" // ✅ 新增
    };
    renderList(filter);
  }

  // ===============================
  // 7) 翻頁快照與動畫
  // ===============================
  let albumSnapshotCache = null;
  let snapshotBusy = false;

  async function warmAlbumSnapshot() {
    if (snapshotBusy) return;
    snapshotBusy = true;

    try {
      const album = document.querySelector(".album");
      if (!album) return;

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
    ) return;

    if (!albumSnapshotCache) await warmAlbumSnapshot();
    paper.style.backgroundImage = albumSnapshotCache ? `url(${albumSnapshotCache})` : "";

    const isPrev = direction === "prev";
    paper.classList.toggle("is-prev", isPrev);
    shadow.classList.toggle("is-prev", isPrev);

    album.classList.add(isPrev ? "is-bookflip-prev" : "is-bookflip-next");

    setTimeout(() => onMidFlip?.(), 360);

    setTimeout(() => {
      album.classList.remove("is-bookflip-next", "is-bookflip-prev");
      paper.style.backgroundImage = "";
      warmAlbumSnapshot();
    }, 760);
  }

  // ===============================
  // 8) Smart Add：圖片 → 推論團體/成員 + 預覽（唯一版本）
  // ===============================

  // 你可以一直加
  const MEMBER_DB = {
    TWICE: ["Mina", "Momo", "Nayeon", "Sana", "Tzuyu", "Jihyo", "Jeongyeon", "Dahyun", "Chaeyoung"],
    MAMAMOO: ["Solar", "Moonbyul", "Wheein", "Hwasa"],
    VIVIZ: ["Eunha", "SinB", "Umji"]
  };

  const ALIAS_MAP = (() => {
    const map = new Map();
    for (const [group, members] of Object.entries(MEMBER_DB)) {
      for (const m of members) {
        map.set(m.toLowerCase(), { group, member: m });
        if (m === "Jeongyeon") map.set("jungyeon", { group, member: m });
      }
    }
    map.set("twice", { group: "TWICE", member: "" });
    map.set("mamamoo", { group: "MAMAMOO", member: "" });
    map.set("viviz", { group: "VIVIZ", member: "" });
    return map;
  })();

  function extractTokensFromImageRef(imageRef) {
    if (!imageRef) return [];
    try {
      const clean = decodeURIComponent(imageRef.split("#")[0].split("?")[0]);
      const last = clean.split("/").pop() || clean;
      const base = last.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
      return base.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    } catch {
      return String(imageRef).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    }
  }

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
        break;
      }
      if (hit.group && !guessedGroup) guessedGroup = hit.group;
    }

    return { group: guessedGroup, member: guessedMember };
  }

  function setPreview(previewEl, src) {
    if (!previewEl) return;
    if (!src) {
      previewEl.classList.add("is-empty");
      previewEl.style.backgroundImage = "";
      previewEl.textContent = "預覽";
      return;
    }
    previewEl.classList.remove("is-empty");
    previewEl.textContent = "";
    previewEl.style.backgroundImage = `url(${src})`;
  }

  // ✅ 把上傳圖片壓縮成較小的 DataURL（避免 localStorage 爆掉）
  async function compressToDataURL(file, opts = {}) {
    const { maxSide = 900, quality = 0.86, mime = "image/jpeg" } = opts;

    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      image.src = url;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    const scale = Math.min(1, maxSide / Math.max(w, h));
    const tw = Math.round(w * scale);
    const th = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(img, 0, 0, tw, th);

    return canvas.toDataURL(mime, quality);
  }

  function wireSmartAddModal() {
    const urlInput = document.getElementById("add-image");
    const fileInput = document.getElementById("add-image-file");
    const previewEl = document.getElementById("add-image-preview");
    const statusEl = document.getElementById("smart-status");

    const nameInput = document.getElementById("add-name");
    const groupInput = document.getElementById("add-group");
    const memberInput = document.getElementById("add-member");
    const catSelect = document.getElementById("add-category");

    const toggleBtn = document.getElementById("toggle-advanced");
    const advArea = document.getElementById("advanced-area");

    if (!urlInput || !fileInput || !previewEl || !statusEl || !nameInput || !groupInput || !memberInput) {
      console.warn("[smart-add] Missing elements. Check your HTML ids.");
      return;
    }

    // 進階收合
    if (toggleBtn && advArea) {
      toggleBtn.addEventListener("click", () => {
        advArea.classList.toggle("hidden");
        toggleBtn.textContent = advArea.classList.contains("hidden") ? "進階設定" : "收合進階";
      });
    }

    function autoFillByRef(ref) {
      const { group, member } = inferLocal(ref);

      if (group && !groupInput.value.trim()) groupInput.value = group;
      if (member && !memberInput.value.trim()) memberInput.value = member;

      if (!nameInput.value.trim()) {
        const cat = catSelect?.value || "小卡";
        if (member) nameInput.value = `${member} ${cat}`;
      }

      if (group && member) {
        statusEl.className = "smart-status ok";
        statusEl.textContent = `已自動判斷：${group} · ${member}（可直接加入或自行修改）`;
      } else if (group) {
        statusEl.className = "smart-status warn";
        statusEl.textContent = `判斷到團體：${group}（成員不確定，你可以補一下）`;
      } else if (ref) {
        statusEl.className = "smart-status warn";
        statusEl.textContent = "已填入圖片，但目前無法判斷團體/成員（可手動輸入）";
      } else {
        statusEl.className = "smart-status";
        statusEl.textContent = "貼上圖片後會自動填入「團體 / 成員」，你只要確認就好";
      }
    }

    // 貼網址 → 預覽（可能被外連擋是正常）+ 推論
    urlInput.addEventListener("input", () => {
      const ref = urlInput.value.trim();
      setPreview(previewEl, ref);
      autoFillByRef(ref);
    });

    // 上傳檔案 → 壓縮成 DataURL → 預覽 + 推論 + 把 DataURL 寫回 add-image（提交時會存進 cards）
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      statusEl.className = "smart-status";
      statusEl.textContent = "圖片處理中（壓縮/轉檔）…";

      try {
        const dataUrl = await compressToDataURL(file, { maxSide: 900, quality: 0.86, mime: "image/jpeg" });
        urlInput.value = dataUrl;       // ✅ 讓 submit 直接存這個（刷新不會不見）
        setPreview(previewEl, dataUrl); // ✅ 預覽一定顯示
        autoFillByRef(file.name);       // ✅ 用檔名推論 Mina / tzuyu 這類
        statusEl.className = "smart-status ok";
        statusEl.textContent = "圖片已處理完成 ✅（已可加入收藏，刷新也不會消失）";
      } catch (e) {
        console.error(e);
        statusEl.className = "smart-status warn";
        statusEl.textContent = "圖片處理失敗（請換一張或改成 jpg/png）";
      }
    });

    // 類別改變時，如果名稱空白就更新
    if (catSelect) {
      catSelect.addEventListener("change", () => {
        if (!nameInput.value.trim() && memberInput.value.trim()) {
          nameInput.value = `${memberInput.value.trim()} ${catSelect.value}`;
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireSmartAddModal();
  });

  // ===============================
  // 9) 初始化（最底下只做一次）
  // ===============================
  loadCards();
  renderAlbum(currentPageIndex);
  applyListFilter();
  renderStats();
  wireSmartAddModal();

  // 如果一開始不是在 #album，就顯示封面
  if (location.hash !== "#album") showCover();
});
