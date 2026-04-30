import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, Trash2, Edit2, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEvents, deleteEvent } from '../lib/api'
import { formatDate } from '../lib/utils'
import { INDUSTRIES, VICTIM_CATEGORIES, SOURCE_NAMES, IMPACT_COLORS } from '../constants/options'

const RANSOMWARE_GROUPS = ['Qilin','INC Ransom','LockBit','DragonForce','BlackCat','Cl0p','Play','BianLian','Medusa','RansomHub','Unknown']

export default function EventList() {
  const [events, setEvents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const PAGE_SIZE = 20

  const [filters, setFilters] = useState({
    keyword: '', startDate: '', endDate: '', month: '',
    industry: '', victimCategory: '', agencyType: '',
    ransomwareGroup: '', sourceName: '',
    isTaiwan: '', includeInReport: '', needFollowUp: '',
    sortBy: 'event_date', sortDir: 'desc'
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries({ ...filters, page, pageSize: PAGE_SIZE }).filter(([, v]) => v !== ''))
      const res = await getEvents(params)
      setEvents(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch { toast.error('載入失敗') } finally { setLoading(false) }
  }, [filters, page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    try {
      await deleteEvent(id)
      toast.success('已刪除')
      setDeleteConfirm(null)
      load()
    } catch { toast.error('刪除失敗') }
  }

  const setFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const clearFilters = () => { setFilters({ keyword:'',startDate:'',endDate:'',month:'',industry:'',victimCategory:'',agencyType:'',ransomwareGroup:'',sourceName:'',isTaiwan:'',includeInReport:'',needFollowUp:'',sortBy:'event_date',sortDir:'desc' }); setPage(1) }
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilterCount = [filters.industry,filters.victimCategory,filters.ransomwareGroup,filters.sourceName,filters.isTaiwan,filters.includeInReport,filters.needFollowUp,filters.month,filters.startDate].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">事件列表</h1>
          <p className="text-sm text-slate-500 mt-0.5">共 {total} 筆事件</p>
        </div>
        <Link to="/events/new" className="btn-primary"><Plus size={15} />新增事件</Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="card p-4">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="form-input pl-8" placeholder="搜尋受害者、網域、勒索組織、摘要…"
              value={filters.keyword} onChange={e => setFilter('keyword', e.target.value)} />
          </div>
          <input type="month" className="form-input w-36" value={filters.month}
            onChange={e => setFilter('month', e.target.value)} />
          <button className="btn-secondary relative" onClick={() => setShowFilters(f => !f)}>
            <Filter size={14} />篩選
            {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          {activeFilterCount > 0 && <button className="btn-secondary text-red-500" onClick={clearFilters}><X size={14} />清除篩選</button>}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <div>
              <label className="form-label">開始日期</label>
              <input type="date" className="form-input" value={filters.startDate} onChange={e => setFilter('startDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">結束日期</label>
              <input type="date" className="form-input" value={filters.endDate} onChange={e => setFilter('endDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">產業</label>
              <select className="form-select" value={filters.industry} onChange={e => setFilter('industry', e.target.value)}>
                <option value="">全部</option>
                {INDUSTRIES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">受害者類型</label>
              <select className="form-select" value={filters.victimCategory} onChange={e => setFilter('victimCategory', e.target.value)}>
                <option value="">全部</option>
                {VICTIM_CATEGORIES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">勒索組織</label>
              <select className="form-select" value={filters.ransomwareGroup} onChange={e => setFilter('ransomwareGroup', e.target.value)}>
                <option value="">全部</option>
                {RANSOMWARE_GROUPS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">消息來源</label>
              <select className="form-select" value={filters.sourceName} onChange={e => setFilter('sourceName', e.target.value)}>
                <option value="">全部</option>
                {SOURCE_NAMES.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">是否台灣</label>
              <select className="form-select" value={filters.isTaiwan} onChange={e => setFilter('isTaiwan', e.target.value)}>
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <div>
              <label className="form-label">是否納入週報</label>
              <select className="form-select" value={filters.includeInReport} onChange={e => setFilter('includeInReport', e.target.value)}>
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <div>
              <label className="form-label">需追蹤</label>
              <select className="form-select" value={filters.needFollowUp} onChange={e => setFilter('needFollowUp', e.target.value)}>
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <div>
              <label className="form-label">排序欄位</label>
              <select className="form-select" value={filters.sortBy} onChange={e => setFilter('sortBy', e.target.value)}>
                <option value="event_date">事件日期</option>
                <option value="impact_level">影響程度</option>
                <option value="industry">產業</option>
                <option value="ransomware_group">勒索組織</option>
              </select>
            </div>
            <div>
              <label className="form-label">排序方向</label>
              <select className="form-select" value={filters.sortDir} onChange={e => setFilter('sortDir', e.target.value)}>
                <option value="desc">新→舊</option>
                <option value="asc">舊→新</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper bg-white">
        <table className="data-table">
          <thead>
            <tr>
              <th>日期</th><th>受害者</th><th>國家</th><th>產業</th>
              <th>勒索組織</th><th>事件類型</th><th>影響</th><th>標籤</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-slate-400">載入中…</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-slate-400">查無資料</td></tr>
            ) : events.map(e => (
              <tr key={e.id}>
                <td className="whitespace-nowrap">{formatDate(e.event_date)}</td>
                <td>
                  <p className="font-medium text-slate-800 max-w-[200px] truncate">{e.victim_name}</p>
                  {e.victim_domain && <p className="text-xs text-slate-400">{e.victim_domain}</p>}
                </td>
                <td className="whitespace-nowrap">{e.country || '-'}</td>
                <td className="whitespace-nowrap">{e.industry || '-'}</td>
                <td className="whitespace-nowrap">{e.ransomware_group || '-'}</td>
                <td className="whitespace-nowrap">{e.event_type || '-'}</td>
                <td><span className={`badge ${IMPACT_COLORS[e.impact_level] || 'badge-gray'}`}>{e.impact_level || '-'}</span></td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {e.is_taiwan ? <span className="badge badge-blue">台灣</span> : null}
                    {e.need_follow_up ? <span className="badge badge-orange">追蹤</span> : null}
                    {e.include_in_report ? <span className="badge badge-green">週報</span> : null}
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <Link to={`/events/edit/${e.id}`} className="btn-secondary btn-sm"><Edit2 size={12} /></Link>
                    <button className="btn-danger btn-sm" onClick={() => setDeleteConfirm(e)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">第 {page} / {totalPages} 頁，共 {total} 筆</p>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
            <button className="btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">確認刪除</h3>
            <p className="text-sm text-slate-600 mb-4">確定要刪除「{deleteConfirm.victim_name}」的事件紀錄嗎？此操作無法復原。</p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>取消</button>
              <button className="btn-primary bg-red-600 hover:bg-red-700" onClick={() => handleDelete(deleteConfirm.id)}>確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
