// js/ui.js
// ===============================
// UI Render: Album / List / Stats / Achievements + Toast
// ===============================

// ===== Album 渲染 =====
function getMaxPageIndex() {
  if (!cards || cards.length === 0) return 0;
  return cards.reduce((max, c) => Math.max(max, c.pageIndex || 0), 0);
}

// 小工具：假裝有愛心數
function formatLikes(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(num);
}

function renderAlbum(currentPageIndex) {
  const albumGrid = document.getElementById("album-grid");
  if (!albumGrid) return;

  albumGrid.innerHTML = "";

  const currentPageSpan = document.getElementById("current-page");
  if (currentPageSpan) currentPageSpan.textContent = (currentPageIndex || 0) + 1;

  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  if (prevBtn) {
    prevBtn.disabled = false;
    prevBtn.classList.remove("btn-disabled");
  }
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.classList.remove("btn-disabled");
  }

  for (let slotIndex = 0; slotIndex < SLOTS_PER_PAGE; slotIndex++) {
    const slot = document.createElement("div");

    const card = cards.find(
      (c) => c.pageIndex === currentPageIndex && c.slotIndex === slotIndex
    );

    if (card) {
      slot.className = "album-slot has-card";

      const cardDiv = document.createElement("div");
      cardDiv.className = "slot-card";

      // 右上角 group 角標
      const corner = document.createElement("div");
      corner.className = "slot-corner-label";
      corner.textContent = card.group || "未設定";
      cardDiv.appendChild(corner);

      // 照片
      const photo = document.createElement("div");
      photo.className = "slot-photo";
      if (card.imageUrl) {
        photo.style.backgroundImage = `url(${card.imageUrl})`;
      }
      cardDiv.appendChild(photo);

      // 下半部 body
      const body = document.createElement("div");
      body.className = "slot-body";

      // 名稱 + 愛心數
      const titleRow = document.createElement("div");
      titleRow.className = "slot-title-row";

      const nameEl = document.createElement("div");
      nameEl.className = "slot-name";
      nameEl.textContent = card.name || "未命名";

      const likeEl = document.createElement("div");
      likeEl.className = "slot-like";

      const heartSpan = document.createElement("span");
      heartSpan.className = "slot-like-heart";
      heartSpan.textContent = "♡";

      const likeNum = document.createElement("span");
      const fakeLikes = 800 + ((card.id || 0) % 2500);
      likeNum.textContent = formatLikes(fakeLikes);

      likeEl.appendChild(heartSpan);
      likeEl.appendChild(likeNum);

      titleRow.appendChild(nameEl);
      titleRow.appendChild(likeEl);

      // 副標：GROUP · MEMBER
      const subEl = document.createElement("div");
      subEl.className = "slot-sub";
      subEl.textContent = [card.group || "未設定團體", card.member || ""]
        .filter(Boolean)
        .join(" · ");

      // Tag 列
      const tagsRow = document.createElement("div");
      tagsRow.className = "slot-tags-row";

      const tag1 = document.createElement("span");
      tag1.className = "slot-tag-pill";
      tag1.textContent = card.series || card.category || "Collection";

      const tag2 = document.createElement("span");
      tag2.className = "slot-tag-pill";
      tag2.textContent = card.category || "Card";

      tagsRow.appendChild(tag1);
      tagsRow.appendChild(tag2);

      body.appendChild(titleRow);
      body.appendChild(subEl);
      body.appendChild(tagsRow);

      cardDiv.appendChild(body);
      slot.appendChild(cardDiv);

      slot.addEventListener("click", () => openCardModal(card.id));
    } else {
      // 空插槽：點擊新增
      slot.className = "album-slot empty";
      slot.addEventListener("click", () => {
        pendingSlotForNewCard = { pageIndex: currentPageIndex, slotIndex };
        openAddModal();
      });
    }

    albumGrid.appendChild(slot);
  }
}

