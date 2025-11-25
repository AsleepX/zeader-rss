import React, { useState, useEffect } from 'react';
import { Layout, Grid, Plus, Trash2, Rss, Image, BookOpen, Settings, Folder, FolderOpen, MoreVertical, Upload, RefreshCw, Download, Edit, Check, Circle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore } from '../store/useFeedStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAIStore } from '../store/useAIStore';
import clsx from 'clsx';
import { DndContext, useDraggable, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

// Draggable Feed Component
const DraggableFeed = ({ feed, onRemove, isSelected, onClick, onContextMenu }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: feed.id,
    data: { feed }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={clsx(
        "group flex items-center justify-between px-3.5 py-2 rounded-lg transition-colors cursor-grab active:cursor-grabbing touch-none",
        isDragging ? "opacity-30" : "",
        isSelected ? "bg-primary-50 text-primary-600" : "hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={clsx("w-1 h-1 rounded-full transition-colors", isSelected ? "bg-primary-400" : "bg-primary-400 group-hover:bg-primary-400")} />
        <span className={clsx("text-sm truncate", isSelected ? "text-primary-900 font-medium" : "text-gray-600 group-hover:text-gray-900")}>{feed.title}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(feed.id); }}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// Draggable & Droppable Folder Component
const FolderItem = ({ folder, isExpanded, toggleFolder, onDelete, children, isSelected, onSelect, onContextMenu }) => {
  const draggable = useDraggable({
    id: `folder-drag-${folder.id}`,
    data: { folder, type: 'folder' }
  });

  const droppable = useDroppable({
    id: `folder-${folder.id}`,
    data: { folder, type: 'folder' }
  });

  const { setNodeRef: setDraggableRef, listeners, attributes, transform, isDragging } = draggable;
  const { setNodeRef: setDroppableRef, isOver } = droppable;

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 999 : 'auto',
    position: 'relative'
  } : undefined;

  return (
    <div
      ref={setDraggableRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx("touch-none", isDragging && "opacity-30")}
    >
      <div
        ref={setDroppableRef}
        className={clsx("rounded-lg transition-colors", isOver && "bg-primary-50 ring-1 ring-primary-200")}
      >
        <div
          className={clsx(
            "group flex items-center justify-between px-4 py-2 rounded-lg cursor-pointer transition-colors",
            isSelected ? "bg-primary-50 text-primary-600" : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(folder.id);
          }}
          onContextMenu={onContextMenu}
        >
          <div className="flex items-center gap-2">
            <div
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
              className="cursor-pointer hover:opacity-60 transition-opacity"
            >
              {isExpanded ? <FolderOpen className="w-4 h-4 text-primary-500" /> : <Folder className="w-4 h-4 text-primary-500" />}
            </div>
            <span className="text-sm font-medium">{folder.name}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {isExpanded && (
          <div className="ml-2 border-l-2 border-gray-100 pl-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

// Section Droppable Area
const SectionDroppable = ({ id, title, count, children, onContextMenu, isActive, onClick, icon: Icon }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: { type: 'section', viewType: id === 'section-gallery' ? 'waterfall' : 'article' }
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx("mt-6 rounded-lg transition-colors p-2 -mx-2", isOver && "bg-primary-50/50 ring-1 ring-primary-100")}
      onContextMenu={onContextMenu}
    >
      <button
        onClick={onClick}
        className={clsx(
          "w-full flex items-center justify-between px-2 py-2 rounded-lg transition-all duration-200 mb-2 group focus:outline-none",
          isActive
            ? "bg-primary-50 text-primary-600"
            : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
        )}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={clsx("w-4 h-4", isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-500")} />}
          <span className={clsx("text-sm font-medium", isActive ? "text-primary-900" : "")}>{title}</span>
        </div>
        <span className={clsx("text-xs", isActive ? "text-primary-400" : "text-gray-300")}>{count}</span>
      </button>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

// Root Droppable Area
const RootDroppable = ({ children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root',
  });

  return (
    <div ref={setNodeRef} className={clsx("flex-1 overflow-y-auto px-4 space-y-8 pb-20", isOver && "bg-gray-50/50")}>
      {children}
    </div>
  );
}



const FeedList = ({ items, onRemove, selectedSource, onSelectFeed, onContextMenu }) => (
  <div className="space-y-1 mt-1 px-2">
    {items.map(feed => (
      <DraggableFeed
        key={feed.id}
        feed={feed}
        onRemove={onRemove}
        isSelected={selectedSource?.type === 'feed' && selectedSource?.id === feed.id}
        onClick={() => onSelectFeed(feed.id)}
        onContextMenu={(e) => onContextMenu && onContextMenu(e, feed)}
      />
    ))}
  </div>
);

export function Sidebar({ currentView, setCurrentView, onAddFeed, onCreateFolder, onImportOpml }) {
  const { feeds, folders, removeFeed, deleteFolder, moveFeed, updateFeedViewType, updateFolderViewType, selectedSource, selectSource, refreshAllFeeds, isLoading, renameFolder, renameFeed, showUnreadOnly, toggleShowUnreadOnly, markCurrentViewAsRead, toggleFeedFullContent, toggleFolderFullContent } = useFeedStore();
  const { themeColor, setThemeColor } = useThemeStore();
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDragFeed, setActiveDragFeed] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const response = await fetch('http://localhost:3001/api/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: 30 }),
      });
      const result = await response.json();
      if (result.success) {
        alert(`Cleanup complete. Removed ${result.removedCount} old items.`);
      } else {
        alert('Cleanup failed: ' + result.error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Failed to cleanup items');
    } finally {
      setIsCleaning(false);
      setShowCleanupConfirm(false);
    }
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e, type, id = null, name = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id,
      name
    });
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

    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n<head>\n<title>Zeader Feeds Export</title>\n</head>\n<body>\n';
    const xmlFooter = '</body>\n</opml>';

    let bodyContent = '';

    // Process folders
    folders.forEach(folder => {
      const folderFeeds = feeds.filter(f => f.folderId === folder.id);
      if (folderFeeds.length > 0) {
        bodyContent += `  <outline text="${escapeXml(folder.name)}" title="${escapeXml(folder.name)}">\n`;
        folderFeeds.forEach(feed => {
          bodyContent += `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl=""/>\n`;
        });
        bodyContent += `  </outline>\n`;
      }
    });

    // Process ungrouped feeds
    const ungroupedFeeds = feeds.filter(f => !f.folderId);
    ungroupedFeeds.forEach(feed => {
      bodyContent += `  <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl=""/>\n`;
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
    setIsSettingsOpen(false);
  };

  let pageTitle = currentView === 'waterfall' ? 'Gallery' : 'Articles';
  if (selectedSource.type === 'folder') {
    const folder = folders.find(f => f.id === selectedSource.id);
    if (folder) pageTitle = folder.name;
  } else if (selectedSource.type === 'feed') {
    const feed = feeds.find(f => f.id === selectedSource.id);
    if (feed) pageTitle = feed.title;
  } else {
    pageTitle = currentView === 'waterfall' ? 'All Gallerys' : 'All Articles';
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event) => {
    setActiveDragFeed(event.active.data.current?.feed);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragFeed(null);

    if (!over) return;

    const activeId = active.id;
    const targetId = over.id;
    const activeType = active.data.current?.type || (active.data.current?.feed ? 'feed' : 'folder');

    // Handle Feed Dragging
    if (activeType === 'feed' || active.data.current?.feed) {
      const feedId = activeId;
      const feed = feeds.find(f => f.id === feedId);
      if (!feed) return;

      if (targetId === 'root') {
        if (feed.folderId) moveFeed(feedId, null);
      } else if (targetId.startsWith('folder-') && !targetId.startsWith('folder-drag-')) {
        const folderId = targetId.replace('folder-', '');
        if (feed.folderId !== folderId) moveFeed(feedId, folderId);
      } else if (targetId === 'section-gallery') {
        if (feed.folderId) moveFeed(feedId, null);
        if (feed.viewType !== 'waterfall') updateFeedViewType(feedId, 'waterfall');
      } else if (targetId === 'section-article') {
        if (feed.folderId) moveFeed(feedId, null);
        if (feed.viewType !== 'article') updateFeedViewType(feedId, 'article');
      }
    }

    // Handle Folder Dragging
    if (activeType === 'folder') {
      const folderId = activeId.replace('folder-drag-', '');

      let targetViewType = null;

      if (targetId === 'section-gallery') {
        targetViewType = 'waterfall';
      } else if (targetId === 'section-article') {
        targetViewType = 'article';
      } else if (targetId.startsWith('folder-') && !targetId.startsWith('folder-drag-')) {
        // Dragged over another folder
        const targetFolderId = targetId.replace('folder-', '');
        const targetFolder = folders.find(f => f.id === targetFolderId);
        if (targetFolder) {
          const type = getFolderType(targetFolder);
          if (type === 'waterfall') targetViewType = 'waterfall';
          if (type === 'article') targetViewType = 'article';
        }
      }

      if (targetViewType) {
        updateFolderViewType(folderId, targetViewType);
      }
    }
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Group feeds
  const ungroupedFeeds = feeds.filter(f => !f.folderId);
  const ungroupedArticleFeeds = ungroupedFeeds.filter(f => f.viewType === 'article');
  const ungroupedWaterfallFeeds = ungroupedFeeds.filter(f => f.viewType === 'waterfall');

  // Group folders
  const getFolderType = (folder) => {
    if (folder.viewType) return folder.viewType;

    const folderFeeds = feeds.filter(f => f.folderId === folder.id);
    if (folderFeeds.length === 0) return 'empty';
    const hasWaterfall = folderFeeds.some(f => f.viewType === 'waterfall');
    const hasArticle = folderFeeds.some(f => f.viewType === 'article');

    if (hasWaterfall && !hasArticle) return 'waterfall';
    if (!hasWaterfall && hasArticle) return 'article';
    return 'mixed';
  };

  const galleryFolders = folders.filter(f => getFolderType(f) === 'waterfall');
  const articleFolders = folders.filter(f => getFolderType(f) === 'article');
  const otherFolders = folders.filter(f => ['mixed', 'empty'].includes(getFolderType(f)));

  const renderFolder = (folder) => {
    const isExpanded = expandedFolders[folder.id];
    const folderFeeds = feeds.filter(f => f.folderId === folder.id);

    return (
      <div key={folder.id}>
        <FolderItem
          folder={folder}
          isExpanded={isExpanded}
          toggleFolder={toggleFolder}
          onDelete={deleteFolder}
          isSelected={selectedSource.type === 'folder' && selectedSource.id === folder.id}
          onSelect={() => {
            const type = getFolderType(folder);
            if (type === 'waterfall') setCurrentView('waterfall');
            if (type === 'article') setCurrentView('article');
            selectSource('folder', folder.id);
          }}
          onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id, folder.name)}
        >
          {isExpanded && <FeedList
            items={folderFeeds}
            onRemove={removeFeed}
            selectedSource={selectedSource}
            onSelectFeed={(id) => {
              const feed = feeds.find(f => f.id === id);
              if (feed?.viewType === 'waterfall') setCurrentView('waterfall');
              if (feed?.viewType === 'article') setCurrentView('article');
              selectSource('feed', id);
            }}
            onContextMenu={(e, feed) => handleContextMenu(e, 'feed', feed.id, feed.title)}
          />}
        </FolderItem>
      </div>
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-[240px] h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0 font-sans relative">
        <div className="px-6 pt-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl text-gray-900 flex items-center gap-2 tracking-tight font-merriweather">
              Zeader
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleShowUnreadOnly}
                className={`p-2 rounded-full transition-all ${showUnreadOnly ? 'text-primary-600 bg-primary-50' : 'text-gray-400 hover:text-primary-600 hover:bg-primary-50'}`}
                title={showUnreadOnly ? "Show All" : "Show Unread Only"}
              >
                <Circle className={`w-4 h-4 ${showUnreadOnly ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={markCurrentViewAsRead}
                className="p-2 text-gray-400 hover:text-primary-600 rounded-full hover:bg-primary-50 transition-all group"
                title="Mark View as Read"
              >
                <div className="w-4 h-4 rounded-full border-[1.5px] border-current flex items-center justify-center">
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </div>
              </button>
              <button
                onClick={refreshAllFeeds}
                disabled={isLoading}
                className={`p-2 text-gray-400 hover:text-primary-600 rounded-full hover:bg-primary-50 transition-all ${isLoading ? 'animate-spin' : ''}`}
                title="Refresh Feeds"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider truncate px-1">
            {pageTitle}
          </h2>
        </div>

        <RootDroppable>
          {/* Gallery Section */}
          <SectionDroppable
            id="section-gallery"
            title="Gallery"
            count={galleryFolders.length + ungroupedWaterfallFeeds.length}
            onContextMenu={(e) => handleContextMenu(e, 'waterfall')}
            isActive={currentView === 'waterfall' && selectedSource.type === 'all'}
            onClick={() => { setCurrentView('waterfall'); selectSource('all'); }}
            icon={Image}
          >
            {galleryFolders.map(renderFolder)}
            <FeedList
              items={ungroupedWaterfallFeeds}
              onRemove={removeFeed}
              selectedSource={selectedSource}
              onSelectFeed={(id) => {
                setCurrentView('waterfall');
                selectSource('feed', id);
              }}
              onContextMenu={(e, feed) => handleContextMenu(e, 'feed', feed.id, feed.title)}
            />
          </SectionDroppable>

          {/* Article Section */}
          <SectionDroppable
            id="section-article"
            title="Article"
            count={articleFolders.length + ungroupedArticleFeeds.length}
            onContextMenu={(e) => handleContextMenu(e, 'article')}
            isActive={currentView === 'article' && selectedSource.type === 'all'}
            onClick={() => { setCurrentView('article'); selectSource('all'); }}
            icon={BookOpen}
          >
            {articleFolders.map(renderFolder)}
            <FeedList
              items={ungroupedArticleFeeds}
              onRemove={removeFeed}
              selectedSource={selectedSource}
              onSelectFeed={(id) => {
                setCurrentView('article');
                selectSource('feed', id);
              }}
              onContextMenu={(e, feed) => handleContextMenu(e, 'feed', feed.id, feed.title)}
            />
          </SectionDroppable>

          {/* Other Folders Section */}
          {otherFolders.length > 0 && (
            <div className="mt-6">
              <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Folders</div>
              <div className="space-y-1">
                {otherFolders.map(renderFolder)}
              </div>
            </div>
          )}
        </RootDroppable>

        {/* Settings Button & Menu */}
        <div className="p-4 border-t border-gray-50 bg-white absolute bottom-0 w-full">
          <div className="relative">
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      onAddFeed();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Feed
                  </button>
                  <button
                    onClick={() => {
                      onImportOpml();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors border-t border-gray-50"
                  >
                    <Upload className="w-4 h-4" />
                    Import OPML
                  </button>
                  <button
                    onClick={handleExportOpml}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors border-t border-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Export OPML
                  </button>
                  <button
                    onClick={() => {
                      setShowCleanupConfirm(true);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors border-t border-gray-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clean Up
                  </button>

                  <button
                    onClick={() => {
                      useAIStore.getState().openAISettings();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors border-t border-gray-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Configure Z's Soul
                  </button>

                  {/* Theme Color Picker */}
                  <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between group cursor-pointer hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Theme Color</span>
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-gray-200 cursor-pointer hover:scale-110 transition-transform shadow-sm ring-2 ring-white">
                      <input
                        type="color"
                        value={themeColor}
                        onChange={(e) => setThemeColor(e.target.value)}
                        className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={clsx(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-0 border",
                isSettingsOpen
                  ? "bg-gray-100 text-gray-900 border-transparent"
                  : "bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 border-gray-200"
              )}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span className="font-medium text-sm">Settings</span>
              </div>
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
      {createPortal(
        <DragOverlay>
          {activeDragFeed ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white shadow-lg border border-gray-100 w-[220px]">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-1 h-1 rounded-full bg-primary-400" />
                <span className="text-sm truncate text-gray-900 font-medium">{activeDragFeed.title}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}

      {/* Context Menu */}
      {contextMenu && createPortal(
        <div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {(contextMenu.type === 'waterfall' || contextMenu.type === 'article') && (
            <button
              onClick={() => {
                onCreateFolder(contextMenu.type);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors text-left"
            >
              <Folder className="w-4 h-4" />
              New Folder
            </button>
          )}

          {(contextMenu.type === 'folder' || contextMenu.type === 'feed') && (
            <button
              onClick={() => {
                const newName = window.prompt(`Rename ${contextMenu.type}`, contextMenu.name);
                if (newName && newName.trim() !== '') {
                  if (contextMenu.type === 'folder') {
                    renameFolder(contextMenu.id, newName.trim());
                  } else {
                    renameFeed(contextMenu.id, newName.trim());
                  }
                }
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors text-left"
            >
              <Edit className="w-4 h-4" />
              Rename
            </button>
          )}

          {contextMenu.type === 'feed' && feeds.find(f => f.id === contextMenu.id)?.viewType === 'article' && (
            <button
              onClick={() => {
                toggleFeedFullContent(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Full Content
              </div>
              {feeds.find(f => f.id === contextMenu.id)?.loadFullContent && <Check className="w-4 h-4 text-primary-600" />}
            </button>
          )}

          {contextMenu.type === 'folder' && folders.find(f => f.id === contextMenu.id) && getFolderType(folders.find(f => f.id === contextMenu.id)) === 'article' && (
            <button
              onClick={() => {
                toggleFolderFullContent(contextMenu.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Full Content
              </div>
              {feeds.filter(f => f.folderId === contextMenu.id).length > 0 &&
                feeds.filter(f => f.folderId === contextMenu.id).every(f => f.loadFullContent) &&
                <Check className="w-4 h-4 text-primary-600" />}
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Cleanup Confirmation Modal */}
      {showCleanupConfirm && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clean Up Old Items</h3>
            <p className="text-gray-600 mb-6">
              This will remove all feed items older than 30 days. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCleanupConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isCleaning}
              >
                Cancel
              </button>
              <button
                onClick={handleCleanup}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                disabled={isCleaning}
              >
                {isCleaning ? 'Cleaning...' : 'Confirm Clean Up'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DndContext>
  );
}

