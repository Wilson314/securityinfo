const express = require('express');

function getISOWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil((((d - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}
function getYearMonth(d) { return d.substring(0, 7); }

module.exports = function(db) {
  const router = express.Router();

  // GET /api/events
  router.get('/', (req, res) => {
    try {
      const { keyword, startDate, endDate, month, industry, victimCategory, agencyType, ransomwareGroup, sourceName, isTaiwan, includeInReport, needFollowUp, sortBy, sortDir, page, pageSize } = req.query;
      const where = []; const params = {};
      if (keyword) { where.push('(victim_name LIKE @kw OR victim_domain LIKE @kw OR ransomware_group LIKE @kw OR summary LIKE @kw)'); params.kw = `%${keyword}%`; }
      if (startDate) { where.push('event_date >= @startDate'); params.startDate = startDate; }
      if (endDate) { where.push('event_date <= @endDate'); params.endDate = endDate; }
      if (month) { where.push('report_month = @month'); params.month = month; }
      if (industry) { where.push('industry = @industry'); params.industry = industry; }
      if (victimCategory) { where.push('victim_category = @victimCategory'); params.victimCategory = victimCategory; }
      if (agencyType) { where.push('agency_type = @agencyType'); params.agencyType = agencyType; }
      if (ransomwareGroup) { where.push('ransomware_group = @ransomwareGroup'); params.ransomwareGroup = ransomwareGroup; }
      if (sourceName) { where.push('source_name = @sourceName'); params.sourceName = sourceName; }
      if (isTaiwan === 'true') where.push('is_taiwan = 1');
      if (isTaiwan === 'false') where.push('is_taiwan = 0');
      if (includeInReport === 'true') where.push('include_in_report = 1');
      if (includeInReport === 'false') where.push('include_in_report = 0');
      if (needFollowUp === 'true') where.push('need_follow_up = 1');
      if (needFollowUp === 'false') where.push('need_follow_up = 0');
      const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const allowed = ['event_date','impact_level','industry','ransomware_group','created_at'];
      const col = allowed.includes(sortBy) ? sortBy : 'event_date';
      const dir = sortDir === 'asc' ? 'ASC' : 'DESC';
      const total = (db.prepare(`SELECT COUNT(*) as cnt FROM ransomware_events ${whereSQL}`).get(params) || {}).cnt || 0;
      const pg = parseInt(page) || 1; const ps = parseInt(pageSize) || 20;
      const rows = db.prepare(`SELECT * FROM ransomware_events ${whereSQL} ORDER BY ${col} ${dir} LIMIT ${ps} OFFSET ${(pg-1)*ps}`).all(params);
      res.json({ total, page: pg, pageSize: ps, data: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM ransomware_events WHERE id = @id').get({ id: req.params.id });
    if (!row) return res.status(404).json({ error: '找不到事件' });
    res.json(row);
  });

  router.post('/', (req, res) => {
    try {
      const d = req.body;
      const r = db.prepare(`INSERT INTO ransomware_events (
        event_date,report_week,report_month,source_publish_date,first_observed_date,
        victim_name,victim_domain,country,is_taiwan,victim_category,agency_type,
        industry,sub_industry,ransomware_group,event_type,source_name,source_url,
        leak_status,public_disclosure_status,impact_level,confidence_level,
        include_in_report,need_follow_up,tags,summary,notes
      ) VALUES (
        @event_date,@report_week,@report_month,@source_publish_date,@first_observed_date,
        @victim_name,@victim_domain,@country,@is_taiwan,@victim_category,@agency_type,
        @industry,@sub_industry,@ransomware_group,@event_type,@source_name,@source_url,
        @leak_status,@public_disclosure_status,@impact_level,@confidence_level,
        @include_in_report,@need_follow_up,@tags,@summary,@notes
      )`).run({ ...d, report_week: d.event_date ? getISOWeek(d.event_date) : null, report_month: d.event_date ? getYearMonth(d.event_date) : null, is_taiwan: d.is_taiwan ? 1 : 0, include_in_report: d.include_in_report ? 1 : 0, need_follow_up: d.need_follow_up ? 1 : 0 });
      const created = db.prepare('SELECT * FROM ransomware_events WHERE id = @id').get({ id: r.lastInsertRowid });
      res.status(201).json(created);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      const d = req.body;
      db.prepare(`UPDATE ransomware_events SET
        event_date=@event_date,report_week=@report_week,report_month=@report_month,
        source_publish_date=@source_publish_date,first_observed_date=@first_observed_date,
        victim_name=@victim_name,victim_domain=@victim_domain,country=@country,
        is_taiwan=@is_taiwan,victim_category=@victim_category,agency_type=@agency_type,
        industry=@industry,sub_industry=@sub_industry,ransomware_group=@ransomware_group,
        event_type=@event_type,source_name=@source_name,source_url=@source_url,
        leak_status=@leak_status,public_disclosure_status=@public_disclosure_status,
        impact_level=@impact_level,confidence_level=@confidence_level,
        include_in_report=@include_in_report,need_follow_up=@need_follow_up,
        tags=@tags,summary=@summary,notes=@notes,updated_at=datetime('now')
        WHERE id=@id`
      ).run({ ...d, id: req.params.id, report_week: d.event_date ? getISOWeek(d.event_date) : null, report_month: d.event_date ? getYearMonth(d.event_date) : null, is_taiwan: d.is_taiwan ? 1 : 0, include_in_report: d.include_in_report ? 1 : 0, need_follow_up: d.need_follow_up ? 1 : 0 });
      res.json(db.prepare('SELECT * FROM ransomware_events WHERE id = @id').get({ id: req.params.id }));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.delete('/:id', (req, res) => {
    try { db.prepare('DELETE FROM ransomware_events WHERE id = @id').run({ id: req.params.id }); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
};
