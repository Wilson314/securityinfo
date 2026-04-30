const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./database');

async function start() {
  const db = await initDatabase();
  console.log('✅ 資料庫初始化完成');

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.use('/api/events',  require('./routes/events')(db));
  app.use('/api/stats',   require('./routes/stats')(db));
  app.use('/api/export',  require('./routes/export')(db));
  app.use('/api/google',  require('./routes/google')(db));

  app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`✅ 後端伺服器啟動於 http://localhost:${PORT}`));
}

start().catch(e => { console.error('❌ 啟動失敗:', e); process.exit(1); });
