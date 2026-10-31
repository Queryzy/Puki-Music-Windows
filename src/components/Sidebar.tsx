import React from 'react'
import { Search, Home, Library, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { SyncStatus } from '../services/SyncManagerService'
import { PUKI_LOGO_BASE64 } from '../assets/logo'

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
        isCollapsed ? 'w-16' : 'w-60'
      } bg-[#101016] flex flex-col border-r border-white/5 transition-all duration-300 relative z-20 select-none flex-shrink-0`}
    >
      <div className="p-3 flex items-center justify-between border-b border-white/5 min-h-[64px]">
        {isCollapsed ? (
          <div className="w-full flex flex-col items-center space-y-2">
            <img
              src={PUKI_LOGO_BASE64}
              alt="Puki Logo"
              className="w-8 h-8 rounded-xl object-contain shadow-md shadow-orange-500/20"
            />
            <button
              onClick={() => setIsCollapsed(false)}
              title="Perluas Sidebar"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3 overflow-hidden">
              <img
                src={PUKI_LOGO_BASE64}
                alt="Puki Logo"
                className="w-9 h-9 rounded-xl object-contain shadow-lg shadow-orange-500/20 flex-shrink-0"
              />
              <div className="min-w-0">
                <h1 className="font-bold text-base tracking-wide flex items-center space-x-1">
                  <span>Puki</span>
                  <span className="bg-gradient-to-r from-orange-500 to-amber-400 bg-clip-text text-transparent">Music</span>
                </h1>
                <p className="text-[10px] text-zinc-400 font-mono tracking-wider">WINDOWS DESKTOP</p>
              </div>
            </div>

            <button
              onClick={() => setIsCollapsed(true)}
              title="Kecilkan Sidebar"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1.5">
        <button
          onClick={() => setActiveTab('search')}
          title={isCollapsed ? 'Pencarian' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'
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
          title={isCollapsed ? 'Beranda' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'
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
          title={isCollapsed ? 'Koleksi & Sync' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'
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
          title={isCollapsed ? 'Pengaturan' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-0' : 'space-x-3 px-3'
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

      <div
        className={`${
          isCollapsed ? 'p-2 mx-2' : 'p-3 m-3'
        } rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col items-center`}
      >
        <div className="flex items-center space-x-2">
          <span
            title={
              syncStatus.state === 'SYNCED'
                ? 'Sync Terhubung'
                : syncStatus.state === 'CONNECTING'
                ? 'Menghubungkan...'
                : syncStatus.state === 'ERROR'
                ? 'Sync Error'
                : 'Sync Nonaktif'
            }
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
