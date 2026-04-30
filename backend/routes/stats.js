const express = require('express');

function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

module.exports = function(db) {
  const router = express.Router();

  // GET /api/stats/summary
  router.get('/summary', (req, res) => {
    try {
      const month = req.query.month || currentMonth();
      const g = (sql) => (db.prepare(sql).get({ month }) || {});
      const total    = g('SELECT COUNT(*) as cnt FROM ransomware_events WHERE report_month = @month').cnt || 0;
      const taiwan   = g("SELECT COUNT(*) as cnt FROM ransomware_events WHERE report_month = @month AND is_taiwan = 1").cnt || 0;
      const highRisk = g("SELECT COUNT(*) as cnt FROM ransomware_events WHERE report_month = @month AND impact_level = '高'").cnt || 0;
      const followUp = g('SELECT COUNT(*) as cnt FROM ransomware_events WHERE report_month = @month AND need_follow_up = 1').cnt || 0;
      const groups   = g("SELECT COUNT(*) as cnt FROM (SELECT DISTINCT ransomware_group FROM ransomware_events WHERE report_month = @month AND ransomware_group IS NOT NULL AND ransomware_group != '')").cnt || 0;
      const topIndustry = db.prepare("SELECT industry, COUNT(*) as cnt FROM ransomware_events WHERE report_month = @month AND industry IS NOT NULL AND industry != '' GROUP BY industry ORDER BY cnt DESC LIMIT 1").get({ month });
      const topGroup    = db.prepare("SELECT ransomware_group, COUNT(*) as cnt FROM ransomware_events WHERE report_month = @month AND ransomware_group IS NOT NULL AND ransomware_group != '' GROUP BY ransomware_group ORDER BY cnt DESC LIMIT 1").get({ month });
      res.json({ month, total, taiwan, highRisk, followUp, activeGroups: groups, topIndustry: topIndustry ? topIndustry.industry : '-', topGroup: topGroup ? topGroup.ransomware_group : '-' });
    } catch (e) { console.error('summary error:', e); res.status(500).json({ error: e.message }); }
  });

  // GET /api/stats/charts
  router.get('/charts', (req, res) => {
    try {
      const { startDate, endDate, month } = req.query;

      // Build base WHERE clause — always start with WHERE 1=1 to safely append AND conditions
      let baseWhere = 'WHERE 1=1';
      let params = [];
      if (month) {
        baseWhere = 'WHERE report_month = ?';
        params = [month];
      } else if (startDate && endDate) {
        baseWhere = 'WHERE event_date >= ? AND event_date <= ?';
        params = [startDate, endDate];
      }

      const q = (extraWhere) => {
        const sql = `SELECT * FROM (SELECT __COLS__ FROM ransomware_events ${baseWhere} ${extraWhere})`;
        // We build each query inline below instead
      };

      // Each query uses the baseWhere and adds its own AND filter
      const run = (sql) => db.prepare(sql).all(...params);

      const industryStats   = run(`SELECT industry as name, COUNT(*) as value FROM ransomware_events ${baseWhere} AND industry IS NOT NULL AND industry != '' GROUP BY industry ORDER BY value DESC`);
      const agencyTypeStats = run(`SELECT agency_type as name, COUNT(*) as value FROM ransomware_events ${baseWhere} AND agency_type IS NOT NULL AND agency_type != '' GROUP BY agency_type ORDER BY value DESC`);
      const groupStats      = run(`SELECT ransomware_group as name, COUNT(*) as value FROM ransomware_events ${baseWhere} AND ransomware_group IS NOT NULL AND ransomware_group != '' GROUP BY ransomware_group ORDER BY value DESC LIMIT 10`);
      const weeklyTrend     = run(`SELECT report_week as week, COUNT(*) as count FROM ransomware_events ${baseWhere} AND report_week IS NOT NULL GROUP BY report_week ORDER BY report_week ASC`);
      const eventTypeStats  = run(`SELECT event_type as name, COUNT(*) as value FROM ransomware_events ${baseWhere} AND event_type IS NOT NULL AND event_type != '' GROUP BY event_type ORDER BY value DESC`);
      const sourceStats     = run(`SELECT source_name as name, COUNT(*) as value FROM ransomware_events ${baseWhere} AND source_name IS NOT NULL GROUP BY source_name ORDER BY value DESC`);
      const countryStats    = run(`SELECT country as name, COUNT(*) as value FROM ransomware_events ${baseWhere} AND country IS NOT NULL AND country != '' GROUP BY country ORDER BY value DESC LIMIT 20`);
      const impactStats     = run(`SELECT impact_level as name, COUNT(*) as value FROM ransomware_events ${baseWhere} GROUP BY impact_level ORDER BY value DESC`);

      res.json({ industryStats, agencyTypeStats, groupStats, weeklyTrend, eventTypeStats, sourceStats, countryStats, impactStats });
    } catch (e) { console.error('charts error:', e); res.status(500).json({ error: e.message }); }
  });

  return router;
};
