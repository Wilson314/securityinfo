import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, ArrowLeft, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getEvent, createEvent, updateEvent, getEvents } from '../lib/api'
import { getISOWeek, getYearMonth } from '../lib/utils'
import {
  VICTIM_CATEGORIES, AGENCY_TYPES, INDUSTRIES, EVENT_TYPES,
  SOURCE_NAMES, IMPACT_LEVELS, CONFIDENCE_LEVELS, LEAK_STATUSES, DISCLOSURE_STATUSES
} from '../constants/options'

const EMPTY = {
  event_date:'', report_week:'', report_month:'', source_publish_date:'', first_observed_date:'',
  victim_name:'', victim_domain:'', country:'', is_taiwan:false, victim_category:'企業',
  victim_category_other:'', agency_type:'', agency_type_other:'', industry:'', industry_other:'',
  sub_industry:'', ransomware_group:'', event_type:'勒索軟體', event_type_other:'',
  source_name:'Recorded Future', source_name_other:'', source_url:'', leak_status:'待確認',
  public_disclosure_status:'未確認', impact_level:'待確認', confidence_level:'待確認',
  include_in_report:false, need_follow_up:false, tags:'', summary:'', notes:''
}

const Field = ({ label, required, children }) => (
  <div>
    <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    {children}
  </div>
)

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mt-6 mb-3 pb-2 border-b border-slate-100">{children}</h3>
)

