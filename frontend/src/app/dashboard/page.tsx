'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface UsageData {
    user: {
        id: string;
        email: string;
        apiKey: string;
        plan: string;
        planLimit: number;
        messagesSent: number;
        messagesRemaining: number;
    };
    instances: Array<{
        id: string;
        name: string;
        status: string;
        phoneNumber: string | null;
    }>;
    messageStats: Record<string, number>;
    dailyStats: Record<string, number>;
}

export default function DashboardPage() {
    const router = useRouter();
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showApiKey, setShowApiKey] = useState(false);
    const [regenerating, setRegenerating] = useState(false);

    useEffect(() => {
        if (!api.getToken()) {
            router.push('/login');
            return;
        }

        fetchUsage();
    }, [router]);

    const fetchUsage = async () => {
        try {
            const data = await api.getUsage();
            setUsage(data);
        } catch (err) {
            console.error('Failed to fetch usage:', err);
            api.clearAuth();
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        api.clearAuth();
        router.push('/login');
    };

    const handleRegenerateApiKey = async () => {
        if (!confirm('Are you sure? Your old API key will stop working immediately.')) return;

        setRegenerating(true);
        try {
            const { apiKey } = await api.regenerateApiKey();
            api.setApiKey(apiKey);
            await fetchUsage();
        } catch (err) {
            console.error('Failed to regenerate API key:', err);
        } finally {
            setRegenerating(false);
        }
    };

    const copyApiKey = () => {
        if (usage?.user.apiKey) {
            navigator.clipboard.writeText(usage.user.apiKey);
        }
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
                            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-white">Anvora</span>
                        </div>
                        <nav className="flex items-center space-x-6">
                            <Link href="/dashboard" className="text-emerald-400 font-medium">Dashboard</Link>
                            <Link href="/dashboard/contacts" className="text-gray-400 hover:text-white transition-colors">Contacts</Link>
                            <Link href="/dashboard/instances" className="text-gray-400 hover:text-white transition-colors">Instances</Link>
                            <Link href="/dashboard/templates" className="text-gray-400 hover:text-white transition-colors">Templates</Link>
                            <Link href="/dashboard/messages" className="text-gray-400 hover:text-white transition-colors">Messages</Link>
                            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">Logout</button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* API Key Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Current Plan */}
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">Current Plan</h2>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-emerald-400">{usage?.user.plan}</div>
                                <div className="text-gray-400 text-sm mt-1">
                                    {usage?.user.planLimit.toLocaleString()} messages/month
                                </div>
                            </div>
                            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                        </div>
                        {usage?.user.plan === 'STARTER' && (
                            <button className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all">
                                Upgrade Plan
                            </button>
                        )}
                    </div>

                    {/* API Key */}
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">API Key</h2>
                        <div className="flex items-center space-x-2 mb-3">
                            <div className="flex-1 bg-gray-700/50 rounded-xl px-4 py-3 font-mono text-sm overflow-hidden">
                                {showApiKey ? (
                                    <span className="text-emerald-400 break-all">{usage?.user.apiKey}</span>
                                ) : (
                                    <span className="text-gray-400">••••••••••••••••••••••••••••••••</span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors text-sm"
                            >
                                {showApiKey ? 'Hide' : 'Show'}
                            </button>
                            <button
                                onClick={copyApiKey}
                                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors text-sm"
                            >
                                Copy
                            </button>
                            <button
                                onClick={handleRegenerateApiKey}
                                disabled={regenerating}
                                className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
                            >
                                {regenerating ? 'Wait...' : 'Regenerate'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Link href="/dashboard/instances" className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 hover:border-emerald-500/40 transition-all group">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Manage Instances</h3>
                                <p className="text-gray-400">Connect, disconnect, or add new WhatsApp numbers</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </Link>

                    <a href="http://localhost:3000/docs" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all group">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">API Documentation</h3>
                                <p className="text-gray-400">View Swagger docs and test the API endpoints</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                        </div>
                    </a>
                </div>

                {/* Instances List */}
                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-white">WhatsApp Instances</h2>
                        <Link href="/dashboard/instances" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                            View all →
                        </Link>
                    </div>

                    {usage?.instances.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-400 mb-4">No WhatsApp instances yet</p>
                            <Link href="/dashboard/instances" className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors">
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Instance
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {usage?.instances.map((instance) => (
                                <div key={instance.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-3 h-3 rounded-full ${instance.status === 'CONNECTED' ? 'bg-emerald-500' : instance.status === 'CONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                        <div>
                                            <div className="font-medium text-white">{instance.name}</div>
                                            <div className="text-sm text-gray-400">
                                                {instance.phoneNumber || 'Not connected'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${instance.status === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' : instance.status === 'CONNECTING' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {instance.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
