import React, { useState, useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ArticleView } from './components/ArticleView';
import { WaterfallView } from './components/WaterfallView';
import { AddFeedModal } from './components/AddFeedModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { ImportOpmlModal } from './components/ImportOpmlModal';
import { AIResultModal } from './components/AIResultModal';
import { AISettingsModal } from './components/AISettingsModal';
import Login from './components/Login';
import { useFeedStore } from './store/useFeedStore';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';

function App() {
  const [currentView, setCurrentView] = useState('article'); // 'article' or 'waterfall'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createFolderType, setCreateFolderType] = useState(null);
  const [isImportOpmlModalOpen, setIsImportOpmlModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { feeds, folders, loadFeeds, refreshAllFeeds, isLoading, selectedSource, selectSource } = useFeedStore();
  const { applyTheme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  // Initialize theme
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Load feeds from backend on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadFeeds();
    }
  }, [loadFeeds, isAuthenticated]);

  if (!isAuthenticated) {
    return <Login />;
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Toggle sidebar on '[' key press
      // Using e.code 'BracketLeft' to handle physical key position regardless of input method
      if (e.key === '[' || e.code === 'BracketLeft') {
        setIsSidebarOpen(prev => !prev);
      }

      // Switch to All Gallerys (Waterfall view)
      if (e.key === '1') {
        setCurrentView('waterfall');
        selectSource('all');
      }

      // Switch to All Articles (Article view)
      if (e.key === '2') {
        setCurrentView('article');
        selectSource('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectSource]);

  const currentFeeds = feeds.filter(f => {
    // First filter by viewType
    if (f.viewType !== currentView) return false;

    // Then filter by selectedSource
    if (selectedSource.type === 'all') return true;
    if (selectedSource.type === 'folder') {
      return f.folderId && f.folderId === selectedSource.id;
    }
    if (selectedSource.type === 'feed') return f.id === selectedSource.id;

    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isSidebarOpen ? 'w-[240px] opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="w-[240px]">
          <Sidebar
            currentView={currentView}
            setCurrentView={setCurrentView}
            onAddFeed={() => setIsAddModalOpen(true)}
            onCreateFolder={(type) => {
              setCreateFolderType(type);
              setIsCreateFolderModalOpen(true);
            }}
            onImportOpml={() => setIsImportOpmlModalOpen(true)}
          />
        </div>
      </div>

      <main className="flex-1 flex flex-col h-screen relative">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 left-4 z-50 p-2 text-gray-500 hover:bg-gray-100 bg-white/80 backdrop-blur-sm rounded-lg transition-all duration-300 border border-gray-200 opacity-0 hover:opacity-100"
          title={isSidebarOpen ? "Close Sidebar ([)" : "Open Sidebar ([)"}
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 h-full overflow-y-auto">
          {currentView === 'article' ? (
            <ArticleView feeds={currentFeeds} />
          ) : (
            <WaterfallView feeds={currentFeeds} />
          )}
        </div>
      </main>

      <AddFeedModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        type={createFolderType}
      />

      <ImportOpmlModal
        isOpen={isImportOpmlModalOpen}
        onClose={() => setIsImportOpmlModalOpen(false)}
      />

      <AIResultModal />
      <AISettingsModal />
    </div>
  );
}

export default App;
