const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

async function start() {
  const db = await initDatabase();
  console.log('✅ 資料庫初始化完成');

  const app = express();

  // 允許 Netlify / Vercel 前端跨域請求
  app.use(cors({
    origin: [
      /\.netlify\.app$/,
      /\.netlify\.com$/,
      /\.vercel\.app$/,
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));

  // 提供 Admin UI 靜態頁面
  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/events',  require('./routes/events')(db));
  app.use('/api/stats',   require('./routes/stats')(db));
  app.use('/api/export',  require('./routes/export')(db));
  app.use('/api/google',  require('./routes/google')(db));
  app.use('/api/sync',    require('./routes/sync')(db));

  app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

  // 根路由導向 Admin UI
  app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`✅ 後端伺服器啟動於 http://localhost:${PORT}`));
}

start().catch(e => { console.error('❌ 啟動失敗:', e); process.exit(1); });
