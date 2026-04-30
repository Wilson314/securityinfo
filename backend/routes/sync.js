const express = require('express');

module.exports = function(db) {
  const router = express.Router();

  // GET /api/sync/export — 匯出全部資料為 JSON
  router.get('/export', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM ransomware_events ORDER BY event_date DESC').all();
      const payload = { exportedAt: new Date().toISOString(), count: rows.length, data: rows };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="security-data-${new Date().toISOString().slice(0,10)}.json"`);
      res.json(payload);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/sync/import — 匯入 JSON 覆蓋資料庫
  router.post('/import', (req, res) => {
    try {
      const { data, mode } = req.body;
      if (!Array.isArray(data)) return res.status(400).json({ error: 'data 必須是陣列' });

      if (mode === 'replace') {
        db.exec('DELETE FROM ransomware_events');
      }

      const ins = db.prepare(`INSERT OR REPLACE INTO ransomware_events (
        id,event_date,report_week,report_month,source_publish_date,first_observed_date,
        victim_name,victim_domain,country,is_taiwan,victim_category,agency_type,
        industry,sub_industry,ransomware_group,event_type,source_name,source_url,
        leak_status,public_disclosure_status,impact_level,confidence_level,
        include_in_report,need_follow_up,tags,summary,notes,created_at,updated_at
      ) VALUES (
        @id,@event_date,@report_week,@report_month,@source_publish_date,@first_observed_date,
        @victim_name,@victim_domain,@country,@is_taiwan,@victim_category,@agency_type,
        @industry,@sub_industry,@ransomware_group,@event_type,@source_name,@source_url,
        @leak_status,@public_disclosure_status,@impact_level,@confidence_level,
        @include_in_report,@need_follow_up,@tags,@summary,@notes,@created_at,@updated_at
      )`);

      const insertMany = db.transaction((items) => {
        for (const row of items) ins.run(row);
      });
      insertMany(data);

      res.json({ success: true, imported: data.length, mode: mode || 'merge' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
