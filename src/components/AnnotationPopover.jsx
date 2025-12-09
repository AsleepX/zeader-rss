import React, { useState, useEffect, useRef } from 'react';

export function AnnotationPopover({ position, onSave, onCancel, initialText = '', initialCursorOffset = -1 }) {
    const [text, setText] = useState(initialText);
    const inputRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            // Place cursor at specific offset if provided, otherwise at end
            if (initialCursorOffset >= 0 && initialCursorOffset <= inputRef.current.value.length) {
                inputRef.current.setSelectionRange(initialCursorOffset, initialCursorOffset);
            } else {
                inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
            }
        }
    }, [initialCursorOffset]);

    // Handle click outside to save
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                // Always act as "save" when clicking outside - let parent handle empty text logic
                onSave(text);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onSave, onCancel, text]);

    // Auto-adjust height
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
        }
    }, [text]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) {
                onSave(text);
            }
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div
            ref={popoverRef}
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            <div className="mb-2">
                <textarea
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a note..."
                    className="w-full p-2 text-sm font-sans leading-5 align-top block m-0 border border-transparent rounded-md focus:border-transparent focus:ring-0 resize-none outline-none overflow-hidden"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded"
                >
                    Cancel
                </button>
                <button
                    onClick={() => text.trim() && onSave(text)}
                    disabled={!text.trim()}
                    className="px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Save
                </button>
            </div>
        </div>
    );
}
