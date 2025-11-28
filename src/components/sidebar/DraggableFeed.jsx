import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { Trash2 } from 'lucide-react';

export const DraggableFeed = ({ feed, onRemove, isSelected, onClick, onContextMenu, dragEnabled = true }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: feed.id,
        data: { feed },
        disabled: !dragEnabled
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
                "group flex items-center justify-between px-3.5 py-2 rounded-lg transition-colors cursor-grab active:cursor-grabbing",
                dragEnabled && "touch-none",
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
