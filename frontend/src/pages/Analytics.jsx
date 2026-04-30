import { useState, useCallback } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { FileText, Download, RefreshCw, FileSpreadsheet, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCharts, getReportPreview, exportCSV, exportExcel, exportTxt } from '../lib/api'
import { getCurrentMonth } from '../lib/utils'
import { CHART_COLORS } from '../constants/options'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name || '數量'}：{p.value}</p>)}
    </div>
  )
}

export default function Analytics() {
  const [mode, setMode] = useState('month')
  const [month, setMonth] = useState(getCurrentMonth())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [charts, setCharts] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)

  const getParams = useCallback(() =>
    mode === 'month' ? { month } : { startDate, endDate }
  , [mode, month, startDate, endDate])

  const loadCharts = async () => {
    setLoading(true)
    try {
      const res = await getCharts(getParams())
      setCharts(res.data)
    } catch { toast.error('載入失敗') } finally { setLoading(false) }
  }

  const loadReport = async () => {
    setReportLoading(true)
    try {
      const res = await getReportPreview(getParams())
      setReport(res.data)
    } catch { toast.error('週報摘要產生失敗') } finally { setReportLoading(false) }
  }

  const totalEvents = (charts?.industryStats || []).reduce((s, r) => s + r.value, 0)
  const topIndustry = (charts?.industryStats || [])[0]?.name || '-'
  const topGroup = (charts?.groupStats || [])[0]?.name || '-'
  const taiwanCount = (charts?.countryStats || []).find(r => r.name === '台灣')?.value || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">分析報表</h1>
          <p className="text-sm text-slate-500 mt-0.5">統計圖表與週報摘要產生</p>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="form-label">查詢模式</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button type="button"
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'month' ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setMode('month')}>依月份</button>
              <button type="button"
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'range' ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                onClick={() => setMode('range')}>依日期區間</button>
            </div>
          </div>
          {mode === 'month' ? (
            <div>
              <label className="form-label">月份</label>
              <input type="month" className="form-input w-40" value={month} onChange={e => setMonth(e.target.value)} />
            </div>
          ) : (
            <>
              <div><label className="form-label">開始日期</label><input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><label className="form-label">結束日期</label><input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </>
          )}
          <button className="btn-primary" onClick={loadCharts} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />產生統計
          </button>
          <div className="flex gap-2 ml-auto">
            <button className="btn-secondary" onClick={() => exportCSV(getParams())}><Download size={14} />CSV</button>
            <button className="btn-secondary" onClick={() => exportExcel(getParams())}><FileSpreadsheet size={14} />Excel</button>
            <button className="btn-secondary" onClick={() => exportTxt(getParams())}><FileDown size={14} />TXT</button>
          </div>
        </div>
      </div>

      {/* Summary Text */}
      {charts && (
        <div className="card bg-blue-50 border border-blue-100">
          <h3 className="section-title text-blue-800">📊 統計摘要</h3>
          <p className="text-sm text-blue-900 leading-relaxed">
            本期共蒐整 <strong>{totalEvents}</strong> 件勒索或資料外洩相關事件，
            其中台灣受害者 <strong>{taiwanCount}</strong> 件，
            受害產業以<strong>{topIndustry}</strong>最多，
            最活躍勒索組織為 <strong>{topGroup}</strong>。
            {(charts.impactStats || []).find(r => r.name === '高')?.value
              ? `高影響程度事件 ${(charts.impactStats || []).find(r => r.name === '高').value} 件。` : ''}
          </p>
        </div>
      )}

      {/* Charts Grid */}
      {charts && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="section-title">產業受害統計</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.industryStats} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#1d4ed8" radius={[4,4,0,0]} name="事件數" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title">事件類型分佈</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts.eventTypeStats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {(charts.eventTypeStats||[]).map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="section-title">勒索組織 Top 10</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts.groupStats} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4,4,0,0]} name="事件數">
                    {(charts.groupStats||[]).map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title">每週事件趨勢</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={charts.weeklyTrend} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} name="事件數" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="section-title">消息來源統計</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={charts.sourceStats} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#0891b2" radius={[0,4,4,0]} name="事件數" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="section-title">國家／地區受害統計</h3>
              <div className="overflow-auto max-h-52">
                <table className="data-table">
                  <thead><tr><th>排名</th><th>國家／地區</th><th className="text-right">事件數</th></tr></thead>
                  <tbody>
                    {(charts.countryStats||[]).length === 0
                      ? <tr><td colSpan={3} className="text-center text-slate-400 py-4">無資料</td></tr>
                      : (charts.countryStats||[]).map((r,i) => (
                        <tr key={i}>
                          <td className="text-slate-400 font-mono">{i+1}</td>
                          <td>{r.name}</td>
                          <td className="text-right font-medium">{r.value}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">📋 週報條列摘要</h3>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={loadReport} disabled={reportLoading}>
              <FileText size={14} className={reportLoading ? 'animate-spin' : ''} />
              {reportLoading ? '產生中…' : '產生週報摘要'}
            </button>
            {report && <button className="btn-secondary" onClick={() => exportTxt(getParams())}><FileDown size={14} />匯出 TXT</button>}
          </div>
        </div>
        {!report && <p className="text-slate-400 text-sm text-center py-6">點擊「產生週報摘要」按鈕，依 include_in_report = 是 的事件產生中文條列摘要</p>}
        {report && (
          <div>
            <p className="text-xs text-slate-500 mb-3">共 {report.total} 筆納入週報事件</p>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {report.lines.length === 0
                ? <p className="text-slate-400 text-sm text-center py-4">本期間無需納入週報之事件</p>
                : report.lines.map((line, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">{line}</div>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
