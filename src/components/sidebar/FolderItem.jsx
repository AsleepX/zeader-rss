import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { Trash2, Folder, FolderOpen } from 'lucide-react';

export const FolderItem = ({ folder, isExpanded, toggleFolder, onDelete, children, isSelected, onSelect, onContextMenu, dragEnabled = true }) => {
    const draggable = useDraggable({
        id: `folder-drag-${folder.id}`,
        data: { folder, type: 'folder' },
        disabled: !dragEnabled
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
            className={clsx(dragEnabled && "touch-none", isDragging && "opacity-30")}
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
