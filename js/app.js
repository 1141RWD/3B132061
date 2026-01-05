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
  // 8) Smart Add：圖片 → 推論團體/成員 + 預覽（唯一版本）
  // ===============================

  // 你可持續擴充：檔名出現這些字就能判斷
  const MEMBER_DB = {
    TWICE: ["Mina", "Momo", "Nayeon", "Sana", "Tzuyu", "Jihyo", "Jeongyeon", "Dahyun", "Chaeyoung"],
    MAMAMOO: ["Solar", "Moonbyul", "Wheein", "Hwasa"],
    VIVIZ: ["Eunha", "SinB", "Umji"],
  };

  function buildAliasMap() {
    const map = new Map();
    for (const [group, members] of Object.entries(MEMBER_DB)) {
      map.set(group.toLowerCase(), { group, member: "" });
      for (const m of members) {
        map.set(m.toLowerCase(), { group, member: m });
      }
    }
    // 常見變體/暱稱（你可以一直加）
    map.set("sinb", { group: "VIVIZ", member: "SinB" });
    map.set("jungyeon", { group: "TWICE", member: "Jeongyeon" });
    map.set("jeongyeon", { group: "TWICE", member: "Jeongyeon" });
    return map;
  }
  const ALIAS_MAP = buildAliasMap();

  function extractTokens(ref) {
    if (!ref) return [];
    const clean = decodeURIComponent(ref.split("#")[0].split("?")[0]);
    const last = clean.split("/").pop() || clean;
    const base = last.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");
    return base.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  }

  function inferGroupMemberFromRef(ref) {
    const tokens = extractTokens(ref);
    let group = "";
    let member = "";
    for (const t of tokens) {
      const hit = ALIAS_MAP.get(t);
      if (!hit) continue;
      if (hit.group && !group) group = hit.group;
      if (hit.member && !member) {
        member = hit.member;
        group = hit.group;
        break;
      }
    }
    return { group, member };
  }

  // ✅ 類別推論：badge -> 徽章；album/cd -> 專輯；dvd -> 周邊；其餘預設小卡
  function inferCategoryFromTokens(tokens) {
    const has = (k) => tokens.includes(k);

    if (has("badge") || has("pin") || has("brooch")) return "徽章";
    if (has("album") || has("cd")) return "專輯";
    if (has("dvd") || has("bluray") || has("blu") || has("concert")) return "周邊";

    return "小卡";
  }

  // ✅ 名稱推論：
  // - 徽章：{member} 徽章
  // - 小卡：{member} 小卡
  // - 專輯：{group} + (可讀系列) + 專輯
  // - 周邊：{group/member} + (可讀系列) + 周邊
  function inferSeriesText(tokens) {
    // 你可以依你的檔名習慣調整
    // 例如 twice-feel_special-album -> feel special
    const skip = new Set(["twice", "mamamoo", "viviz", "album", "cd", "dvd", "badge", "pin", "jpg", "jpeg", "png", "webp", "gif"]);
    const kept = tokens.filter(t => !skip.has(t));

    // 做一個比較漂亮的顯示：feel_special -> Feel Special
    const pretty = kept.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return pretty.trim();
  }

  function buildAutoName({ category, group, member, tokens }) {
    const series = inferSeriesText(tokens);

    if (category === "徽章") {
      return member ? `${member} 徽章` : (group ? `${group} 徽章` : "徽章");
    }
    if (category === "小卡") {
      return member ? `${member} 小卡` : (group ? `${group} 小卡` : "小卡");
    }
    if (category === "專輯") {
      if (group && series) return `${group} ${series} 專輯`;
      if (group) return `${group} 專輯`;
      return series ? `${series} 專輯` : "專輯";
    }
    // 周邊
    if (group && series) return `${group} ${series} 周邊`;
    if (member && series) return `${member} ${series} 周邊`;
    if (group) return `${group} 周邊`;
    if (member) return `${member} 周邊`;
    return series ? `${series} 周邊` : "周邊";
  }

  // ✅ 預覽：用 <img> 最穩（比 background-image 更不容易被 CSS 蓋掉）
  function setPreview(previewBox, src) {
    if (!previewBox) return;

    let img = previewBox.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      img.alt = "preview";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.borderRadius = "14px";
      previewBox.innerHTML = ""; // 清掉「預覽」文字
      previewBox.appendChild(img);
    }

    if (!src) {
      previewBox.innerHTML = "預覽";
      previewBox.classList.add("is-empty");
      return;
    }

    previewBox.classList.remove("is-empty");
    img.src = src;

    // 如果外連被擋（很常見），至少顯示提示
    img.onerror = () => {
      previewBox.innerHTML = "（此圖片來源可能擋外連，預覽失敗）";
      previewBox.classList.add("is-empty");
    };
  }

  function wireSmartAddModal() {
    const urlInput = document.getElementById("add-image");
    const fileInput = document.getElementById("add-image-file");
    const previewBox = document.getElementById("add-image-preview");

    const nameInput = document.getElementById("add-name");
    const groupInput = document.getElementById("add-group");
    const memberInput = document.getElementById("add-member");
    const catSelect = document.getElementById("add-category");

    const statusEl = document.getElementById("smart-status"); // 有就更新文案，沒有也不會壞

    if (!urlInput || !fileInput || !previewBox || !nameInput || !groupInput || !memberInput || !catSelect) {
      console.warn("[smart-add] 缺少必要元素，請檢查 HTML 的 id 是否正確且沒有重複。");
      return;
    }

    async function applyInfer(ref, preferUserText = false) {
      const tokens = extractTokens(ref);

      // 1) 團體/成員
      const { group, member } = inferGroupMemberFromRef(ref);

      // 2) 類別（可被使用者手動選擇覆蓋）
      const inferredCategory = inferCategoryFromTokens(tokens);

      // 如果使用者還沒選過，就自動幫他切類別
      if (!preferUserText) {
        catSelect.value = inferredCategory;
      }

      // 3) 自動填入（只在空白時填，不覆蓋使用者手動輸入）
      if (group && !groupInput.value.trim()) groupInput.value = group;
      if (member && !memberInput.value.trim()) memberInput.value = member;

      // 4) 名稱：根據（類別 + 成員/團體 + 檔名）產生
      if (!nameInput.value.trim()) {
        const finalCategory = catSelect.value || inferredCategory;
        nameInput.value = buildAutoName({ category: finalCategory, group, member, tokens });
      }

      // 5) 狀態提示（可選）
      if (statusEl) {
        if (group && member) statusEl.textContent = `已自動判斷：${group} · ${member}（名稱/類別也已建議）`;
        else if (group) statusEl.textContent = `判斷到團體：${group}（成員不確定，可自行補）`;
        else statusEl.textContent = "已填入圖片（目前無法判斷團體/成員，可手動輸入）";
      }
    }

    // ✅ 貼網址：預覽 + 推論
    urlInput.addEventListener("input", () => {
      const url = urlInput.value.trim();
      setPreview(previewBox, url);
      if (url) applyInfer(url, true);
    });

    // ✅ 上傳：本機預覽 + 轉 DataURL 存回 add-image（讓你「加入收藏」能存起來）
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      // 用檔名先推論（立刻填團體/成員/類別/名稱）
      applyInfer(file.name, false);

      // 再用 DataURL 做預覽 + 存進 add-image（這樣加入收藏會保存）
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        urlInput.value = dataUrl;
        setPreview(previewBox, dataUrl);
      };
      reader.readAsDataURL(file);
    });

    // ✅ 使用者自己改類別時：如果名稱還是空的，才重新建議一次
    catSelect.addEventListener("change", () => {
      if (!nameInput.value.trim()) {
        const ref = urlInput.value.trim();
        if (ref) applyInfer(ref, true);
      }
    });
  }

  // DOM ready 後再綁定
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
