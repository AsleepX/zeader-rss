import React from 'react';

export function AnnotationSideNote({ text, top, onClick }) {
    return (
        <div
            className="absolute left-[100%] z-10 w-64 p-3 border border-transparent"
            style={{ top: top }}
        >
            <div
                onClick={onClick}
                title="Click to edit"
                className="w-full p-2 text-sm font-sans leading-5 align-top block m-0 text-gray-900 border border-transparent rounded-md break-words whitespace-pre-wrap cursor-text transition-colors duration-200"
            >
                {text}
            </div>
        </div>
    );
}
