const express = require('express');
const XLSX = require('xlsx');

const COL_KEYS = ['event_date','report_week','report_month','victim_name','victim_domain','country','is_taiwan','victim_category','agency_type','industry','sub_industry','ransomware_group','event_type','source_name','source_url','leak_status','public_disclosure_status','impact_level','confidence_level','include_in_report','need_follow_up','tags','summary','notes'];
const COL_NAMES = ['事件日期','週別','月份','受害者名稱','受害者網域','國家／地區','是否台灣','受害者類型','機關類型','產業類別','子產業','勒索組織','事件類型','消息來源','來源連結','外洩狀態','公開揭露狀態','影響程度','可信度','是否納入週報','是否需追蹤','標籤','摘要','備註'];
const BOOL_KEYS = ['is_taiwan','include_in_report','need_follow_up'];

function buildWhere(q) {
  const w = []; const p = {};
  if (q.keyword) { w.push('(victim_name LIKE @kw OR victim_domain LIKE @kw OR ransomware_group LIKE @kw)'); p.kw = `%${q.keyword}%`; }
  if (q.startDate) { w.push('event_date >= @startDate'); p.startDate = q.startDate; }
  if (q.endDate)   { w.push('event_date <= @endDate');   p.endDate = q.endDate; }
  if (q.month)     { w.push('report_month = @month');    p.month = q.month; }
  if (q.industry)  { w.push('industry = @industry');     p.industry = q.industry; }
  if (q.isTaiwan === 'true')        w.push('is_taiwan = 1');
  if (q.includeInReport === 'true') w.push('include_in_report = 1');
  if (q.needFollowUp === 'true')    w.push('need_follow_up = 1');
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', p };
}

function buildSummaryLines(rows) {
  return rows.map((r, i) => {
    const [,m,d] = (r.event_date || '').split('-');
    const dt = m ? `${parseInt(m)}/${parseInt(d)}` : '';
    const grp = (!r.ransomware_group || r.ransomware_group === 'Unknown') ? '不明威脅組織' : `勒索軟體威脅組織 ${r.ransomware_group}`;
    const vic = r.victim_domain ? `「${r.victim_name}（${r.victim_domain}）」` : `「${r.victim_name}」`;
    const actMap = { '勒索軟體':'遭受勒索攻擊','資料外洩':'資料遭外洩','雙重勒索':'資料遭勒索加密','憑證外洩':'憑證資料遭外洩','系統弱點利用':'遭系統弱點利用攻擊','供應鏈攻擊':'遭供應鏈攻擊','國家級攻擊':'遭國家級網路攻擊' };
    let t = `${i+1}. ${dt} ${grp} 公布${vic}${actMap[r.event_type] || '遭受攻擊'}`;
    if (r.industry) t += `，該${r.victim_category === '政府機關' || r.victim_category === '學校' ? '單位' : '公司'}屬於${r.industry}產業`;
    if (r.sub_industry) t += `，主要從事${r.sub_industry}相關業務`;
    if (r.source_name === 'Recorded Future') t += `，消息來源為 Recorded Future`;
    else if (r.source_name) t += `，消息來源為${r.source_name}`;
    if (r.impact_level && r.impact_level !== '待確認') t += `，影響程度為${r.impact_level}`;
    if (r.need_follow_up) t += `，後續仍待追蹤`;
    return t + '。';
  });
}

module.exports = function(db) {
  const router = express.Router();

  function getRows(q) {
    const { where, p } = buildWhere(q);
    return db.prepare(`SELECT * FROM ransomware_events ${where} ORDER BY event_date ASC`).all(p);
  }

  router.get('/csv', (req, res) => {
    try {
      const rows = getRows(req.query);
      const header = COL_NAMES.join(',');
      const lines = rows.map(r => COL_KEYS.map(k => {
        let v = BOOL_KEYS.includes(k) ? (r[k] ? '是' : '否') : (r[k] ?? '');
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ransomware_events.csv"');
      res.send('\uFEFF' + [header, ...lines].join('\n'));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/excel', (req, res) => {
    try {
      const rows = getRows(req.query);
      const wsData = [COL_NAMES, ...rows.map(r => COL_KEYS.map(k => BOOL_KEYS.includes(k) ? (r[k] ? '是' : '否') : (r[k] ?? '')))];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = COL_KEYS.map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, ws, '勒索事件');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="ransomware_events.xlsx"');
      res.send(buf);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/report-summary', (req, res) => {
    try {
      const { startDate, endDate, month } = req.query;
      let w = 'WHERE include_in_report = 1'; const p = [];
      if (month) { w += ' AND report_month = ?'; p.push(month); }
      else if (startDate && endDate) { w += ' AND event_date >= ? AND event_date <= ?'; p.push(startDate, endDate); }
      const rows = db.prepare(`SELECT * FROM ransomware_events ${w} ORDER BY event_date ASC`).all(...p);
      const now = new Date();
      const title = `資安週報摘要（產生時間：${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}）\n${'='.repeat(60)}\n\n`;
      const lines = buildSummaryLines(rows);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="report_summary.txt"');
      res.send('\uFEFF' + title + (lines.length ? lines.join('\n\n') : '（本期間無需納入週報之事件）'));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/report-preview', (req, res) => {
    try {
      const { startDate, endDate, month } = req.query;
      let w = 'WHERE include_in_report = 1'; const p = [];
      if (month) { w += ' AND report_month = ?'; p.push(month); }
      else if (startDate && endDate) { w += ' AND event_date >= ? AND event_date <= ?'; p.push(startDate, endDate); }
      const rows = db.prepare(`SELECT * FROM ransomware_events ${w} ORDER BY event_date ASC`).all(...p);
      res.json({ lines: buildSummaryLines(rows), total: rows.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
