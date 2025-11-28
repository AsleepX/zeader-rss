import React from 'react';
import { DraggableFeed } from './DraggableFeed';

export const FeedList = ({ items, onRemove, selectedSource, onSelectFeed, onContextMenu, dragEnabled = true }) => (
    <div className="space-y-1 mt-1 px-2">
        {items.map(feed => (
            <DraggableFeed
                key={feed.id}
                feed={feed}
                onRemove={onRemove}
                isSelected={selectedSource?.type === 'feed' && selectedSource?.id === feed.id}
                onClick={() => onSelectFeed(feed.id)}
                onContextMenu={(e) => onContextMenu && onContextMenu(e, feed)}
                dragEnabled={dragEnabled}
            />
        ))}
    </div>
);
