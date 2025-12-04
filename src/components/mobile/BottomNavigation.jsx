import React, { useRef } from 'react';
import { BookOpen, Image, PlaySquare, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useFeedStore } from '../../store/useFeedStore';

export const BottomNavigation = ({ currentView, setCurrentView, onOpenSettings, onLongPressView }) => {
    const { selectSource } = useFeedStore();
    const longPressTimer = useRef(null);
    const isLongPress = useRef(false);

    const bindLongPress = (viewType) => {
        return {
            onTouchStart: (e) => {
                isLongPress.current = false;
                longPressTimer.current = setTimeout(() => {
                    isLongPress.current = true;
                    if (navigator.vibrate) navigator.vibrate(50);
                    onLongPressView(viewType);
                }, 500);
            },
            onTouchEnd: (e) => {
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                // Reset isLongPress after a short delay to prevent click firing after long press
                // but allow subsequent normal clicks to work
                setTimeout(() => {
                    isLongPress.current = false;
                }, 100);
            },
            onContextMenu: (e) => {
                e.preventDefault();
            },
            onClick: (e) => {
                if (isLongPress.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                setCurrentView(viewType);
                selectSource('all');
            }
        };
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between z-50 pb-safe">
            <button
                {...bindLongPress('article')}
                className={clsx("p-2 rounded-xl transition-colors flex flex-col items-center gap-1 min-w-[60px]", currentView === 'article' ? "text-primary-600 bg-primary-50" : "text-gray-400")}
            >
                <BookOpen className="w-6 h-6" />
                <span className="text-[10px] font-medium">Article</span>
            </button>

            <button
                {...bindLongPress('photo')}
                className={clsx("p-2 rounded-xl transition-colors flex flex-col items-center gap-1 min-w-[60px]", currentView === 'photo' ? "text-primary-600 bg-primary-50" : "text-gray-400")}
            >
                <Image className="w-6 h-6" />
                <span className="text-[10px] font-medium">Photo</span>
            </button>

            <button
                {...bindLongPress('video')}
                className={clsx("p-2 rounded-xl transition-colors flex flex-col items-center gap-1 min-w-[60px]", currentView === 'video' ? "text-primary-600 bg-primary-50" : "text-gray-400")}
            >
                <PlaySquare className="w-6 h-6" />
                <span className="text-[10px] font-medium">Video</span>
            </button>

            <button
                onClick={onOpenSettings}
                className="p-2 rounded-xl transition-colors flex flex-col items-center gap-1 text-gray-400 hover:bg-gray-50 min-w-[60px]"
            >
                <Settings className="w-6 h-6" />
                <span className="text-[10px] font-medium">Settings</span>
            </button>
        </div>
    );
};
