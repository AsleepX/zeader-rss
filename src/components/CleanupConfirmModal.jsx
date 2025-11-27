import React from 'react';
import { createPortal } from 'react-dom';

export const CleanupConfirmModal = ({ isOpen, onClose, onConfirm, isCleaning }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Clean Up Old Items</h3>
                <p className="text-gray-600 mb-6">
                    This will remove all feed items older than 30 days. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={isCleaning}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                        disabled={isCleaning}
                    >
                        {isCleaning ? 'Cleaning...' : 'Confirm Clean Up'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
