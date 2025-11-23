import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Folder, Rss, CheckSquare, Square } from 'lucide-react';
import { useFeedStore } from '../store/useFeedStore';
import { parseOpml, groupFeedsByCategory } from '../utils/opml';

export function ImportOpmlModal({ isOpen, onClose }) {
    const [step, setStep] = useState('upload'); // 'upload', 'analyzing', 'select'
    const [groups, setGroups] = useState({});
    const [ungrouped, setUngrouped] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState({}); // { "Category": true/false }
    const [selectedUngrouped, setSelectedUngrouped] = useState({}); // { "url": true/false }
    const fileInputRef = useRef(null);
    const { importOpml, isLoading, feeds: currentFeeds } = useFeedStore();

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setStep('analyzing');
            const feeds = await parseOpml(file);

            // Filter duplicates
            const existingUrls = new Set(currentFeeds.map(f => f.url));
            const newFeeds = feeds.filter(f => !existingUrls.has(f.url));
            const duplicateCount = feeds.length - newFeeds.length;

            if (duplicateCount > 0) {
                alert(`${duplicateCount} feeds were excluded because they are already subscribed.`);
            }

            if (newFeeds.length === 0) {
                alert("All feeds in the OPML file are already subscribed.");
                setStep('upload');
                return;
            }

            const { groups: groupedFeeds, ungrouped: ungroupedFeeds } = groupFeedsByCategory(newFeeds);
            
            setGroups(groupedFeeds);
            setUngrouped(ungroupedFeeds);
            
            // Default select all
            const initialSelectedGroups = {};
            Object.keys(groupedFeeds).forEach(key => initialSelectedGroups[key] = true);
            setSelectedGroups(initialSelectedGroups);
            
            const initialSelectedUngrouped = {};
            ungroupedFeeds.forEach(feed => initialSelectedUngrouped[feed.url] = true);
            setSelectedUngrouped(initialSelectedUngrouped);
            
            setStep('select');
        } catch (error) {
            console.error("Failed to parse OPML:", error);
            alert("Failed to parse OPML file");
            setStep('upload');
        }
    };

    const handleImport = async () => {
        const finalGroups = {};
        Object.entries(groups).forEach(([key, feeds]) => {
            if (selectedGroups[key]) {
                finalGroups[key] = feeds;
            }
        });

        const finalUngrouped = ungrouped.filter(feed => selectedUngrouped[feed.url]);

        await importOpml(finalGroups, finalUngrouped);
        onClose();
        setStep('upload');
    };

    const toggleGroup = (groupName) => {
        setSelectedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    const toggleUngrouped = (url) => {
        setSelectedUngrouped(prev => ({ ...prev, [url]: !prev[url] }));
    };

    const toggleAll = () => {
        const allSelected = Object.values(selectedGroups).every(Boolean) && Object.values(selectedUngrouped).every(Boolean);
        
        const newGroupState = {};
        Object.keys(groups).forEach(k => newGroupState[k] = !allSelected);
        setSelectedGroups(newGroupState);

        const newUngroupedState = {};
        ungrouped.forEach(f => newUngroupedState[f.url] = !allSelected);
        setSelectedUngrouped(newUngroupedState);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Import OPML</h2>
                    <p className="text-sm text-gray-500 mt-1">Import feeds from another RSS reader</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Click to upload OPML file</h3>
                            <p className="text-sm text-gray-500 mt-2">Supports .opml or .xml files</p>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                className="hidden" 
                                accept=".opml,.xml"
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                            <p className="text-gray-600">Analyzing feeds...</p>
                        </div>
                    )}

                    {step === 'select' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900">Select feeds to import</h3>
                                <button 
                                    onClick={toggleAll}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                >
                                    Toggle All
                                </button>
                            </div>

                            {Object.keys(groups).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folders</h4>
                                    {Object.entries(groups).map(([name, feeds]) => (
                                        <div key={name} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div 
                                                className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                                                onClick={() => toggleGroup(name)}
                                            >
                                                {selectedGroups[name] ? (
                                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                                <Folder className="w-4 h-4 text-gray-500" />
                                                <span className="font-medium text-gray-900">{name}</span>
                                                <span className="text-xs text-gray-500 ml-auto">{feeds.length} feeds</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {ungrouped.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ungrouped Feeds</h4>
                                    <div className="space-y-2">
                                        {ungrouped.map(feed => (
                                            <div 
                                                key={feed.url}
                                                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                                onClick={() => toggleUngrouped(feed.url)}
                                            >
                                                {selectedUngrouped[feed.url] ? (
                                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                                <Rss className="w-4 h-4 text-gray-500" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{feed.title}</p>
                                                    <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {step === 'select' && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                        <button
                            onClick={() => setStep('upload')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isLoading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import Selected'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
