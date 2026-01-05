// js/data.js

const STORAGE_KEY = "idol_collection_cards_github_demo";
// 每頁 8 格
const SLOTS_PER_PAGE = 8;

// 初始假資料（第一頁 4 張 TWICE）
const INITIAL_CARDS = [
    {
      id: 1,
      name: "Mina 小卡",
      group: "TWICE",
      member: "Mina",
      category: "小卡",
      imageUrl: "img/mina.jpg",
      isFavorite: true,
      pageIndex: 0,
      slotIndex: 0
    },
    {
      id: 2,
      name: "Feel Special 專輯",
      group: "TWICE",
      member: "",
      category: "專輯",
      imageUrl: "img/twice-Feel_Special-album.jpg",
      isFavorite: false,
      pageIndex: 0,
      slotIndex: 1
    },
    {
      id: 3,
      name: "TWICE 演唱會 DVD",
      group: "TWICE",
      member: "",
      category: "周邊",
      imageUrl: "img/twice-lights-dvd.jpg",
      isFavorite: false,
      pageIndex: 0,
      slotIndex: 2
    },
    {
      id: 4,
      name: "Nayeon 徽章",
      group: "TWICE",
      member: "Nayeon",
      category: "徽章",
      imageUrl: "img/nayeon-badge.jpg",
      isFavorite: false,
      pageIndex: 0,
      slotIndex: 3
    }
];

let cards = [];
// 用來記錄：使用者點了哪一格空插槽要新增
let pendingSlotForNewCard = null;

// 🔹 GitHub 版本：不要讀 localStorage，永遠用程式裡的 defaultCards
function loadCards() {
  const raw = localStorage.getItem("cards");

  if (raw) {
    cards = JSON.parse(raw);
  } else {
    // 🔥 第一次進來：放初始示範資料
    cards = [...INITIAL_CARDS];
    saveCards();
  }
}

// 🔹 GitHub 版本：先不存資料，重整就回到預設
function saveCards() {
  // 留空即可
}

// 找出可放新卡的 pageIndex & slotIndex
function findFirstEmptySlot() {
  const occupied = new Map(); // key: `${pageIndex}-${slotIndex}`

  cards.forEach((c) => {
    occupied.set(`${c.pageIndex}-${c.slotIndex}`, true);
  });

  let maxPage = 0;
  cards.forEach((c) => {
    if (c.pageIndex > maxPage) maxPage = c.pageIndex;
  });

  for (let page = 0; page <= maxPage; page++) {
    for (let slot = 0; slot < SLOTS_PER_PAGE; slot++) {
      const key = `${page}-${slot}`;
      if (!occupied.has(key)) {
        return { pageIndex: page, slotIndex: slot };
      }
    }
  }

  // 如果全部都滿了，開新頁
  return { pageIndex: maxPage + 1, slotIndex: 0 };
}

// 依 id 找卡片
function findCardById(id) {
  return cards.find((c) => c.id === id) || null;
}
