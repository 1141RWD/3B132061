// js/data.js

const STORAGE_KEY = "idol_collection_cards_v1";
// 每頁 6 格
const SLOTS_PER_PAGE = 8;

// 初始假資料
const defaultCards = [
  {
    id: 1,
    name: "Solar 生日小卡",
    group: "MAMAMOO",
    member: "Solar",
    category: "小卡",
    series: "某專輯 ver.A",
    gotDate: "2024-05-01",
    note: "第一次抽到本命！",
    imageUrl: "",          // 之後可以放照片
    isFavorite: true,
    pageIndex: 0,
    slotIndex: 0
  },
  {
    id: 2,
    name: "Eunha 迷你專輯",
    group: "VIVIZ",
    member: "Eunha",
    category: "專輯",
    series: "Mini Album",
    gotDate: "2024-06-10",
    note: "朋友送的生日禮物",
    imageUrl: "",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 1
  },
  {
    id: 3,
    name: "演唱會應援棒",
    group: "TWICE",
    member: "",
    category: "周邊",
    series: "LIGHT STICK",
    gotDate: "2024-03-20",
    note: "演唱會前夕購入",
    imageUrl: "",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 2
  },
  {
    id: 4,
    name: "團徽徽章",
    group: "MAMAMOO",
    member: "",
    category: "徽章",
    series: "Official Badge",
    gotDate: "2024-04-15",
    note: "",
    imageUrl: "",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 3
  }
];

let cards = [];
// 這個變數用來記錄：使用者點了哪一格空插槽要新增
let pendingSlotForNewCard = null;

// 讀取 localStorage
function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cards = [...defaultCards];
      saveCards();
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cards = parsed;
    } else {
      cards = [...defaultCards];
      saveCards();
    }
  } catch (e) {
    console.error("loadCards error:", e);
    cards = [...defaultCards];
  }
}

// 儲存至 localStorage
function saveCards() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error("saveCards error:", e);
  }
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
