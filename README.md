# 資安週報勒索事件蒐集與分析平台

協助資安人員每週蒐集、整理勒索軟體、資料外洩、國家級攻擊等事件，並產生視覺化統計圖表與中文週報摘要。

## 技術架構

| 層級 | 技術 |
|------|------|
| Frontend | React 18 + Vite + Tailwind CSS + Recharts + lucide-react |
| Backend | Node.js + Express + better-sqlite3 |
| 資料庫 | SQLite（本地檔案，`backend/data/security_report.db`） |
| 匯出 | xlsx（Excel）、CSV、TXT |

---

## 安裝與啟動

### 前置需求

- Node.js 18 以上
- npm 9 以上

### 步驟一：安裝後端

```bash
cd backend
npm install
```

### 步驟二：安裝前端

```bash
cd frontend
npm install
```

### 步驟三：啟動後端（Port 3001）

```bash
cd backend
npm run dev
```

看到 `✅ 後端伺服器啟動於 http://localhost:3001` 表示成功。

### 步驟四：啟動前端（Port 5173）

開啟另一個終端機：

```bash
cd frontend
npm run dev
```

看到 `Local: http://localhost:5173/` 表示成功。

### 步驟五：開啟瀏覽器

前往 [http://localhost:5173](http://localhost:5173) 即可使用。

---

## 功能說明

### Dashboard 首頁
- 7 個本月統計卡片（總數、台灣受害者、高風險、需追蹤、勒索組織數、最常受害產業、最活躍組織）
- 6 種圖表：產業長條圖、事件類型圓餅圖、週趨勢折線圖、勒索組織 Top 10、消息來源統計、國家統計表
- 台灣受害者、高風險、需追蹤事件快速清單

### 事件列表
- 多條件篩選（關鍵字、月份、日期區間、產業、類型、來源、台灣、週報、追蹤）
- 分頁顯示（每頁 20 筆）
- 編輯、刪除每筆事件

### 新增／編輯事件
- 完整欄位表單，分組顯示
- 選擇事件日期自動計算週別（ISO week）與月份
- 受害者網域含 `.tw` 自動勾選台灣
- 儲存前自動偵測 7 天內相似重複事件並警告

### 分析報表
- 依月份或日期區間產生統計圖表
- 自動生成中文摘要文字
- 產生週報條列摘要（依 `include_in_report = 是` 的事件）
- 匯出 CSV、Excel（中文欄名）、週報 TXT

### 設定頁
- 設定 Google Apps Script Web App URL
- 連線測試
- 匯出全部資料到 Google Sheets
- 從 Google Sheets 匯入資料（upsert）

---

## Google Sheets 串接

1. 開啟 Google Sheets，點選「擴充功能」→「Apps Script」
2. 將 `docs/google-apps-script.js` 內容貼入
3. 「部署」→「新增部署」→ 類型：網頁應用程式
4. 執行者：我、存取權限：所有人
5. 複製 Web App URL，貼入平台「設定頁」

---

## 目錄結構

```
security-report-platform/
├── backend/
│   ├── server.js          # Express 主程式（Port 3001）
│   ├── database.js        # SQLite 初始化 + Seed Data（12 筆）
│   ├── routes/
│   │   ├── events.js      # CRUD API
│   │   ├── stats.js       # 統計 API
│   │   ├── export.js      # CSV / Excel / TXT 匯出
│   │   └── google.js      # Google Sheets 匯入匯出
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EventList.jsx
│   │   │   ├── EventForm.jsx
│   │   │   ├── Analytics.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── lib/
│   │   │   ├── api.js     # Axios 封裝
│   │   │   └── utils.js   # 工具函數
│   │   └── constants/
│   │       └── options.js # 下拉選單選項
│   └── package.json
├── docs/
│   └── google-apps-script.js
└── README.md
```

---

## Seed Data

首次啟動後端時自動插入 12 筆測試事件，涵蓋：
- 台灣半導體公司（Qilin）
- 台灣國立大學（INC Ransom）
- 美國醫療集團（LockBit）
- 台灣製造廠（DragonForce）
- 英國市政府（Unknown）
- 日本金融公司（BlackCat）
- 台灣科技軟體（Cl0p）
- 美國能源公司（Play）
- 澳洲零售集團（BianLian）
- 台灣區域醫院（Medusa）
- 德國製造商（RansomHub）
- 台灣縣市政府（Unknown）

---

## 完成標準驗證

- [x] `npm install` 安裝
- [x] `npm run dev`（後端）啟動
- [x] `npm run dev`（前端）啟動
- [x] Dashboard 顯示統計
- [x] 新增勒索事件
- [x] 事件列表查詢篩選
- [x] 圖表統計更新
- [x] 週報摘要產生
- [x] CSV / Excel / TXT 匯出
- [x] Google Apps Script URL 設定與匯出入
