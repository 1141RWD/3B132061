// js/data.js
// 追星收藏冊互動系統 - data layer

// ====== 全域資料 ======
let cards = [];

// 8 格一頁（你目前冊頁格數）
const SLOTS_PER_PAGE = 8;

// ✅ 初始假資料：小卡 / 專輯 / 周邊(DVD算周邊) / 徽章 各 1
const INITIAL_CARDS = [
  {
    id: 101,
    name: "Mina 小卡",
    group: "TWICE",
    member: "Mina",
    category: "小卡",
    series: "Fancy You",
    gotDate: "2024-05-01",
    note: "初始假資料",
    imageUrl: "img/mina.jpg",
    isFavorite: true,
    pageIndex: 0,
    slotIndex: 0
  },
  {
    id: 102,
    name: "TWICE 專輯",
    group: "TWICE",
    member: "",
    category: "專輯",
    series: "Feel Special",
    gotDate: "2024-03-20",
    note: "初始假資料",
    imageUrl: "img/twice-Feel_Special-album.jpg",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 1
  },
  {
    id: 103,
    name: "TWICE DVD 周邊",
    group: "TWICE",
    member: "",
    category: "周邊",
    series: "LIGHTS",
    gotDate: "2024-04-10",
    note: "DVD 也算周邊",
    imageUrl: "img/twice-lights-dvd.jpg",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 2
  },
  {
    id: 104,
    name: "Nayeon 徽章",
    group: "TWICE",
    member: "Nayeon",
    category: "徽章",
    series: "",
    gotDate: "2024-04-15",
    note: "初始假資料",
    imageUrl: "img/nayeon-badge.jpg",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 3
  }
];

// ✅ 你目前要的版本：不做持久化（刷新就回到初始資料）
function loadCards() {
  // 深拷貝避免被修改到 INITIAL_CARDS
  cards = INITIAL_CARDS.map((c) => ({ ...c }));
}

function saveCards() {
  // 這版不存（你說不需要存圖片，也不想刷新後徽章亂亮）
}

// ====== 常用工具 ======
function findCardById(id) {
  return cards.find((c) => c.id === id);
}

function findFirstEmptySlot() {
  const maxPage = getMaxPageIndex();
  for (let p = 0; p <= Math.max(0, maxPage + 1); p++) {
    for (let s = 0; s < SLOTS_PER_PAGE; s++) {
      const exists = cards.some((c) => c.pageIndex === p && c.slotIndex === s);
      if (!exists) return { pageIndex: p, slotIndex: s };
    }
  }
  return { pageIndex: 0, slotIndex: 0 };
}
