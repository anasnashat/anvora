'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Message {
    id: string;
    to: string;
    message: string;
    status: string;
    createdAt: string;
    sentAt?: string;
    error?: string;
}

export default function MessagesPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<string | null>(null);

    useEffect(() => {
        fetchMessages();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchMessages = async () => {
        try {
            const data = await api.getMessageHistory(100);
            setMessages(data);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            api.clearAuth();
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (message: Message) => {
        setRetrying(message.id);
        try {
            await api.sendMessage(message.to, message.message);
            alert('Message resent successfully!');
            fetchMessages();
        } catch (err: any) {
            console.error('Failed to retry message:', err);
            alert(err.message || 'Failed to resend message');
        } finally {
            setRetrying(null);
        }
    };

    const handleLogout = () => {
        api.clearAuth();
        router.push('/login');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SENT':
                return 'text-green-400 bg-green-500/10';
            case 'FAILED':
                return 'text-red-400 bg-red-500/10';
            case 'SENDING':
                return 'text-yellow-400 bg-yellow-500/10';
            case 'QUEUED':
                return 'text-blue-400 bg-blue-500/10';
            default:
                return 'text-gray-400 bg-gray-500/10';
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
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
                            <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
                            <Link href="/dashboard/contacts" className="text-gray-400 hover:text-white transition-colors">Contacts</Link>
                            <Link href="/dashboard/instances" className="text-gray-400 hover:text-white transition-colors">Instances</Link>
                            <Link href="/dashboard/messages" className="text-emerald-400 font-medium">Messages</Link>
                            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">Logout</button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">Message Logs</h1>
                    <button
                        onClick={fetchMessages}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700/50 text-gray-400 text-sm">
                                <th className="px-6 py-4 font-medium">To</th>
                                <th className="px-6 py-4 font-medium">Message</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Created</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {messages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No messages sent yet.
                                    </td>
                                </tr>
                            ) : (
                                messages.map((message) => (
                                    <tr key={message.id} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 font-medium">{message.to}</td>
                                        <td className="px-6 py-4 text-gray-300 max-w-md truncate">{message.message}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                                                {message.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(message.createdAt)}</td>
                                        <td className="px-6 py-4 text-right">
                                            {message.status === 'FAILED' && (
                                                <button
                                                    onClick={() => handleRetry(message)}
                                                    disabled={retrying === message.id}
                                                    className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 flex items-center ml-auto"
                                                    title="Retry sending"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    {retrying === message.id ? 'Retrying...' : 'Retry'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
