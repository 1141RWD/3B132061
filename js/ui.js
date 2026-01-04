// js/ui.js

// Album 渲染
function getMaxPageIndex() {
  if (cards.length === 0) return 0;
  return cards.reduce((max, c) => Math.max(max, c.pageIndex), 0);
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
  albumGrid.innerHTML = "";

  const currentPageSpan = document.getElementById("current-page");
  currentPageSpan.textContent = currentPageIndex + 1;

  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  prevBtn.disabled = false;
  nextBtn.disabled = false;
  prevBtn.classList.remove("btn-disabled");
  nextBtn.classList.remove("btn-disabled");

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
      corner.textContent = card.group || "TWICE";
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
      nameEl.textContent = card.name;

      const likeEl = document.createElement("div");
      likeEl.className = "slot-like";
      const heartSpan = document.createElement("span");
      heartSpan.className = "slot-like-heart";
      heartSpan.textContent = "♡";
      const likeNum = document.createElement("span");
      // 假造一個愛心數，讓畫面有數字感覺
      const fakeLikes = 800 + (card.id % 2500);
      likeNum.textContent = formatLikes(fakeLikes);
      likeEl.appendChild(heartSpan);
      likeEl.appendChild(likeNum);

      titleRow.appendChild(nameEl);
      titleRow.appendChild(likeEl);

      // 副標：GROUP · MEMBER
      const subEl = document.createElement("div");
      subEl.className = "slot-sub";
      subEl.textContent = [
        card.group || "未設定團體",
        card.member || ""
      ]
        .filter(Boolean)
        .join(" · ");

      // Tag 列：兩個小 pill
      const tagsRow = document.createElement("div");
      tagsRow.className = "slot-tags-row";

      const tag1 = document.createElement("span");
      tag1.className = "slot-tag-pill";
      // 例如 Cheer Up / 專輯名，暫時用 series
      tag1.textContent = card.series || card.category || "Collection";

      const tag2 = document.createElement("span");
      tag2.className = "slot-tag-pill";
      // 用類別當第二個標籤：小卡 / 專輯 / 周邊…
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
        pendingSlotForNewCard = {
          pageIndex: currentPageIndex,
          slotIndex
        };
        openAddModal();
      });
    }

    albumGrid.appendChild(slot);
  }
}

// List 渲染
function renderList(filter) {
  const listGrid = document.getElementById("list-grid");
  listGrid.innerHTML = "";

  const { keyword, category, favoriteOnly, sortKey = "newest" } = filter;

  const keywordLower = keyword.trim().toLowerCase();

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

  // ✅ 排序工具
  const safeStr = (v) => (v || "").toString().toLowerCase();
  const toTime = (dateStr) => {
    // dateStr like "2024-05-01" or ""
    const t = Date.parse(dateStr);
    return Number.isFinite(t) ? t : -Infinity;
  };

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "oldest":
        return (a.id || 0) - (b.id || 0);

      case "fav_newest": {
        // 本命先，再最新
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
        const c = safeStr(a.category).localeCompare(safeStr(b.category), "zh-Hant");
        if (c !== 0) return c;
        return safeStr(a.name).localeCompare(safeStr(b.name), "zh-Hant");
      }

      case "gotDate_newest": {
        // 有日期的先排，日期新到舊；沒日期的放後面
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

  // ✅ 用 sorted 渲染
  sorted.forEach((card) => {
    const div = document.createElement("div");
    div.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <div class="card-title">${card.name}</div>
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

// Stats 渲染
function renderStats() {
  const total = cards.length;
  const summaryDiv = document.getElementById("stats-summary");
  summaryDiv.innerHTML =
    total === 0
      ? "目前還沒有任何收藏，可以到「收藏冊」點空插槽新增 ✨"
      : `目前共收藏 <strong>${total}</strong> 項，包含本命卡 <strong>${
          cards.filter((c) => c.isFavorite).length
        }</strong> 張。`;

  const groupCounts = {};
  const categoryCounts = {};
  cards.forEach((c) => {
    const g = c.group || "未設定團體";
    groupCounts[g] = (groupCounts[g] || 0) + 1;

    const cat = c.category || "未分類";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  renderBars("stats-by-group", groupCounts);
  renderBars("stats-by-category", categoryCounts);

  renderAchievements();
}

function renderBars(containerId, countsObj) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const entries = Object.entries(countsObj);
  if (entries.length === 0) {
    container.textContent = "暫無資料";
    return;
  }

  const maxValue = Math.max(...entries.map(([, v]) => v));

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
    fill.style.width = `${(value / maxValue) * 100}%`;

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

// 成就：超簡單規則示意
function renderAchievements() {
  const container = document.getElementById("achievement-list");
  container.innerHTML = "";

  const total = cards.length;
  const favCount = cards.filter((c) => c.isFavorite).length;

  const defs = [
    {
      id: "first-card",
      label: "第一張收藏",
      desc: "新增第一筆收藏。",
      unlocked: total >= 1
    },
    {
      id: "ten-cards",
      label: "收藏 10+",
      desc: "收藏數達到 10 張。",
      unlocked: total >= 10
    },
    {
      id: "favorite-master",
      label: "本命達人",
      desc: "本命卡數量 ≥ 3。",
      unlocked: favCount >= 3
    }
  ];

  defs.forEach((a) => {
    const div = document.createElement("div");
    div.className = "achievement" + (a.unlocked ? " unlocked" : "");
    div.innerHTML = `<span>${
      a.unlocked ? "🏅" : "🔒"
    }</span><div><div>${a.label}</div><div style="opacity:.7;">${a.desc}</div></div>`;
    container.appendChild(div);
  });
}
