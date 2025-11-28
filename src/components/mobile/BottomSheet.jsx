import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { FeedList } from '../sidebar/FeedList';
import { FolderItem } from '../sidebar/FolderItem';
import { useFeedStore } from '../../store/useFeedStore';
import { DndContext } from '@dnd-kit/core';

export const BottomSheet = ({ isOpen, onClose, viewType, title }) => {
    const { feeds, folders, removeFeed, deleteFolder, selectSource, selectedSource } = useFeedStore();
    const [expandedFolders, setExpandedFolders] = useState({});

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

    const currentFolders = folders.filter(f => {
        const type = getFolderType(f);
        if (viewType === 'photo') return type === 'photo';
        if (viewType === 'article') return type === 'article';
        if (viewType === 'video') return type === 'video';
        return false;
    });

    const currentUngroupedFeeds = feeds.filter(f => !f.folderId && f.viewType === viewType);

    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[70] max-h-[80vh] flex flex-col shadow-xl"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="font-semibold text-lg">{title}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 pb-24">
                            <div className="space-y-1">
                                {currentFolders.map(folder => (
                                    <div key={folder.id}>
                                        <FolderItem
                                            folder={folder}
                                            isExpanded={expandedFolders[folder.id]}
                                            toggleFolder={toggleFolder}
                                            onDelete={deleteFolder}
                                            isSelected={selectedSource.type === 'folder' && selectedSource.id === folder.id}
                                            onSelect={() => {
                                                selectSource('folder', folder.id);
                                                onClose();
                                            }}
                                            dragEnabled={false}
                                        >
                                            {expandedFolders[folder.id] && (
                                                <FeedList
                                                    items={feeds.filter(f => f.folderId === folder.id)}
                                                    onRemove={removeFeed}
                                                    selectedSource={selectedSource}
                                                    onSelectFeed={(id) => {
                                                        selectSource('feed', id);
                                                        onClose();
                                                    }}
                                                    dragEnabled={false}
                                                />
                                            )}
                                        </FolderItem>
                                    </div>
                                ))}

                                <FeedList
                                    items={currentUngroupedFeeds}
                                    onRemove={removeFeed}
                                    selectedSource={selectedSource}
                                    onSelectFeed={(id) => {
                                        selectSource('feed', id);
                                        onClose();
                                    }}
                                    dragEnabled={false}
                                />
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
