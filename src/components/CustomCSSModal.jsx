import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

const PLACEHOLDER_CSS = `/* Example Custom CSS */

/* Change background color */
body {
  background-color: #f5f5f5;
}

/* Customize article title */
.article-title {
  font-size: 1.5rem;
  color: #333;
}

/* Add custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}`;

export const CustomCSSModal = ({ isOpen, onClose }) => {
    const { customCSS, setCustomCSS } = useThemeStore();
    const [cssValue, setCssValue] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCssValue(customCSS || '');
        }
    }, [isOpen, customCSS]);

    const handleSave = () => {
        setCustomCSS(cssValue);
        onClose();
    };

    const handleClear = () => {
        setCssValue('');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Custom CSS</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-hidden">
                    <p className="text-sm text-gray-500 mb-4">
                        Add your custom CSS to personalize the appearance of Zeader. Changes will be applied immediately after saving.
                    </p>
                    <div className="relative h-[400px]">
                        <textarea
                            value={cssValue}
                            onChange={(e) => setCssValue(e.target.value)}
                            placeholder={PLACEHOLDER_CSS}
                            className="w-full h-full p-4 font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-300"
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Clear
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                        >
                            Save & Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
