/**
 * 本機 ↔ 雲端資料同步腳本
 * 
 * 使用方式：
 *   node sync-local.js pull          ← 從 Render 下載資料到本機 JSON
 *   node sync-local.js push          ← 把本機 JSON 上傳覆蓋雲端
 *   node sync-local.js pull --apply  ← 下載並直接匯入本機資料庫
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const RENDER_URL = 'https://securityinfo-backend.onrender.com';
const BACKUP_FILE = path.join(__dirname, 'data', 'sync-backup.json');

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function pull() {
  console.log('⬇  從 Render 下載資料...');
  console.log('   (若後端處於休眠狀態，可能需要等待 30-60 秒)');
  
  const res = await request(RENDER_URL + '/api/sync/export');
  if (res.status !== 200) {
    console.error('❌ 下載失敗:', res.body);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(BACKUP_FILE), { recursive: true });
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(res.body, null, 2), 'utf-8');
  
  console.log(`✅ 已下載 ${res.body.count} 筆資料`);
  console.log(`   儲存到: ${BACKUP_FILE}`);
  
  if (process.argv.includes('--apply')) {
    await applyLocal(res.body.data);
  }
}

async function push() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ 找不到本機備份檔:', BACKUP_FILE);
    console.error('   請先執行 node sync-local.js pull 下載資料');
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
  const data = Array.isArray(json) ? json : json.data;
  
  console.log(`⬆  上傳 ${data.length} 筆資料到 Render...`);
  
  const body = JSON.stringify({ data, mode: 'replace' });
  const res = await request(RENDER_URL + '/api/sync/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);

  if (res.status !== 200) {
    console.error('❌ 上傳失敗:', res.body);
    process.exit(1);
  }

  console.log(`✅ 已上傳 ${res.body.imported} 筆資料到雲端`);
}

async function applyLocal(data) {
  // 如果本機有 better-sqlite3，直接寫入 DB
  const dbPath = path.join(__dirname, 'data', 'security_report.db');
  console.log('\n🔄 套用到本機資料庫...');
  
  // 建立 JSON 備份就足夠；本機啟動時會自動讀取 .db
  // 也可以把資料另存一份 JSON 供手動匯入
  const localFile = path.join(__dirname, 'data', `local-import-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(localFile, JSON.stringify({ exportedAt: new Date().toISOString(), count: data.length, data }, null, 2));
  console.log(`✅ 已另存本機匯入檔: ${localFile}`);
  console.log('   啟動本機後端時，請透過 Admin UI 的「匯入 JSON」功能套用此檔案');
}

// Main
const cmd = process.argv[2];
if (cmd === 'pull') {
  pull().catch(e => { console.error('❌ 錯誤:', e.message); process.exit(1); });
} else if (cmd === 'push') {
  push().catch(e => { console.error('❌ 錯誤:', e.message); process.exit(1); });
} else {
  console.log('使用方式:');
  console.log('  node sync-local.js pull         從 Render 下載資料');
  console.log('  node sync-local.js push         上傳本機資料到 Render');
  console.log('  node sync-local.js pull --apply 下載並套用到本機');
}
