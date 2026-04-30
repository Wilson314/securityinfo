import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-screen-2xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
