/**
 * 資安週報分析平台 - Google Apps Script
 * 更新後請重新部署新版本！
 */

const SPREADSHEET_ID = '';
const SHEET_NAME = '勒索事件';

const COLUMNS = [
  'id','event_date','report_week','report_month','source_publish_date','first_observed_date',
  'victim_name','victim_domain','country','is_taiwan','victim_category','agency_type',
  'industry','sub_industry','ransomware_group','event_type','source_name','source_url',
  'leak_status','public_disclosure_status','impact_level','confidence_level',
  'include_in_report','need_follow_up','tags','summary','notes','created_at','updated_at'
];

const COLUMN_HEADERS = [
  'ID','事件日期','週別','月份','消息來源發布日期','首次觀測日期',
  '受害者名稱','受害者網域','國家/地區','是否台灣','受害者類型','機關類型',
  '產業類別','子產業','勒索組織','事件類型','消息來源','來源連結',
  '外洩狀態','公開揭露狀態','影響程度','可信度',
  '是否納入週報','是否需追蹤','標籤','摘要','備註','建立時間','更新時間'
];

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== '') return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('請設定 SPREADSHEET_ID 或從 Google Sheets 建立此腳本');
}

function getOrCreateSheet() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var hr = sheet.getRange(1, 1, 1, COLUMN_HEADERS.length);
    hr.setValues([COLUMN_HEADERS]);
    hr.setBackground('#1d4ed8').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'test';

    if (action === 'test') {
      return jsonResponse({ status: 'ok', message: 'Google Apps Script 連線正常', sheet: SHEET_NAME, time: new Date().toISOString() });
    }

    // ★ 後端輪詢：取得最近一次匯出結果
    if (action === 'export_status') {
      var prop = PropertiesService.getScriptProperties().getProperty('last_export');
      if (!prop) return jsonResponse({ status: 'pending', message: '尚無匯出記錄' });
      return jsonResponse(JSON.parse(prop));
    }

    if (action === 'import') {
      var sheet = getOrCreateSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return jsonResponse({ data: [], message: '試算表目前無資料' });
      var values = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
      var data = values.filter(function(r) { return r[0] && r[6]; }).map(function(row) {
        var obj = {};
        COLUMNS.forEach(function(col, i) {
          var v = row[i];
          if (col === 'is_taiwan' || col === 'include_in_report' || col === 'need_follow_up') v = (v === '是' || v === true || v === 1) ? 1 : 0;
          obj[col] = (v === '' || v === null || v === undefined) ? null : v;
        });
        return obj;
      });
      return jsonResponse({ data: data, total: data.length });
    }

    return jsonResponse({ error: '不支援的 action: ' + action });
  } catch(err) {
    return jsonResponse({ error: '執行失敗：' + (err.message || String(err)) });
  }
}

function doPost(e) {
  try {
    var body;
    if (e && e.parameter && e.parameter.data) {
      body = JSON.parse(e.parameter.data);
    } else if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    } else {
      return jsonResponse({ error: '缺少 POST 資料' });
    }

    var action = body.action || 'export';

    if (action === 'export') {
      var sheet = getOrCreateSheet();
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).clearContent();

      var rows = (body.data || []).map(function(item) {
        return COLUMNS.map(function(col) {
          var v = item[col];
          if (col === 'is_taiwan' || col === 'include_in_report' || col === 'need_follow_up') return v ? '是' : '否';
          return (v === null || v === undefined) ? '' : String(v);
        });
      });

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, COLUMNS.length).setValues(rows);
        var impactIdx = COLUMNS.indexOf('impact_level');
        rows.forEach(function(row, i) {
          sheet.getRange(i + 2, 1, 1, COLUMNS.length).setBackground(row[impactIdx] === '高' ? '#fef2f2' : null);
        });
        try { sheet.autoResizeColumns(1, Math.min(COLUMNS.length, 26)); } catch(e2) {}
      }

      var ss = getSpreadsheet();
      var result = { success: true, count: rows.length, message: '已匯出 ' + rows.length + ' 筆資料', sheetUrl: ss.getUrl(), time: new Date().toISOString() };

      // ★ 把結果存到 PropertiesService，讓後端可以用 GET 取回
      PropertiesService.getScriptProperties().setProperty('last_export', JSON.stringify(result));

      return jsonResponse(result);
    }

    return jsonResponse({ error: '不支援的 action: ' + action });
  } catch(err) {
    var errResult = { success: false, error: '執行失敗：' + (err.message || String(err)) };
    try { PropertiesService.getScriptProperties().setProperty('last_export', JSON.stringify(errResult)); } catch(e3) {}
    return jsonResponse(errResult);
  }
}

function testScript() {
  var result = doGet({ parameter: { action: 'test' } });
  Logger.log('測試結果：' + result.getContent());
  Logger.log('腳本運作正常');
}
