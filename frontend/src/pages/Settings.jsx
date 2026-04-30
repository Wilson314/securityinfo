import { useState, useEffect } from 'react'
import { Settings2, Link2, Upload, Download, RefreshCw, CheckCircle, XCircle, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { googleExport, googleImport, googleTest } from '../lib/api'

const STORAGE_KEY = 'gas_web_app_url'

export default function Settings() {
  const [gasUrl, setGasUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [importConfirm, setImportConfirm] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || ''
    setGasUrl(saved)
  }, [])

  const saveUrl = () => {
    localStorage.setItem(STORAGE_KEY, gasUrl)
    toast.success('URL 已儲存')
  }

  const handleTest = async () => {
    if (!gasUrl) return toast.error('請先輸入 Apps Script Web App URL')
    setTesting(true); setTestResult(null)
    try {
      await googleTest(gasUrl)
      setTestResult('success')
      toast.success('連線測試成功')
    } catch (e) {
      setTestResult('error')
      toast.error(e.response?.data?.error || '連線失敗')
    } finally { setTesting(false) }
  }

  const handleExport = async () => {
    if (!gasUrl) return toast.error('請先設定 Apps Script Web App URL')
    setExporting(true)
    try {
      const res = await googleExport(gasUrl)
      toast.success(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.error || '匯出失敗')
    } finally { setExporting(false) }
  }

  const handleImport = async () => {
    if (!gasUrl) return toast.error('請先設定 Apps Script Web App URL')
    setImportConfirm(false)
    setImporting(true)
    try {
      const res = await googleImport(gasUrl)
      toast.success(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.error || '匯入失敗')
    } finally { setImporting(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">系統設定</h1>
        <p className="text-sm text-slate-500 mt-0.5">Google Sheets 串接與資料管理</p>
      </div>

      {/* Google Sheets Section */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
            <Settings2 size={16} className="text-green-600" />
          </div>
          <h2 className="font-semibold text-slate-800">Google Sheets 串接設定</h2>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800 space-y-1">
          <p className="font-medium">設定說明</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>開啟 Google Sheets，點選「擴充功能」→「Apps Script」</li>
            <li>將 <code className="bg-blue-100 px-1 rounded">docs/google-apps-script.js</code> 的內容貼入編輯器</li>
            <li>點選「部署」→「新增部署」→「類型：網頁應用程式」</li>
            <li>執行者：我、存取權限：所有人，取得 Web App URL</li>
            <li>將 URL 貼入下方欄位並儲存</li>
          </ol>
        </div>

        <div>
          <label className="form-label">Google Apps Script Web App URL</label>
          <div className="flex gap-2">
            <input className="form-input flex-1" placeholder="https://script.google.com/macros/s/…/exec"
              value={gasUrl} onChange={e => setGasUrl(e.target.value)} />
            <button className="btn-primary flex-shrink-0" onClick={saveUrl}><Save size={14} />儲存</button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={handleTest} disabled={testing}>
            {testing ? <RefreshCw size={14} className="animate-spin" /> : <Link2 size={14} />}
            {testing ? '測試中…' : '測試連線'}
          </button>
          {testResult === 'success' && (
            <span className="flex items-center gap-1.5 text-green-600 text-sm"><CheckCircle size={14} />連線成功</span>
          )}
          {testResult === 'error' && (
            <span className="flex items-center gap-1.5 text-red-500 text-sm"><XCircle size={14} />連線失敗</span>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={handleExport} disabled={exporting}>
            <Upload size={15} />
            {exporting ? '匯出中…' : '匯出到 Google Sheets'}
          </button>
          <button className="btn-secondary" onClick={() => setImportConfirm(true)} disabled={importing}>
            <Download size={15} />
            {importing ? '匯入中…' : '從 Google Sheets 匯入'}
          </button>
        </div>
      </div>

      {/* Import Confirm Modal */}
      {importConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setImportConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-slate-800 mb-2">確認從 Google Sheets 匯入</h3>
            <p className="text-sm text-slate-600 mb-4">
              將從 Google Sheets 讀取資料並匯入本地資料庫。<br />
              若 ID 已存在則更新，不存在則新增。確定要繼續嗎？
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setImportConfirm(false)}>取消</button>
              <button className="btn-primary" onClick={handleImport}>確認匯入</button>
            </div>
          </div>
        </div>
      )}

      {/* Info card */}
      <div className="card bg-slate-50 border-slate-200">
        <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Settings2 size={16} />系統資訊</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex justify-between"><span>前端版本</span><span className="font-mono">v1.0.0</span></div>
          <div className="flex justify-between"><span>後端 API</span><span className="font-mono text-green-600">http://localhost:3001</span></div>
          <div className="flex justify-between"><span>資料庫</span><span className="font-mono">SQLite (backend/data/security_report.db)</span></div>
        </div>
      </div>
    </div>
  )
}
