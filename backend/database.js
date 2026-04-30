const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { DbWrapper } = require('./db-wrapper');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = path.join(dataDir, 'security_report.db');

function getISOWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
function getYearMonth(d) { return d.substring(0, 7); }

async function initDatabase() {
  const SQL = await initSqlJs();
  let buf = null;
  if (fs.existsSync(DB_PATH)) buf = fs.readFileSync(DB_PATH);
  const raw = buf ? new SQL.Database(buf) : new SQL.Database();
  const db = new DbWrapper(raw, DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ransomware_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_date TEXT NOT NULL, report_week TEXT, report_month TEXT,
      source_publish_date TEXT, first_observed_date TEXT,
      victim_name TEXT NOT NULL, victim_domain TEXT, country TEXT,
      is_taiwan INTEGER DEFAULT 0, victim_category TEXT, agency_type TEXT,
      industry TEXT, sub_industry TEXT, ransomware_group TEXT, event_type TEXT,
      source_name TEXT NOT NULL, source_url TEXT, leak_status TEXT,
      public_disclosure_status TEXT, impact_level TEXT DEFAULT '待確認',
      confidence_level TEXT DEFAULT '待確認', include_in_report INTEGER DEFAULT 0,
      need_follow_up INTEGER DEFAULT 0, tags TEXT, summary TEXT, notes TEXT,
      created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const cnt = db.prepare('SELECT COUNT(*) as cnt FROM ransomware_events').get();
  if (!cnt || cnt.cnt === 0) {
    const ins = db.prepare(`INSERT INTO ransomware_events (
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
    )`);

    const seed = [
      { event_date:'2026-04-08', victim_name:'台灣某半導體封裝公司', victim_domain:'example-pkg.com.tw', country:'台灣', is_taiwan:1, victim_category:'企業', agency_type:'', industry:'半導體', sub_industry:'半導體封裝', ransomware_group:'Qilin', event_type:'雙重勒索', source_name:'Recorded Future', source_url:'https://www.recordedfuture.com', leak_status:'已公布', public_disclosure_status:'查無重大訊息', impact_level:'高', confidence_level:'高', include_in_report:1, need_follow_up:1, tags:'台灣,半導體,高風險', summary:'勒索軟體威脅組織 Qilin 公布台灣某半導體封裝公司（example-pkg.com.tw）遭受雙重勒索攻擊，屬於半導體封裝產業，消息來源為 Recorded Future，影響程度為高，後續仍待追蹤。', notes:'已確認資料外洩' },
      { event_date:'2026-04-09', victim_name:'台灣某國立大學', victim_domain:'example-univ.edu.tw', country:'台灣', is_taiwan:1, victim_category:'學校', agency_type:'學校', industry:'教育', sub_industry:'大學院校', ransomware_group:'INC Ransom', event_type:'資料外洩', source_name:'新聞媒體', source_url:'', leak_status:'預告公布', public_disclosure_status:'新聞已報導', impact_level:'中', confidence_level:'中', include_in_report:1, need_follow_up:1, tags:'台灣,教育', summary:'勒索軟體威脅組織 INC Ransom 公布台灣某國立大學（example-univ.edu.tw）資料外洩，屬於教育產業，外洩狀態為預告公布，影響程度為中。', notes:'' },
      { event_date:'2026-04-10', victim_name:'美國某大型醫療集團', victim_domain:'us-health.com', country:'美國', is_taiwan:0, victim_category:'醫療院所', agency_type:'醫療院所', industry:'醫療', sub_industry:'綜合醫院', ransomware_group:'LockBit', event_type:'勒索軟體', source_name:'CISA', source_url:'https://www.cisa.gov', leak_status:'已公布', public_disclosure_status:'已發布重大訊息', impact_level:'高', confidence_level:'高', include_in_report:1, need_follow_up:0, tags:'醫療,高風險', summary:'勒索軟體威脅組織 LockBit 攻擊美國某大型醫療集團（us-health.com），CISA 已發布警告，影響程度為高。', notes:'' },
      { event_date:'2026-04-11', victim_name:'台灣某精密機械製造廠', victim_domain:'tw-mfg.com.tw', country:'台灣', is_taiwan:1, victim_category:'企業', agency_type:'', industry:'製造業', sub_industry:'精密機械', ransomware_group:'DragonForce', event_type:'雙重勒索', source_name:'勒索網站', source_url:'', leak_status:'已公布', public_disclosure_status:'查無重大訊息', impact_level:'中', confidence_level:'高', include_in_report:1, need_follow_up:1, tags:'台灣,製造業', summary:'勒索軟體威脅組織 DragonForce 公布台灣某精密機械製造廠（tw-mfg.com.tw）遭受雙重勒索，影響程度為中，後續仍待追蹤。', notes:'' },
      { event_date:'2026-04-12', victim_name:'英國某市政府', victim_domain:'uk-council.gov.uk', country:'英國', is_taiwan:0, victim_category:'政府機關', agency_type:'地方政府', industry:'政府', sub_industry:'地方行政', ransomware_group:'Unknown', event_type:'勒索軟體', source_name:'新聞媒體', source_url:'', leak_status:'待確認', public_disclosure_status:'新聞已報導', impact_level:'高', confidence_level:'中', include_in_report:1, need_follow_up:1, tags:'政府,英國,高風險', summary:'不明威脅組織攻擊英國某市政府（uk-council.gov.uk），屬於地方政府，影響程度為高，後續仍待追蹤。', notes:'' },
      { event_date:'2026-04-14', victim_name:'日本某金融控股公司', victim_domain:'jp-finance.co.jp', country:'日本', is_taiwan:0, victim_category:'企業', agency_type:'', industry:'金融', sub_industry:'金融控股', ransomware_group:'BlackCat', event_type:'資料外洩', source_name:'Recorded Future', source_url:'https://www.recordedfuture.com', leak_status:'已公布', public_disclosure_status:'已發布重大訊息', impact_level:'中', confidence_level:'高', include_in_report:1, need_follow_up:0, tags:'金融,日本', summary:'勒索軟體威脅組織 BlackCat 公布日本某金融控股公司（jp-finance.co.jp）資料外洩，消息來源為 Recorded Future，影響程度為中。', notes:'' },
      { event_date:'2026-04-15', victim_name:'台灣某科技軟體公司', victim_domain:'tw-software.com.tw', country:'台灣', is_taiwan:1, victim_category:'企業', agency_type:'', industry:'科技業', sub_industry:'軟體開發', ransomware_group:'Cl0p', event_type:'憑證外洩', source_name:'Shadowserver', source_url:'', leak_status:'待確認', public_disclosure_status:'查無重大訊息', impact_level:'低', confidence_level:'中', include_in_report:0, need_follow_up:1, tags:'台灣,科技業', summary:'勒索軟體威脅組織 Cl0p 疑似取得台灣某科技軟體公司（tw-software.com.tw）憑證資料，影響程度為低。', notes:'' },
      { event_date:'2026-04-16', victim_name:'美國某能源公司', victim_domain:'us-energy.com', country:'美國', is_taiwan:0, victim_category:'關鍵基礎設施', agency_type:'關鍵基礎設施', industry:'能源', sub_industry:'電力供應', ransomware_group:'Play', event_type:'勒索軟體', source_name:'CISA', source_url:'https://www.cisa.gov', leak_status:'已公布', public_disclosure_status:'已發布重大訊息', impact_level:'高', confidence_level:'高', include_in_report:1, need_follow_up:1, tags:'能源,美國,高風險', summary:'勒索軟體威脅組織 Play 攻擊美國某能源公司（us-energy.com），CISA 已發布警告，影響程度為高，後續仍待追蹤。', notes:'' },
      { event_date:'2026-04-17', victim_name:'澳洲某大型零售集團', victim_domain:'au-retail.com.au', country:'澳洲', is_taiwan:0, victim_category:'企業', agency_type:'', industry:'零售', sub_industry:'連鎖零售', ransomware_group:'BianLian', event_type:'資料外洩', source_name:'勒索網站', source_url:'', leak_status:'已公布', public_disclosure_status:'新聞已報導', impact_level:'低', confidence_level:'中', include_in_report:0, need_follow_up:0, tags:'零售,澳洲', summary:'勒索軟體威脅組織 BianLian 公布澳洲某大型零售集團（au-retail.com.au）資料外洩，影響程度為低。', notes:'' },
      { event_date:'2026-04-18', victim_name:'台灣某區域醫院', victim_domain:'tw-hospital.org.tw', country:'台灣', is_taiwan:1, victim_category:'醫療院所', agency_type:'醫療院所', industry:'醫療', sub_industry:'區域醫院', ransomware_group:'Medusa', event_type:'雙重勒索', source_name:'新聞媒體', source_url:'', leak_status:'預告公布', public_disclosure_status:'新聞已報導', impact_level:'中', confidence_level:'高', include_in_report:1, need_follow_up:1, tags:'台灣,醫療,需追蹤', summary:'勒索軟體威脅組織 Medusa 公布台灣某區域醫院（tw-hospital.org.tw）遭受雙重勒索，外洩狀態為預告公布，影響程度為中，後續仍待追蹤。', notes:'院方已通報衛福部' },
      { event_date:'2026-04-21', victim_name:'德國某汽車零件製造商', victim_domain:'de-auto-parts.de', country:'德國', is_taiwan:0, victim_category:'企業', agency_type:'', industry:'製造業', sub_industry:'汽車零件', ransomware_group:'RansomHub', event_type:'雙重勒索', source_name:'Recorded Future', source_url:'https://www.recordedfuture.com', leak_status:'已公布', public_disclosure_status:'查無重大訊息', impact_level:'高', confidence_level:'高', include_in_report:1, need_follow_up:0, tags:'製造業,德國,高風險', summary:'勒索軟體威脅組織 RansomHub 公布德國某汽車零件製造商（de-auto-parts.de）遭受雙重勒索，消息來源為 Recorded Future，影響程度為高。', notes:'' },
      { event_date:'2026-04-22', victim_name:'台灣某縣市政府資訊局', victim_domain:'tw-gov.gov.tw', country:'台灣', is_taiwan:1, victim_category:'政府機關', agency_type:'地方政府', industry:'政府', sub_industry:'地方行政', ransomware_group:'Unknown', event_type:'系統弱點利用', source_name:'Shodan', source_url:'', leak_status:'待確認', public_disclosure_status:'未確認', impact_level:'高', confidence_level:'低', include_in_report:1, need_follow_up:1, tags:'台灣,政府,高風險,需追蹤', summary:'不明威脅組織疑似透過系統弱點攻擊台灣某縣市政府資訊局（tw-gov.gov.tw），消息來源為 Shodan，影響程度為高，可信度為低，後續仍待追蹤。', notes:'發現開放的 RDP 端口' }
    ];

    const insertMany = db.transaction((items) => {
      for (const e of items) {
        ins.run({ ...e, source_publish_date: e.event_date, first_observed_date: e.event_date, report_week: getISOWeek(e.event_date), report_month: getYearMonth(e.event_date) });
      }
    });
    insertMany(seed);
    console.log('✅ 已插入 12 筆測試資料');
  }
  return db;
}

module.exports = { initDatabase };
