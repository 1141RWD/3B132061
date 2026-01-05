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

  function resetSmartAddUI() {
    const previewBox = document.getElementById("add-image-preview");
    if (previewBox) {
      previewBox.innerHTML = "預覽";
      previewBox.classList.add("is-empty");
      previewBox.style.backgroundImage = "";
    }

    const statusEl = document.getElementById("smart-status");
    if (statusEl) {
      statusEl.textContent = "貼上圖片後會自動填入「團體 / 成員」，你只要確認就好";
      statusEl.className = "smart-status";
    }
  }

  // 被 ui.js 呼叫：開啟新增 Modal
  function openAddModal() {
    const form = document.getElementById("add-card-form");
    if (!form) return;

    form.reset();
    resetSmartAddUI(); // ✅ 很關鍵：避免預覽/狀態殘留或呼叫不存在導致整個 JS 中斷

    addModal.classList.remove("hidden");
    document.getElementById("add-name").focus();
  }

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
      saveCards();

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
  // Smart Add：圖片 / 檔名 → 推論團體/成員 + 預覽 + 名稱自動帶入
  // ===============================

  // 成員→團體對照（可擴充）
  const MEMBER_TO_GROUP = {
    // TWICE
    mina: "TWICE", momo: "TWICE", nayeon: "TWICE", sana: "TWICE", tzuyu: "TWICE",
    jihyo: "TWICE", dahyun: "TWICE", chaeyoung: "TWICE", jeongyeon: "TWICE",

    // MAMAMOO
    solar: "MAMAMOO", moonbyul: "MAMAMOO", wheein: "MAMAMOO", hwasa: "MAMAMOO",

    // VIVIZ
    eunha: "VIVIZ", sinb: "VIVIZ", umji: "VIVIZ"
  };

  // 類別關鍵字（檔名含這些就幫你自動改類別 + 名稱結尾）
  const CATEGORY_HINTS = [
    { key: "badge", category: "徽章", suffix: "徽章" },
    { key: "dvd", category: "周邊", suffix: "DVD" },
    { key: "album", category: "專輯", suffix: "專輯" },
    // 其他都算周邊（你說的規則）
  ];

  function normalizeHint(text) {
    return (text || "")
      .toLowerCase()
      .split("?")[0]
      .split("#")[0];
  }

  function inferFromText(text) {
    const hint = normalizeHint(text);

    // 1) 先找成員
    for (const memberKey of Object.keys(MEMBER_TO_GROUP)) {
      if (hint.includes(memberKey)) {
        return { memberKey, group: MEMBER_TO_GROUP[memberKey] };
      }
    }
    return { memberKey: "", group: "" };
  }

  function titleCaseMember(memberKey) {
    if (!memberKey) return "";
    // sinb -> SinB 這種特例你也可加
    if (memberKey === "sinb") return "SinB";
    if (memberKey === "moonbyul") return "Moonbyul";
    return memberKey.charAt(0).toUpperCase() + memberKey.slice(1);
  }

  function inferCategoryFromText(text) {
    const hint = normalizeHint(text);
    for (const h of CATEGORY_HINTS) {
      if (hint.includes(h.key)) return { category: h.category, suffix: h.suffix };
    }
    return null;
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

  function wireSmartAddModal() {
    const urlInput = document.getElementById("add-image");
    const fileInput = document.getElementById("add-image-file");
    const nameInput = document.getElementById("add-name");
    const groupInput = document.getElementById("add-group");
    const memberInput = document.getElementById("add-member");
    const catSelect = document.getElementById("add-category");
    const statusEl = document.getElementById("smart-status");

    // 任一不存在就直接退出（避免整個新增壞掉）
    if (!urlInput || !fileInput || !nameInput || !groupInput || !memberInput || !catSelect || !statusEl) {
      console.warn("[smart-add] Missing elements. Check your HTML IDs (do not duplicate ids).");
      return;
    }

    const applyInference = (refText) => {
      const { memberKey, group } = inferFromText(refText);
      const member = titleCaseMember(memberKey);

      // 類別推論：badge/dvd/album
      const catHint = inferCategoryFromText(refText);
      if (catHint) {
        catSelect.value = catHint.category;
      } else {
        // 你規則：除了特別訂好的其他都算周邊（但小卡/專輯/徽章有關鍵字才切）
        // 這裡不強制改類別，維持使用者現在選的
      }

      // 自動填入（只有空白才寫，避免覆蓋你手動改的）
      if (group && !groupInput.value.trim()) groupInput.value = group;
      if (member && !memberInput.value.trim()) memberInput.value = member;

      // 名稱：根據「檔名/關鍵字」自動決定結尾
      if (!nameInput.value.trim()) {
        const cat = catSelect.value; // 小卡/專輯/周邊/徽章
        const suffix = catHint?.suffix || cat; // badge->徽章、dvd->DVD、其他就用類別
        if (member) nameInput.value = `${member} ${suffix}`;
        else nameInput.value = `未命名 ${suffix}`;
      }

      // 狀態提示
      if (member && group) {
        statusEl.textContent = `已自動判斷：${group} · ${member}（可直接加入或自行修改）`;
        statusEl.className = "smart-status ok";
      } else if (group) {
        statusEl.textContent = `判斷到團體：${group}（成員不確定，你可以補一下）`;
        statusEl.className = "smart-status warn";
      } else if (refText) {
        statusEl.textContent = "圖片已填入，但目前無法判斷團體/成員（你可以手動輸入）";
        statusEl.className = "smart-status warn";
      } else {
        statusEl.textContent = "貼上圖片後會自動填入「團體 / 成員」，你只要確認就好";
        statusEl.className = "smart-status";
      }
    };

    // 1) 貼網址 → 直接預覽（注意：有些外站會擋外連，預覽出不來是正常）
    urlInput.addEventListener("input", () => {
      const url = urlInput.value.trim();
      setPreviewImage(url);
      applyInference(url);
    });

    // 2) 上傳檔案 → 讀 DataURL 預覽 + 用檔名推論
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      // 先用檔名推論（最穩）
      applyInference(file.name);

      // 再讀 DataURL 做預覽
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setPreviewImage(dataUrl);

        // 讓「送出新增」imageUrl 也有值（即使你不存圖，也至少當下能顯示）
        urlInput.value = dataUrl;
      };
      reader.readAsDataURL(file);
    });

    // 類別改變，如果名稱還是空白，就跟著更新一次名稱結尾
    catSelect.addEventListener("change", () => {
      if (!nameInput.value.trim()) {
        const m = memberInput.value.trim();
        const cat = catSelect.value;
        nameInput.value = m ? `${m} ${cat}` : `未命名 ${cat}`;
      }
    });
  }

  // DOM Ready 後再綁定，避免抓不到元素
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
})