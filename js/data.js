// js/data.js

const STORAGE_KEY = "idol_collection_cards_v2";
// 每頁 6 格
const SLOTS_PER_PAGE = 8;

// 初始假資料
const defaultCards = [
  {
    id: 1,
    name: "Mina 小卡",
    group: "TWICE",
    member: "Mina",
    category: "小卡",
    series: "測試",
    gotDate: "2024-05-01",
    note: "測試圖片",
    imageUrl: "mina.jpg",   // ✅ 這邊填 GitHub 上的檔名
    isFavorite: true,
    pageIndex: 0,
    slotIndex: 0
  },
  {
    id: 2,
    name: "Momo 小卡",
    group: "TWICE",
    member: "Momo",
    category: "小卡",
    series: "測試",
    gotDate: "2024-06-10",
    note: "測試圖片",
    imageUrl: "momo.jpg",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 1
  },
  {
    id: 3,
    name: "Nayeon 小卡",
    group: "TWICE",
    member: "Nayeon",
    category: "小卡",
    series: "測試",
    gotDate: "2024-03-20",
    note: "測試圖片",
    imageUrl: "nayeon.jpg",
    isFavorite: false,
    pageIndex: 0,
    slotIndex: 2
  },
  {
    id: 4,
    name: "Sana 小卡",
    group: "TWICE",
    member: "Sana",
    category: "小卡",
    series: "測試",
    gotDate: "2024-04-15",
    note: "測試圖片",
    imageUrl: "sana.jpg",
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
  // GitHub 版：不要用之前存的資料，永遠用程式裡的 defaultCards
  cards = [...defaultCards];
}

// 儲存至 localStorage
function saveCards() {

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