// ===== List 渲染（含排序） =====
function renderList(filter) {
  const listGrid = document.getElementById("list-grid");
  if (!listGrid) return;

  listGrid.innerHTML = "";

  const {
    keyword = "",
    category = "",
    favoriteOnly = false,
    sortKey = "newest"
  } = filter || {};

  const keywordLower = (keyword || "").trim().toLowerCase();

  const filtered = cards.filter((c) => {
    if (category && c.category !== category) return false;
    if (favoriteOnly && !c.isFavorite) return false;

    if (!keywordLower) return true;

    const combined =
      (c.name || "") +
      " " +
      (c.group || "") +
      " " +
      (c.member || "") +
      " " +
      (c.series || "");
    return combined.toLowerCase().includes(keywordLower);
  });

  // 排序工具
  const safeStr = (v) => (v || "").toString().toLowerCase();
  const toTime = (dateStr) => {
    const t = Date.parse(dateStr);
    return Number.isFinite(t) ? t : -Infinity;
  };

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "oldest":
        return (a.id || 0) - (b.id || 0);

      case "fav_newest": {
        const favDiff = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        if (favDiff !== 0) return favDiff;
        return (b.id || 0) - (a.id || 0);
      }

      case "group_member": {
        const g = safeStr(a.group).localeCompare(safeStr(b.group), "zh-Hant");
        if (g !== 0) return g;
        const m = safeStr(a.member).localeCompare(safeStr(b.member), "zh-Hant");
        if (m !== 0) return m;
        return safeStr(a.name).localeCompare(safeStr(b.name), "zh-Hant");
      }

      case "category": {
        const c = safeStr(a.category).localeCompare(
          safeStr(b.category),
          "zh-Hant"
        );
        if (c !== 0) return c;
        return safeStr(a.name).localeCompare(safeStr(b.name), "zh-Hant");
      }

      case "gotDate_newest": {
        const ta = toTime(a.gotDate);
        const tb = toTime(b.gotDate);
        if (ta === tb) return (b.id || 0) - (a.id || 0);
        return tb - ta;
      }

      case "newest":
      default:
        return (b.id || 0) - (a.id || 0);
    }
  });

  sorted.forEach((card) => {
    const div = document.createElement("div");
    div.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <div class="card-title">${card.name || "未命名"}</div>
      <div class="card-pill">${card.category || "未分類"}</div>
    `;

    const sub = document.createElement("div");
    sub.className = "card-sub";
    sub.textContent = [card.group, card.member].filter(Boolean).join(" · ");

    const metaLine = document.createElement("div");
    metaLine.className = "card-meta";
    metaLine.textContent = `獲得日期：${card.gotDate || "未填寫"}`;

    const tags = document.createElement("div");
    tags.className = "tag-row";

    if (card.isFavorite) {
      const t = document.createElement("span");
      t.className = "tag fav";
      t.textContent = "本命卡";
      tags.appendChild(t);
    }

    if (card.series) {
      const t = document.createElement("span");
      t.className = "tag";
      t.textContent = card.series;
      tags.appendChild(t);
    }

    div.appendChild(header);
    div.appendChild(sub);
    div.appendChild(metaLine);
    if (tags.children.length > 0) div.appendChild(tags);

    div.addEventListener("click", () => openCardModal(card.id));
    listGrid.appendChild(div);
  });
}

// ===============================
// Toast + 成就解鎖記錄（只留一份！）
// ===============================
const ACH_STORAGE_KEY = "achievements_unlocked_v1";

function getUnlockedSet() {
  try {
    const raw = localStorage.getItem(ACH_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveUnlockedSet(set) {
  localStorage.setItem(ACH_STORAGE_KEY, JSON.stringify([...set]));
}

function ensureToastContainer() {
  let el = document.getElementById("toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast-container";
    document.body.appendChild(el);
  }
  return el;
}

// 讓 Toast 排隊，不會一次疊到爆
let toastChain = Promise.resolve();

function showToast(message, opts = {}) {
  const { icon = "🎉", duration = 1800 } = opts;

  toastChain = toastChain.then(
    () =>
      new Promise((resolve) => {
        const container = ensureToastContainer();

        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `
          <div class="toast-icon">${icon}</div>
          <div class="toast-text">${message}</div>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("show"));

        setTimeout(() => {
          toast.classList.remove("show");
          toast.classList.add("hide");
          setTimeout(() => {
            toast.remove();
            resolve();
          }, 260);
        }, duration);
      })
  );
}

// 統一團體大小寫避免重複統計
function normalizeGroupName(group) {
  const g = (group || "").trim();
  if (!g) return "未設定團體";
  return g.toUpperCase();
}

