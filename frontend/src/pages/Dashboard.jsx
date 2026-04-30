import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  AlertTriangle, Globe, TrendingUp, Users, Activity,
  Flag, Bell, ExternalLink, RefreshCw
} from 'lucide-react'
import { getSummary, getCharts, getEvents } from '../lib/api'
import { getCurrentMonth, formatDate } from '../lib/utils'
import { IMPACT_COLORS, CHART_COLORS } from '../constants/options'

const StatCard = ({ label, value, sub, icon: Icon, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600', green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600', teal: 'bg-teal-50 text-teal-600',
    slate: 'bg-slate-50 text-slate-600'
  }
  return (
    <div className="card flex items-start gap-4 min-w-0">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-xs text-slate-500 mb-0.5 truncate">{label}</p>
        <p
          className="font-bold text-slate-800 truncate leading-tight"
          style={{ fontSize: 'clamp(0.9rem, 2vw, 1.4rem)' }}
          title={value ?? '-'}
        >
          {value ?? '-'}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

const SectionList = ({ title, events, emptyText, badgeKey }) => (
  <div className="card">
    <h3 className="section-title">{title}</h3>
    {events.length === 0
      ? <p className="text-slate-400 text-sm text-center py-4">{emptyText}</p>
      : <div className="space-y-2">
        {events.map(e => (
          <Link key={e.id} to={`/events/edit/${e.id}`}
            className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700">{e.victim_name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDate(e.event_date)} · {e.industry || '-'} · {e.ransomware_group || '-'}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`badge ${IMPACT_COLORS[e.impact_level] || 'badge-gray'}`}>{e.impact_level}</span>
              <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-400" />
            </div>
          </Link>
        ))}
      </div>
    }
  </div>
)

export default function Dashboard() {
  const [month, setMonth] = useState(getCurrentMonth())
  const [summary, setSummary] = useState({})
  const [charts, setCharts] = useState({})
  const [taiwanEvents, setTaiwanEvents] = useState([])
  const [highRiskEvents, setHighRiskEvents] = useState([])
  const [followUpEvents, setFollowUpEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, c, tw, fu, allEvts] = await Promise.all([
        getSummary({ month }),
        getCharts({ month }),
        getEvents({ month, isTaiwan: 'true', pageSize: 5 }),
        getEvents({ month, needFollowUp: 'true', pageSize: 5 }),
        getEvents({ month, pageSize: 50 })
      ])
      setSummary(s.data)
      setCharts(c.data)
      setTaiwanEvents(tw.data.data || [])
      setFollowUpEvents(fu.data.data || [])
      const all = allEvts.data.data || []
      setHighRiskEvents(all.filter(e => e.impact_level === '高').slice(0, 5))
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { load() }, [load])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-medium text-slate-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name || '數量'}：{p.value}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">資安事件 Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">資安週報勒索事件蒐集與分析平台</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="form-input w-40" />
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            重新整理
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard label="本月事件總數" value={summary.total} icon={Activity} color="blue" />
        <StatCard label="台灣受害者" value={summary.taiwan} icon={Flag} color="red" />
        <StatCard label="高風險事件" value={summary.highRisk} icon={AlertTriangle} color="orange" />
        <StatCard label="需追蹤事件" value={summary.followUp} icon={Bell} color="purple" />
        <StatCard label="涉及勒索組織數" value={summary.activeGroups} icon={Users} color="teal" />
        <StatCard label="最常受害產業" value={summary.topIndustry} icon={TrendingUp} color="green" />
        <StatCard label="最活躍組織" value={summary.topGroup} icon={Globe} color="slate" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Industry Bar */}
        <div className="card xl:col-span-2">
          <h3 className="section-title">產業受害統計</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.industryStats || []} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#1d4ed8" radius={[4, 4, 0, 0]} name="事件數" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event Type Pie */}
        <div className="card">
          <h3 className="section-title">事件類型分佈</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.eventTypeStats || []} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                } labelLine={false} fontSize={10}>
                {(charts.eventTypeStats || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Weekly Trend */}
        <div className="card xl:col-span-2">
          <h3 className="section-title">每週事件趨勢</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={charts.weeklyTrend || []} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2}
                dot={{ r: 4, fill: '#1d4ed8' }} activeDot={{ r: 6 }} name="事件數" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Source Bar */}
        <div className="card">
          <h3 className="section-title">消息來源統計</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.sourceStats || []} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#0891b2" radius={[0, 4, 4, 0]} name="事件數" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Group Top 10 */}
        <div className="card xl:col-span-2">
          <h3 className="section-title">勒索組織 Top 10</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.groupStats || []} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="事件數">
                {(charts.groupStats || []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Country Table */}
        <div className="card">
          <h3 className="section-title">國家／地區受害統計</h3>
          <div className="overflow-auto max-h-52">
            <table className="data-table">
              <thead>
                <tr><th>國家／地區</th><th className="text-right">事件數</th></tr>
              </thead>
              <tbody>
                {(charts.countryStats || []).length === 0
                  ? <tr><td colSpan={2} className="text-center text-slate-400 py-4">無資料</td></tr>
                  : (charts.countryStats || []).map((r, i) => (
                    <tr key={i}>
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

      {/* Quick Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionList title="🇹🇼 台灣受害者事件" events={taiwanEvents} emptyText="本月無台灣受害者事件" />
        <SectionList title="🔴 高風險事件" events={highRiskEvents} emptyText="本月無高風險事件" />
        <SectionList title="🔔 需追蹤事件" events={followUpEvents} emptyText="本月無需追蹤事件" />
      </div>
    </div>
  )
}
