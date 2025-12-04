import React, { useState, useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ArticleView } from './components/ArticleView';
import { PhotoView } from './components/PhotoView';
import { VideoView } from './components/VideoView';
import { AddFeedModal } from './components/AddFeedModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { ImportOpmlModal } from './components/ImportOpmlModal';
import { AIResultModal } from './components/AIResultModal';
import { AISettingsModal } from './components/AISettingsModal';
import { BottomNavigation } from './components/mobile/BottomNavigation';
import { BottomSheet } from './components/mobile/BottomSheet';
import { MobileSettingsSheet } from './components/mobile/MobileSettingsSheet';
import { CleanupConfirmModal } from './components/CleanupConfirmModal';
import Login from './components/Login';
import { useFeedStore } from './store/useFeedStore';
import { useThemeStore } from './store/useThemeStore';
import { useAuthStore } from './store/useAuthStore';
import { useAIStore } from './store/useAIStore';
import { api } from './utils/api';

function App() {
  // Load saved view from sessionStorage, default to 'article'
  // sessionStorage persists across page refresh but clears when tab is closed
  const [currentView, setCurrentView] = useState(() => {
    const saved = sessionStorage.getItem('zeader-current-view');
    return saved && ['article', 'photo', 'video'].includes(saved) ? saved : 'article';
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createFolderType, setCreateFolderType] = useState(null);
  const [isImportOpmlModalOpen, setIsImportOpmlModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Mobile State
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetViewType, setBottomSheetViewType] = useState('article');

  // Cleanup State
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const { feeds, folders, loadFeeds, refreshAllFeeds, isLoading, selectedSource, selectSource } = useFeedStore();
  const { applyTheme } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  // Initialize theme
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Persist currentView to sessionStorage (survives refresh, clears on tab close)
  useEffect(() => {
    sessionStorage.setItem('zeader-current-view', currentView);
  }, [currentView]);

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

      // Switch to All Articles (Article view)
      if (e.key === '1') {
        setCurrentView('article');
        selectSource('all');
      }

      // Switch to All Photos (Photo view)
      if (e.key === '2') {
        setCurrentView('photo');
        selectSource('all');
      }

      // Switch to All Videos (Video view)
      if (e.key === '3') {
        setCurrentView('video');
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

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const result = await api.cleanup(30);
      alert(`Cleanup complete. Removed ${result.removedCount} old items.`);
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Failed to cleanup items');
    } finally {
      setIsCleaning(false);
      setShowCleanupConfirm(false);
    }
  };

  const handleExportOpml = () => {
    const escapeXml = (unsafe) => {
      if (!unsafe) return '';
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
        }
      });
    };

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0" xmlns:zeader="http://zeader.com/spec">\n<head>\n<title>Zeader Feeds Export</title>\n</head>\n<body>\n';
    const xmlFooter = '</body>\n</opml>';

    let bodyContent = '';

    // Process folders
    folders.forEach(folder => {
      const folderFeeds = feeds.filter(f => f.folderId === folder.id);
      // Always export folder if it exists, even if empty, to preserve structure
      const viewTypeAttr = folder.viewType ? ` zeader:viewType="${escapeXml(folder.viewType)}"` : '';

      bodyContent += `  <outline text="${escapeXml(folder.name)}" title="${escapeXml(folder.name)}"${viewTypeAttr}>\n`;

      folderFeeds.forEach(feed => {
        const feedViewTypeAttr = feed.viewType ? ` zeader:viewType="${escapeXml(feed.viewType)}"` : '';
        const loadFullContentAttr = feed.loadFullContent !== undefined ? ` zeader:loadFullContent="${feed.loadFullContent}"` : '';

        bodyContent += `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl=""${feedViewTypeAttr}${loadFullContentAttr}/>\n`;
      });
      bodyContent += `  </outline>\n`;
    });

    // Process ungrouped feeds
    const ungroupedFeeds = feeds.filter(f => !f.folderId);
    ungroupedFeeds.forEach(feed => {
      const feedViewTypeAttr = feed.viewType ? ` zeader:viewType="${escapeXml(feed.viewType)}"` : '';
      const loadFullContentAttr = feed.loadFullContent !== undefined ? ` zeader:loadFullContent="${feed.loadFullContent}"` : '';

      bodyContent += `  <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl=""${feedViewTypeAttr}${loadFullContentAttr}/>\n`;
    });

    const opmlContent = xmlHeader + bodyContent + xmlFooter;

    const blob = new Blob([opmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zeader_export.opml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 hidden md:block ${isSidebarOpen ? 'w-[240px] opacity-100' : 'w-0 opacity-0'}`}
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
            onExportOpml={handleExportOpml}
            onCleanup={() => setShowCleanupConfirm(true)}
          />
        </div>
      </div>

      <main className="flex-1 flex flex-col h-screen relative min-w-0 overflow-x-hidden bg-white">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden md:block absolute top-4 left-4 z-50 p-2 text-gray-500 hover:bg-gray-100 bg-white/80 backdrop-blur-sm rounded-lg transition-all duration-300 border border-gray-200 opacity-0 hover:opacity-100"
          title={isSidebarOpen ? "Close Sidebar ([)" : "Open Sidebar ([)"}
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 h-full overflow-y-auto pb-20 md:pb-0">
          {currentView === 'article' ? (
            <ArticleView key={`article-${selectedSource.type}-${selectedSource.id}`} feeds={currentFeeds} />
          ) : currentView === 'video' ? (
            <VideoView key={`video-${selectedSource.type}-${selectedSource.id}`} feeds={currentFeeds} />
          ) : (
            <PhotoView key={`photo-${selectedSource.type}-${selectedSource.id}`} feeds={currentFeeds} />
          )}
        </div>
      </main>

      {/* Mobile Components */}
      <div className="md:hidden">
        <BottomNavigation
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenSettings={() => setIsMobileSettingsOpen(true)}
          onLongPressView={(viewType) => {
            setBottomSheetViewType(viewType);
            setIsBottomSheetOpen(true);
          }}
        />

        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          viewType={bottomSheetViewType}
          title={bottomSheetViewType === 'article' ? 'Articles' : bottomSheetViewType === 'photo' ? 'Photos' : 'Videos'}
          setCurrentView={setCurrentView}
        />

        <MobileSettingsSheet
          isOpen={isMobileSettingsOpen}
          onClose={() => setIsMobileSettingsOpen(false)}
          onAddFeed={() => setIsAddModalOpen(true)}
          onImportOpml={() => setIsImportOpmlModalOpen(true)}
          onExportOpml={handleExportOpml}
          onCleanup={() => setShowCleanupConfirm(true)}
          onConfigureAI={() => useAIStore.getState().openAISettings()}
        />
      </div>

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

      <CleanupConfirmModal
        isOpen={showCleanupConfirm}
        onClose={() => setShowCleanupConfirm(false)}
        onConfirm={handleCleanup}
        isCleaning={isCleaning}
      />

      <AIResultModal />
      <AISettingsModal />
    </div>
  );
}

export default App;