// ===== Stats 渲染 =====
function renderBars(containerId, countsObj) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  const entries = Object.entries(countsObj || {});
  if (entries.length === 0) {
    container.textContent = "暫無資料";
    return;
  }

  // 由大到小顯示比較直覺
  entries.sort((a, b) => (b[1] || 0) - (a[1] || 0));

  const maxValue = Math.max(...entries.map(([, v]) => v || 0), 1);

  entries.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "stats-row";

    const labelDiv = document.createElement("div");
    labelDiv.className = "stats-label";
    labelDiv.textContent = label;

    const track = document.createElement("div");
    track.className = "stats-bar-track";

    const fill = document.createElement("div");
    fill.className = "stats-bar-fill";
    fill.style.width = `${((value || 0) / maxValue) * 100}%`;

    track.appendChild(fill);

    const valueDiv = document.createElement("div");
    valueDiv.className = "stats-value";
    valueDiv.textContent = value;

    row.appendChild(labelDiv);
    row.appendChild(track);
    row.appendChild(valueDiv);

    container.appendChild(row);
  });
}

function renderStats() {
  const summaryEl = document.getElementById("stats-summary");
  const total = cards.length;
  const favCount = cards.filter((c) => c.isFavorite).length;

  if (summaryEl) {
    summaryEl.innerHTML = `目前共收藏 <b style="color:#e11d48">${total}</b> 項，包含本命卡 <b style="color:#e11d48">${favCount}</b> 張。`;
  }

  // by group（統一大小寫）
  const byGroup = {};
  cards.forEach((c) => {
    const g = normalizeGroupName(c.group);
    byGroup[g] = (byGroup[g] || 0) + 1;
  });

  // by category
  const byCategory = {};
  cards.forEach((c) => {
    const cat = (c.category || "未分類").trim();
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  renderBars("stats-by-group", byGroup);
  renderBars("stats-by-category", byCategory);

  // 成就（含 Toast）
  renderAchievements();
}

// ===== 成就（含 Toast 提醒）=====
function renderAchievements() {
  const container = document.getElementById("achievement-list");
  if (!container) return;

  container.innerHTML = "";

  const total = cards.length;
  const favCount = cards.filter((c) => c.isFavorite).length;

  const unlockedSet = getUnlockedSet();

  const defs = [
    {
      id: "first-card",
      label: "第一張收藏",
      desc: "新增第一筆收藏。",
      unlockedNow: total >= 1
    },
    {
      id: "ten-cards",
      label: "收藏 10+",
      desc: "收藏數達到 10 張。",
      unlockedNow: total >= 10
    },
    {
      id: "fav-master",
      label: "本命達人",
      desc: "本命卡數量 ≥ 3。",
      unlockedNow: favCount >= 3
    },
    {
      id: "twice-5",
      label: "TWICE 小富翁",
      desc: "TWICE 收藏達 5 張。",
      unlockedNow: cards.filter(c => normalizeGroupName(c.group) === "TWICE").length >= 5
    },
    {
      id: "full-page-1",
      label: "滿頁收藏家",
      desc: "完成任意一頁（12 格全滿）。",
      unlockedNow: (() => {
        const maxPage = getMaxPageIndex();
        for (let p = 0; p <= maxPage; p++) {
          const count = cards.filter(c => c.pageIndex === p).length;
          if (count >= SLOTS_PER_PAGE) return true;
        }
        return false;
      })()
    },

  ];

  const newlyUnlocked = defs.filter((a) => a.unlockedNow && !unlockedSet.has(a.id));

  if (newlyUnlocked.length > 0) {
    newlyUnlocked.forEach((a) => unlockedSet.add(a.id));
    saveUnlockedSet(unlockedSet);

    newlyUnlocked.forEach((a) => {
      showToast(`解鎖成就：${a.label}`, { icon: "🏅", duration: 1800 });
    });
  }

  defs.forEach((a) => {
    const isUnlocked = unlockedSet.has(a.id) || a.unlockedNow;
    const isJustUnlocked = newlyUnlocked.some((x) => x.id === a.id);

    const div = document.createElement("div");
    div.className =
      "achievement" +
      (isUnlocked ? " unlocked" : "") +
      (isJustUnlocked ? " just-unlocked" : "");

    div.innerHTML = `
      <span>${isUnlocked ? "🏅" : "🔒"}</span>
      <div>
        <div>${a.label}</div>
        <div style="opacity:.7;">${a.desc}</div>
      </div>
    `;

    container.appendChild(div);
  });
}
