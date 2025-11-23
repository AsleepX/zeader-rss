import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleView } from './components/ArticleView';
import { WaterfallView } from './components/WaterfallView';
import { AddFeedModal } from './components/AddFeedModal';
import { CreateFolderModal } from './components/CreateFolderModal';
import { ImportOpmlModal } from './components/ImportOpmlModal';
import { useFeedStore } from './store/useFeedStore';

function App() {
  const [currentView, setCurrentView] = useState('article'); // 'article' or 'waterfall'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [createFolderType, setCreateFolderType] = useState(null);
  const [isImportOpmlModalOpen, setIsImportOpmlModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { feeds, folders, loadFeeds, refreshAllFeeds, isLoading, selectedSource } = useFeedStore();

  // Load feeds from backend on mount
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  // Handle sidebar toggle shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle sidebar on '[' key press
      // Using e.code 'BracketLeft' to handle physical key position regardless of input method
      if (e.key === '[' || e.code === 'BracketLeft') {
        setIsSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentFeeds = feeds.filter(f => {
    // First filter by viewType
    if (f.viewType !== currentView) return false;

    // Then filter by selectedSource
    if (selectedSource.type === 'all') return true;
    if (selectedSource.type === 'folder') return f.folderId === selectedSource.id;
    if (selectedSource.type === 'feed') return f.id === selectedSource.id;
    
    return true;
  });

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isSidebarOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="w-[280px]">
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

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="flex-1 overflow-y-auto scroll-smooth">
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
    </div>
  );
}

export default App;