export default function EventForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dupWarning, setDupWarning] = useState(null)

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    getEvent(id).then(r => {
      const d = r.data
      const processed = { ...d }
      
      if (processed.victim_category && !VICTIM_CATEGORIES.includes(processed.victim_category)) {
        processed.victim_category_other = processed.victim_category
        processed.victim_category = '其他'
      }
      if (processed.agency_type && !AGENCY_TYPES.includes(processed.agency_type)) {
        processed.agency_type_other = processed.agency_type
        processed.agency_type = '其他'
      }
      if (processed.industry && !INDUSTRIES.includes(processed.industry)) {
        processed.industry_other = processed.industry
        processed.industry = '其他'
      }
      if (processed.event_type && !EVENT_TYPES.includes(processed.event_type)) {
        processed.event_type_other = processed.event_type
        processed.event_type = '其他'
      }
      if (processed.source_name && !SOURCE_NAMES.includes(processed.source_name)) {
        processed.source_name_other = processed.source_name
        processed.source_name = '其他'
      }

      setForm({ ...EMPTY, ...processed, is_taiwan: !!d.is_taiwan, include_in_report: !!d.include_in_report, need_follow_up: !!d.need_follow_up })
    }).catch(() => toast.error('載入失敗')).finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleDateChange = (v) => {
    set('event_date', v)
    if (v) { set('report_week', getISOWeek(v)); set('report_month', getYearMonth(v)) }
  }

  const handleDomainChange = (v) => {
    set('victim_domain', v)
    if (v.endsWith('.tw') || v.includes('.tw/')) set('is_taiwan', true)
  }

  const checkDuplicate = async () => {
    if (!form.victim_name && !form.victim_domain && !form.ransomware_group) return
    try {
      const res = await getEvents({ keyword: form.victim_name, pageSize: 50 })
      const existing = (res.data.data || []).filter(e => {
        if (isEdit && String(e.id) === String(id)) return false
        const sameVictim = e.victim_name === form.victim_name
        const sameDomain = e.victim_domain === form.victim_domain
        const sameGroup = e.ransomware_group === form.ransomware_group
        if (!sameVictim || !sameDomain || !sameGroup) return false
        if (!form.event_date || !e.event_date) return false
        const diff = Math.abs(new Date(form.event_date) - new Date(e.event_date)) / 86400000
        return diff <= 7
      })
      if (existing.length > 0) setDupWarning(existing[0])
      else setDupWarning(null)
    } catch {}
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.event_date) return toast.error('請填寫事件日期')
    if (!form.victim_name) return toast.error('請填寫受害者名稱')
    if (!form.source_name) return toast.error('請選擇消息來源')
    setSaving(true)

    const payload = { ...form }
    if (payload.victim_category === '其他' && payload.victim_category_other) payload.victim_category = payload.victim_category_other
    if (payload.agency_type === '其他' && payload.agency_type_other) payload.agency_type = payload.agency_type_other
    if (payload.industry === '其他' && payload.industry_other) payload.industry = payload.industry_other
    if (payload.event_type === '其他' && payload.event_type_other) payload.event_type = payload.event_type_other
    if (payload.source_name === '其他' && payload.source_name_other) payload.source_name = payload.source_name_other

    try {
      if (isEdit) { await updateEvent(id, payload); toast.success('已更新') }
      else { await createEvent(payload); toast.success('已新增') }
      navigate('/events')
    } catch (err) {
      toast.error(err.response?.data?.error || '儲存失敗')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-20 text-slate-400">載入中…</div>

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={15} /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{isEdit ? '編輯事件' : '新增事件'}</h1>
            <p className="text-sm text-slate-500 mt-0.5">勒索事件或資安事件紀錄</p>
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          <Save size={15} />{saving ? '儲存中…' : '儲存'}
        </button>
      </div>

      {/* Duplicate Warning */}
      {dupWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">偵測到疑似重複事件</p>
            <p className="text-xs text-amber-600 mt-1">
              已存在相似事件：「{dupWarning.victim_name}」（{dupWarning.event_date}，{dupWarning.ransomware_group}），
              與目前輸入資料高度相似，請確認是否為重複紀錄。仍可繼續儲存。
            </p>
          </div>
        </div>
      )}

      <div className="card space-y-0">
        <SectionTitle>基本資訊</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="事件日期" required>
            <input type="date" className="form-input" value={form.event_date}
              onChange={e => handleDateChange(e.target.value)} onBlur={checkDuplicate} required />
          </Field>
          <Field label="週別（自動）">
            <input className="form-input bg-slate-50 text-slate-500" readOnly value={form.report_week} placeholder="選擇事件日期後自動產生" />
          </Field>
          <Field label="月份（自動）">
            <input className="form-input bg-slate-50 text-slate-500" readOnly value={form.report_month} placeholder="選擇事件日期後自動產生" />
          </Field>
          <Field label="消息來源發布日期">
            <input type="date" className="form-input" value={form.source_publish_date} onChange={e => set('source_publish_date', e.target.value)} />
          </Field>
          <Field label="首次觀測日期">
            <input type="date" className="form-input" value={form.first_observed_date} onChange={e => set('first_observed_date', e.target.value)} />
          </Field>
        </div>

        <SectionTitle>受害者資訊</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="受害者名稱" required>
            <input className="form-input" placeholder="例：台灣某製造公司" value={form.victim_name}
              onChange={e => set('victim_name', e.target.value)} onBlur={checkDuplicate} required />
          </Field>
          <Field label="受害者網域">
            <input className="form-input" placeholder="例：example.com.tw" value={form.victim_domain}
              onChange={e => handleDomainChange(e.target.value)} onBlur={checkDuplicate} />
          </Field>
          <Field label="國家／地區">
            <input className="form-input" placeholder="例：台灣" value={form.country} onChange={e => set('country', e.target.value)} />
          </Field>
          <Field label="受害者類型">
            <select className="form-select" value={form.victim_category} onChange={e => set('victim_category', e.target.value)}>
              {VICTIM_CATEGORIES.map(v => <option key={v}>{v}</option>)}
            </select>
            {form.victim_category === '其他' && (
              <input className="form-input mt-2" placeholder="請說明其他類型…" value={form.victim_category_other} onChange={e => set('victim_category_other', e.target.value)} />
            )}
          </Field>
          <Field label="機關類型（政府或公共單位適用）">
            <select className="form-select" value={form.agency_type} onChange={e => set('agency_type', e.target.value)}>
              <option value="">（不適用）</option>
              {AGENCY_TYPES.map(v => <option key={v}>{v}</option>)}
            </select>
            {form.agency_type === '其他' && (
              <input className="form-input mt-2" placeholder="請說明其他機關類型…" value={form.agency_type_other} onChange={e => set('agency_type_other', e.target.value)} />
            )}
          </Field>
          <Field label="產業類別">
            <select className="form-select" value={form.industry} onChange={e => set('industry', e.target.value)}>
              <option value="">請選擇</option>
              {INDUSTRIES.map(v => <option key={v}>{v}</option>)}
            </select>
            {form.industry === '其他' && (
              <input className="form-input mt-2" placeholder="請說明其他產業類別…" value={form.industry_other} onChange={e => set('industry_other', e.target.value)} />
            )}
          </Field>
          <Field label="子產業">
            <input className="form-input" placeholder="例：半導體封裝、電子零組件" value={form.sub_industry} onChange={e => set('sub_industry', e.target.value)} />
          </Field>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="is_taiwan" className="w-4 h-4 rounded accent-blue-600"
              checked={form.is_taiwan} onChange={e => set('is_taiwan', e.target.checked)} />
            <label htmlFor="is_taiwan" className="text-sm font-medium text-slate-700">🇹🇼 是否為台灣受害者</label>
          </div>
        </div>

        <SectionTitle>攻擊資訊</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="勒索組織">
            <input className="form-input" placeholder="例：Qilin、Unknown" value={form.ransomware_group}
              onChange={e => set('ransomware_group', e.target.value)} onBlur={checkDuplicate} />
          </Field>
          <Field label="事件類型">
            <select className="form-select" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
              <option value="">請選擇</option>
              {EVENT_TYPES.map(v => <option key={v}>{v}</option>)}
            </select>
            {form.event_type === '其他' && (
              <input className="form-input mt-2" placeholder="請說明其他事件類型…" value={form.event_type_other} onChange={e => set('event_type_other', e.target.value)} />
            )}
          </Field>
          <Field label="消息來源" required>
            <select className="form-select" value={form.source_name} onChange={e => set('source_name', e.target.value)}>
              {SOURCE_NAMES.map(v => <option key={v}>{v}</option>)}
            </select>
            {form.source_name === '其他' && (
              <input className="form-input mt-2" placeholder="請說明其他消息來源…" value={form.source_name_other} onChange={e => set('source_name_other', e.target.value)} />
            )}
          </Field>
          <Field label="來源連結">
            <input type="url" className="form-input" placeholder="https://" value={form.source_url} onChange={e => set('source_url', e.target.value)} />
          </Field>
        </div>

        <SectionTitle>狀態評估</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Field label="外洩狀態">
            <select className="form-select" value={form.leak_status} onChange={e => set('leak_status', e.target.value)}>
              <option value="">請選擇</option>
              {LEAK_STATUSES.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="公開揭露狀態">
            <select className="form-select" value={form.public_disclosure_status} onChange={e => set('public_disclosure_status', e.target.value)}>
              <option value="">請選擇</option>
              {DISCLOSURE_STATUSES.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="影響程度">
            <select className="form-select" value={form.impact_level} onChange={e => set('impact_level', e.target.value)}>
              {IMPACT_LEVELS.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="可信度">
            <select className="form-select" value={form.confidence_level} onChange={e => set('confidence_level', e.target.value)}>
              {CONFIDENCE_LEVELS.map(v => <option key={v}>{v}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="標籤（逗號分隔）">
            <input className="form-input" placeholder="例：台灣,高風險,製造業" value={form.tags} onChange={e => set('tags', e.target.value)} />
          </Field>
          <div className="flex items-center gap-6 pt-5">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="include_in_report" className="w-4 h-4 rounded accent-green-600"
                checked={form.include_in_report} onChange={e => set('include_in_report', e.target.checked)} />
              <label htmlFor="include_in_report" className="text-sm font-medium text-slate-700">納入週報</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="need_follow_up" className="w-4 h-4 rounded accent-orange-500"
                checked={form.need_follow_up} onChange={e => set('need_follow_up', e.target.checked)} />
              <label htmlFor="need_follow_up" className="text-sm font-medium text-slate-700">需追蹤</label>
            </div>
          </div>
        </div>

        <SectionTitle>摘要與備註</SectionTitle>
        <div className="grid grid-cols-1 gap-4">
          <Field label="週報摘要">
            <textarea className="form-textarea min-h-[100px]" placeholder="請填寫供週報使用的中文事件摘要…"
              value={form.summary} onChange={e => set('summary', e.target.value)} />
          </Field>
          <Field label="備註">
            <textarea className="form-textarea min-h-[60px]" placeholder="內部備註（不對外）…"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>取消</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save size={15} />{saving ? '儲存中…' : '儲存事件'}
          </button>
        </div>
      </div>
    </form>
  )
}
