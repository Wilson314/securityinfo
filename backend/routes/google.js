const express = require('express');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

module.exports = function(db) {
  const router = express.Router();

  async function getFetch() {
    const { default: fetch } = await import('node-fetch');
    return fetch;
  }

  // GET 請求（測試/匯入/查詢狀態）
  async function gasGet(url) {
    const fetch = await getFetch();
    const res = await fetch(url, { redirect: 'follow', agent });
    const text = await res.text();
    const t = text.trim();
    if (t.startsWith('<') || t.includes('<!DOCTYPE')) {
      throw new Error('GAS 回傳 HTML（可能是 SSL 代理攔截或授權問題）。請確認：\n(1) 已在 GAS 編輯器執行 testScript 並授權\n(2) 部署設定「誰可以存取」=「所有人」\n(3) 已重新部署新版本');
    }
    const obj = JSON.parse(t);
    if (obj && obj.error) throw new Error(obj.error);
    return obj;
  }

  // POST → 不跟隨重定向 → 等待 → GET export_status 取回結果
  // 避開企業 SSL 代理攔截 script.googleusercontent.com 的問題
  async function gasPost(url, body) {
    const fetch = await getFetch();
    const payload = JSON.stringify(body);

    console.log('[GAS Export] 步驟1：POST 觸發 doPost...');
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      redirect: 'manual', // 不跟隨重定向，避免 SSL 代理問題
      agent
    });
    console.log('[GAS Export] POST 已送出（doPost 正在執行）');

    // 等待 GAS 執行完成（通常 1-3 秒）
    console.log('[GAS Export] 步驟2：等待 4 秒讓 doPost 完成...');
    await new Promise(r => setTimeout(r, 4000));

    // GET 查詢 PropertiesService 中的結果
    console.log('[GAS Export] 步驟3：GET 查詢 export_status...');
    const result = await gasGet(`${url}?action=export_status`);
    console.log('[GAS Export] 結果：', result);

    if (!result.success) throw new Error(result.error || '匯出失敗');
    return result;
  }

  // POST /api/google/test
  router.post('/test', async (req, res) => {
    try {
      const { gasUrl } = req.body;
      if (!gasUrl) return res.status(400).json({ error: '請先輸入 URL' });
      const result = await gasGet(`${gasUrl}?action=test`);
      res.json({ success: true, message: '連線測試成功！' + (result.message || '') });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/google/export
  router.post('/export', async (req, res) => {
    try {
      const { gasUrl } = req.body;
      if (!gasUrl) return res.status(400).json({ error: '請先設定 URL' });
      const rows = db.prepare('SELECT * FROM ransomware_events ORDER BY event_date ASC').all();
      console.log(`[GAS Export] 共 ${rows.length} 筆資料`);
      const result = await gasPost(gasUrl, { action: 'export', data: rows });
      res.json({ success: true, message: `已成功匯出 ${rows.length} 筆資料到 Google Sheets`, sheetUrl: result.sheetUrl || null });
    } catch (e) {
      console.error('[GAS Export] 失敗：', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/google/import
  router.post('/import', async (req, res) => {
    try {
      const { gasUrl } = req.body;
      if (!gasUrl) return res.status(400).json({ error: '請先設定 URL' });
      const result = await gasGet(`${gasUrl}?action=import`);
      const rows = result.data || [];
      let added = 0, updated = 0;
      const doImport = db.transaction((items) => {
        for (const item of items) {
          if (!item.victim_name || !item.event_date) continue;
          const exists = item.id ? db.prepare('SELECT id FROM ransomware_events WHERE id = @id').get({ id: item.id }) : null;
          if (exists) {
            db.prepare(`UPDATE ransomware_events SET event_date=@event_date,victim_name=@victim_name,country=@country,is_taiwan=@is_taiwan,industry=@industry,ransomware_group=@ransomware_group,impact_level=@impact_level,summary=@summary,updated_at=datetime('now') WHERE id=@id`)
              .run({ id: item.id, event_date: item.event_date, victim_name: item.victim_name, country: item.country||'', is_taiwan: item.is_taiwan?1:0, industry: item.industry||'', ransomware_group: item.ransomware_group||'', impact_level: item.impact_level||'待確認', summary: item.summary||'' });
            updated++;
          } else {
            db.prepare(`INSERT INTO ransomware_events (event_date,report_week,report_month,victim_name,victim_domain,country,is_taiwan,industry,ransomware_group,event_type,source_name,impact_level,summary,include_in_report,need_follow_up) VALUES (@event_date,@report_week,@report_month,@victim_name,@victim_domain,@country,@is_taiwan,@industry,@ransomware_group,@event_type,@source_name,@impact_level,@summary,@include_in_report,@need_follow_up)`)
              .run({ event_date: item.event_date, report_week: item.report_week||'', report_month: item.report_month||'', victim_name: item.victim_name, victim_domain: item.victim_domain||'', country: item.country||'', is_taiwan: item.is_taiwan?1:0, industry: item.industry||'', ransomware_group: item.ransomware_group||'', event_type: item.event_type||'', source_name: item.source_name||'其他', impact_level: item.impact_level||'待確認', summary: item.summary||'', include_in_report: item.include_in_report?1:0, need_follow_up: item.need_follow_up?1:0 });
            added++;
          }
        }
      });
      doImport(rows);
      res.json({ success: true, message: `匯入完成：新增 ${added} 筆，更新 ${updated} 筆` });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
