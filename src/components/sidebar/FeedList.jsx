import React from 'react';
import { DraggableFeed } from './DraggableFeed';

export const FeedList = ({ items, onRemove, selectedSource, onSelectFeed, onContextMenu }) => (
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
