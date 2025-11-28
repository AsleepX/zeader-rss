import React, { useState, useEffect } from 'react';
import { Layout, Grid, Plus, Trash2, Rss, Image, BookOpen, Settings, Folder, FolderOpen, MoreVertical, Upload, RefreshCw, Download, Edit, Check, Circle, Sparkles, PlaySquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeedStore } from '../store/useFeedStore';
import { useThemeStore } from '../store/useThemeStore';
import { useAIStore } from '../store/useAIStore';
import { api } from '../utils/api';
import clsx from 'clsx';
import { DndContext, useDraggable, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

import { DraggableFeed } from './sidebar/DraggableFeed';
import { FolderItem } from './sidebar/FolderItem';
import { FeedList } from './sidebar/FeedList';

// Root Droppable Area
const RootDroppable = ({ children, onContextMenu }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root',
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx("flex-1 overflow-y-auto px-4 space-y-8 pb-20", isOver && "bg-gray-50/50")}
      onContextMenu={onContextMenu}
    >
      {children}
    </div>
  );
}

// View Tab Droppable Target
const ViewTabDroppable = ({ viewType, icon: Icon, isActive, onClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `view-tab-${viewType}`,
    data: { type: 'view-tab', viewType }
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={clsx(
        "flex-1 flex items-center justify-center py-2 rounded-lg transition-all relative group",
        isActive ? "text-primary-600 bg-primary-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50",
        isOver && "ring-2 ring-primary-200 bg-primary-50"
      )}
      title={`Switch to ${viewType} view`}
    >
      <Icon className={clsx("w-5 h-5", isActive && "text-primary-600")} />
      {isOver && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
          Move to {viewType}
        </div>
      )}
    </button>
  );
};

export function Sidebar({ currentView, setCurrentView, onAddFeed, onCreateFolder, onImportOpml, onExportOpml, onCleanup }) {
  const { feeds, folders, removeFeed, deleteFolder, moveFeed, updateFeedViewType, updateFolderViewType, selectedSource, selectSource, refreshAllFeeds, isLoading, renameFolder, renameFeed, showUnreadOnly, toggleShowUnreadOnly, markCurrentViewAsRead, toggleFeedFullContent, toggleFolderFullContent } = useFeedStore();
  const { themeColor, setThemeColor } = useThemeStore();
  const [expandedFolders, setExpandedFolders] = useState({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDragFeed, setActiveDragFeed] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

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

  let pageTitle = currentView === 'photo' ? 'Photo' : currentView === 'video' ? 'Video' : 'Articles';
  if (selectedSource.type === 'folder') {
    const folder = folders.find(f => f.id === selectedSource.id);
    if (folder) pageTitle = folder.name;
  } else if (selectedSource.type === 'feed') {
    const feed = feeds.find(f => f.id === selectedSource.id);
    if (feed) pageTitle = feed.title;
  } else {
    pageTitle = currentView === 'photo' ? 'All Photos' : currentView === 'video' ? 'All Videos' : 'All Articles';
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

    // Handle dropping on View Tabs
    if (targetId.startsWith('view-tab-')) {
      const targetViewType = targetId.replace('view-tab-', '');

      if (activeType === 'feed' || active.data.current?.feed) {
        const feedId = activeId;
        const feed = feeds.find(f => f.id === feedId);
        if (feed && feed.viewType !== targetViewType) {
          updateFeedViewType(feedId, targetViewType);
          if (feed.folderId) {
            const folder = folders.find(f => f.id === feed.folderId);
            const folderType = getFolderType(folder);
            if (folderType !== 'mixed' && folderType !== targetViewType) {
              moveFeed(feedId, null);
            }
          }
        }
      } else if (activeType === 'folder') {
        const folderId = activeId.replace('folder-drag-', '');
        updateFolderViewType(folderId, targetViewType);
      }
      return;
    }

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

  // Group folders
  const getFolderType = (folder) => {
    if (folder.viewType) return folder.viewType;

    const folderFeeds = feeds.filter(f => f.folderId === folder.id);
    if (folderFeeds.length === 0) return 'empty';
    const hasPhoto = folderFeeds.some(f => f.viewType === 'photo');
    const hasArticle = folderFeeds.some(f => f.viewType === 'article');
    const hasVideo = folderFeeds.some(f => f.viewType === 'video');

    if (hasPhoto && !hasArticle && !hasVideo) return 'photo';
    if (!hasPhoto && hasArticle && !hasVideo) return 'article';
    if (!hasPhoto && !hasArticle && hasVideo) return 'video';
    return 'mixed';
  };

  // Filter items based on current view
  const currentFolders = folders.filter(f => {
    const type = getFolderType(f);
    if (currentView === 'photo') return type === 'photo';
    if (currentView === 'article') return type === 'article';
    if (currentView === 'video') return type === 'video';
    return false;
  });

  const currentUngroupedFeeds = ungroupedFeeds.filter(f => f.viewType === currentView);

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
            selectSource('folder', folder.id);
          }}
          onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id, folder.name)}
        >
          {isExpanded && <FeedList
            items={folderFeeds}
            onRemove={removeFeed}
            selectedSource={selectedSource}
            onSelectFeed={(id) => {
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
        <div className="px-6 pt-4 pb-2">
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
                onClick={() => markCurrentViewAsRead(currentView)}
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

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider truncate px-1 mb-4">
            {pageTitle}
          </h2>

          {/* View Switcher */}
          <div className="flex items-center gap-2 mb-4 bg-gray-50/50 p-1 rounded-xl">
            <ViewTabDroppable
              viewType="article"
              icon={BookOpen}
              isActive={currentView === 'article'}
              onClick={() => { setCurrentView('article'); selectSource('all'); }}
            />
            <ViewTabDroppable
              viewType="photo"
              icon={Image}
              isActive={currentView === 'photo'}
              onClick={() => { setCurrentView('photo'); selectSource('all'); }}
            />
            <ViewTabDroppable
              viewType="video"
              icon={PlaySquare}
              isActive={currentView === 'video'}
              onClick={() => { setCurrentView('video'); selectSource('all'); }}
            />
          </div>

        </div>

        <RootDroppable onContextMenu={(e) => handleContextMenu(e, currentView)}>
          <div className="space-y-1">
            {currentFolders.map(renderFolder)}
            <FeedList
              items={currentUngroupedFeeds}
              onRemove={removeFeed}
              selectedSource={selectedSource}
              onSelectFeed={(id) => {
                selectSource('feed', id);
              }}
              onContextMenu={(e, feed) => handleContextMenu(e, 'feed', feed.id, feed.title)}
            />
          </div>
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
                    onClick={() => {
                      onExportOpml();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm font-medium text-gray-700 transition-colors border-t border-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Export OPML
                  </button>
                  <button
                    onClick={() => {
                      onCleanup();
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
      {
        createPortal(
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
        )
      }

      {/* Context Menu */}
      {
        contextMenu && createPortal(
          <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {(contextMenu.type === 'photo' || contextMenu.type === 'article' || contextMenu.type === 'video') && (
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
        )
      }
    </DndContext >
  );
}
