import React from 'react'
import { Search, Home, Library, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { SyncStatus } from '../services/SyncManagerService'

interface SidebarProps {
  activeTab: 'search' | 'home' | 'library' | 'settings'
  setActiveTab: (tab: 'search' | 'home' | 'library' | 'settings') => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  syncStatus: SyncStatus
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  syncStatus
}) => {
  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#101016] flex flex-col border-r border-white/5 transition-all duration-300 relative z-20 select-none`}
    >
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center space-x-3 overflow-hidden">
          <img
            src="/logo.png"
            alt="Puki Logo"
            className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-orange-500/20 flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-base tracking-wide flex items-center space-x-1">
                <span>Puki</span>
                <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">Music</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-mono tracking-wider">WINDOWS DESKTOP</p>
            </div>
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition flex-shrink-0"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        <button
          onClick={() => setActiveTab('search')}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
          } py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'search'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Pencarian</span>}
        </button>

        <button
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
          } py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'home'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Beranda</span>}
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
          } py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'library'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Library className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Koleksi & Sync</span>}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3.5'
          } py-2.5 rounded-xl text-sm font-medium transition ${
            activeTab === 'settings'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span>Pengaturan</span>}
        </button>
      </nav>

      <div className="p-3 m-3 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              syncStatus.state === 'SYNCED'
                ? 'bg-emerald-500 animate-pulse'
                : syncStatus.state === 'CONNECTING'
                ? 'bg-amber-500 animate-ping'
                : syncStatus.state === 'ERROR'
                ? 'bg-rose-500'
                : 'bg-zinc-600'
            }`}
          />
          {!isCollapsed && (
            <span className="text-xs font-medium text-zinc-300 truncate">
              {syncStatus.state === 'SYNCED'
                ? 'Sync Terhubung'
                : syncStatus.state === 'CONNECTING'
                ? 'Menghubungkan...'
                : syncStatus.state === 'ERROR'
                ? 'Sync Error'
                : 'Sync Nonaktif'}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <p className="text-[10px] text-zinc-500 mt-1 truncate">E2EE Zero-Knowledge Relay</p>
        )}
      </div>
    </aside>
  )
}
