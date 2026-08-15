'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

interface Instance {
    id: string;
    name: string;
    sessionId: string;
    status: string;
    phoneNumber: string | null;
    createdAt: string;
}

export default function InstancesPage() {
    const router = useRouter();
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newInstanceName, setNewInstanceName] = useState('');
    const [creating, setCreating] = useState(false);
    const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    const fetchInstances = useCallback(async () => {
        try {
            const data = await api.getInstances();
            setInstances(data);
        } catch (err) {
            console.error('Failed to fetch instances:', err);
            api.clearAuth();
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!api.getToken()) {
            router.push('/login');
            return;
        }

        fetchInstances();
    }, [router, fetchInstances]);

    const connectSocket = useCallback((sessionId: string) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        const newSocket = io(`${apiUrl}/whatsapp`, {
            transports: ['websocket'],
            auth: { token: api.getToken() },
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            newSocket.emit('subscribe', { sessionId });
        });

        newSocket.on('qr', (data: { sessionId: string; qrCode: string }) => {
            console.log('QR code received');
            setQrCode(data.qrCode);
        });

        newSocket.on('connected', (data: { sessionId: string; phoneNumber: string }) => {
            console.log('WhatsApp connected:', data.phoneNumber);
            setQrCode(null);
            setSelectedInstance(null);
            fetchInstances();
        });

        newSocket.on('disconnected', () => {
            console.log('WhatsApp disconnected');
            setQrCode(null);
            fetchInstances();
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [fetchInstances]);

    const handleCreateInstance = async () => {
        if (!newInstanceName.trim()) return;

        setCreating(true);
        try {
            await api.createInstance(newInstanceName);
            setNewInstanceName('');
            setShowCreateModal(false);
            await fetchInstances();
        } catch (err) {
            console.error('Failed to create instance:', err);
        } finally {
            setCreating(false);
        }
    };

    const handleConnect = async (instance: Instance) => {
        setSelectedInstance(instance.id);
        setQrCode(null);

        try {
            connectSocket(instance.sessionId);
            await api.connectInstance(instance.id);
        } catch (err) {
            console.error('Failed to connect instance:', err);
            setSelectedInstance(null);
        }
    };

    const handleDisconnect = async (instanceId: string) => {
        try {
            await api.disconnectInstance(instanceId);
            if (socket) {
                socket.close();
                setSocket(null);
            }
            setSelectedInstance(null);
            setQrCode(null);
        } catch (err) {
            console.error('Failed to disconnect instance:', err);
        } finally {
            await fetchInstances();
        }
    };

    const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);

    const handleDelete = async (instanceId: string) => {
        setInstanceToDelete(instanceId);
    };

    const confirmDelete = async () => {
        if (!instanceToDelete) return;
        const instanceId = instanceToDelete;
        setInstanceToDelete(null); // Close modal immediately

        // Optimistic update
        setInstances((prev) => prev.filter((i) => i.id !== instanceId));

        try {
            await api.deleteInstance(instanceId);
        } catch (err) {
            console.error('Failed to delete instance:', err);
            await fetchInstances();
        }
    };

    const handleLogout = () => {
        api.clearAuth();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <Link href="/dashboard" className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-white">Anvora</span>
                            </Link>
                        </div>
                        <nav className="flex items-center space-x-6">
                            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
                            <Link href="/dashboard/instances" className="text-emerald-400 font-medium">Instances</Link>
                            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">Logout</button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">WhatsApp Instances</h1>
                        <p className="text-gray-400 mt-1">Manage your WhatsApp connections</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Instance
                    </button>
                </div>

                {/* QR Code Modal */}
                {selectedInstance && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full">
                            <h2 className="text-xl font-bold text-white mb-4 text-center">Scan QR Code</h2>
                            {qrCode ? (
                                <div className="bg-white p-4 rounded-xl mb-6">
                                    <img src={qrCode} alt="WhatsApp QR Code" className="w-full" />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
                                    <p className="text-gray-400">Waiting for QR code...</p>
                                </div>
                            )}
                            <p className="text-gray-400 text-sm text-center mb-6">
                                Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, then scan this QR code.
                            </p>
                            <button
                                onClick={() => {
                                    setSelectedInstance(null);
                                    setQrCode(null);
                                    if (socket) {
                                        socket.close();
                                        setSocket(null);
                                    }
                                }}
                                className="w-full py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {instanceToDelete && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full">
                            <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2 text-center">Delete Instance?</h2>
                            <p className="text-gray-400 text-center mb-8">
                                Are you sure you want to delete this instance? This action cannot be undone.
                            </p>
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setInstanceToDelete(null)}
                                    className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full">
                            <h2 className="text-xl font-bold text-white mb-4">Create New Instance</h2>
                            <input
                                type="text"
                                value={newInstanceName}
                                onChange={(e) => setNewInstanceName(e.target.value)}
                                placeholder="Instance name (e.g., Marketing Phone)"
                                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-6"
                            />
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateInstance}
                                    disabled={creating || !newInstanceName.trim()}
                                    className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Instances Grid */}
                {instances.length === 0 ? (
                    <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-gray-700/50">
                        <div className="w-20 h-20 bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No instances yet</h3>
                        <p className="text-gray-400 mb-6">Create your first WhatsApp instance to start sending messages</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all"
                        >
                            Create Instance
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {instances.map((instance) => (
                            <div key={instance.id} className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${instance.status === 'CONNECTED' ? 'bg-emerald-500' : instance.status === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${instance.status === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' : instance.status === 'CONNECTING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {instance.status}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(instance.id)}
                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                <h3 className="text-lg font-semibold text-white mb-1">{instance.name}</h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    {instance.phoneNumber || 'Not connected yet'}
                                </p>

                                <div className="space-y-2">
                                    {instance.status === 'DISCONNECTED' && (
                                        <button
                                            onClick={() => handleConnect(instance)}
                                            className="w-full py-2 bg-emerald-500/20 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-colors flex items-center justify-center"
                                        >
                                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                                            </svg>
                                            Connect WhatsApp
                                        </button>
                                    )}
                                    {instance.status === 'CONNECTED' && (
                                        <button
                                            onClick={() => handleDisconnect(instance.id)}
                                            className="w-full py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center"
                                        >
                                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                                            </svg>
                                            Disconnect
                                        </button>
                                    )}
                                    {instance.status === 'CONNECTING' && (
                                        <div className="w-full py-2 bg-yellow-500/20 text-yellow-400 rounded-xl flex items-center justify-center">
                                            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Connecting...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
