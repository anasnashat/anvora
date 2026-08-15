'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Contact {
    _id: string;
    name: string;
    phone: string;
    tags: string[];
    email?: string;
}

interface Instance {
    id: string;
    name: string;
    status: string;
}

export default function ContactsPage() {
    const router = useRouter();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [isBulkMessageDialogOpen, setIsBulkMessageDialogOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
    const [messageForm, setMessageForm] = useState({ message: '', instanceId: '' });
    const [bulkMessageForm, setBulkMessageForm] = useState({ message: '', instanceId: '' });
    const [formData, setFormData] = useState({ name: '', phone: '', tags: '' });
    const [submitting, setSubmitting] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [sendingBulk, setSendingBulk] = useState(false);

    useEffect(() => {
        fetchContacts();
        fetchInstances();
    }, []);

    const fetchContacts = async () => {
        try {
            const data = await api.getContacts();
            setContacts(data);
        } catch (err) {
            console.error('Failed to fetch contacts:', err);
            api.clearAuth();
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchInstances = async () => {
        try {
            const data = await api.getInstances();
            const connectedInstances = data.filter((inst: Instance) => inst.status === 'CONNECTED');
            setInstances(connectedInstances);
            if (connectedInstances.length > 0) {
                setMessageForm(prev => ({ ...prev, instanceId: connectedInstances[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch instances:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                name: formData.name,
                phone: formData.phone,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            };
            await api.createContact(payload);
            setFormData({ name: '', phone: '', tags: '' });
            setIsDialogOpen(false);
            fetchContacts();
        } catch (err) {
            console.error('Failed to create contact:', err);
            alert('Failed to create contact');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this contact?')) return;
        try {
            await api.deleteContact(id);
            fetchContacts();
        } catch (err) {
            console.error('Failed to delete contact:', err);
        }
    };

    const handleSendMessage = (contact: Contact) => {
        setSelectedContact(contact);
        setMessageForm({ message: '', instanceId: instances[0]?.id || '' });
        setIsMessageDialogOpen(true);
    };

    const handleMessageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContact) return;

        setSendingMessage(true);
        try {
            await api.sendMessage(
                selectedContact.phone,
                messageForm.message,
                messageForm.instanceId
            );
            alert('Message sent successfully!');
            setMessageForm({ message: '', instanceId: instances[0]?.id || '' });
            setIsMessageDialogOpen(false);
            setSelectedContact(null);
        } catch (err: any) {
            console.error('Failed to send message:', err);
            alert(err.message || 'Failed to send message');
        } finally {
            setSendingMessage(false);
        }
    };

    const toggleContactSelection = (contactId: string) => {
        const newSelection = new Set(selectedContacts);
        if (newSelection.has(contactId)) {
            newSelection.delete(contactId);
        } else {
            newSelection.add(contactId);
        }
        setSelectedContacts(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedContacts.size === contacts.length) {
            setSelectedContacts(new Set());
        } else {
            setSelectedContacts(new Set(contacts.map(c => c._id)));
        }
    };

    const handleBulkSend = () => {
        if (selectedContacts.size === 0) {
            alert('Please select at least one contact');
            return;
        }
        setBulkMessageForm({ message: '', instanceId: instances[0]?.id || '' });
        setIsBulkMessageDialogOpen(true);
    };

    const handleBulkMessageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSendingBulk(true);
        const selectedContactsList = contacts.filter(c => selectedContacts.has(c._id));
        let successCount = 0;
        let failCount = 0;

        try {
            for (const contact of selectedContactsList) {
                try {
                    await api.sendMessage(
                        contact.phone,
                        bulkMessageForm.message,
                        bulkMessageForm.instanceId
                    );
                    successCount++;
                } catch (err) {
                    console.error(`Failed to send to ${contact.name}:`, err);
                    failCount++;
                }
            }

            alert(`Bulk send completed!\nSuccess: ${successCount}\nFailed: ${failCount}`);
            setBulkMessageForm({ message: '', instanceId: instances[0]?.id || '' });
            setIsBulkMessageDialogOpen(false);
            setSelectedContacts(new Set());
        } catch (err: any) {
            console.error('Bulk send error:', err);
            alert(err.message || 'Failed to send bulk messages');
        } finally {
            setSendingBulk(false);
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
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header - Duplicated for now (shouldrefactor to layout) */}
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
                            <Link href="/dashboard/contacts" className="text-emerald-400 font-medium">Contacts</Link>
                            <Link href="/dashboard/instances" className="text-gray-400 hover:text-white transition-colors">Instances</Link>
                            <Link href="/dashboard/messages" className="text-gray-400 hover:text-white transition-colors">Messages</Link>
                            <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">Logout</button>
                        </nav>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Contacts</h1>
                    <div className="flex space-x-3">
                        {selectedContacts.size > 0 && (
                            <button
                                onClick={handleBulkSend}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Send to {selectedContacts.size}
                            </button>
                        )}
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Contact
                        </button>
                    </div>
                </div>

                {selectedContacts.size > 0 && (
                    <div className="mb-4 flex items-center justify-between bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
                        <span className="text-blue-400 text-sm">
                            {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={() => setSelectedContacts(new Set())}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                            Clear selection
                        </button>
                    </div>
                )}

                <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-700/50 text-gray-400 text-sm">
                                <th className="px-6 py-4 font-medium w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedContacts.size === contacts.length && contacts.length > 0}
                                        onChange={toggleSelectAll}
                                        className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Phone</th>
                                <th className="px-6 py-4 font-medium">Tags</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {contacts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No contacts found. Add one to get started.
                                    </td>
                                </tr>
                            ) : (
                                contacts.map((contact) => (
                                    <tr key={contact._id} className="hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedContacts.has(contact._id)}
                                                onChange={() => toggleContactSelection(contact._id)}
                                                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium">{contact.name}</td>
                                        <td className="px-6 py-4 text-gray-300">{contact.phone}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {contact.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end space-x-3">
                                                <button
                                                    onClick={() => handleSendMessage(contact)}
                                                    className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center"
                                                    title="Send message"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contact._id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                    title="Delete contact"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Send Message Modal */}
            {isMessageDialogOpen && selectedContact && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-xl p-6">
                        <h2 className="text-xl font-bold mb-4">Send Message to {selectedContact.name}</h2>
                        <p className="text-gray-400 text-sm mb-4">{selectedContact.phone}</p>

                        {instances.length === 0 ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4">
                                <p className="text-yellow-400 text-sm">No connected WhatsApp instances found. Please connect an instance first.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleMessageSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">WhatsApp Instance</label>
                                    <select
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                        value={messageForm.instanceId}
                                        onChange={e => setMessageForm({ ...messageForm, instanceId: e.target.value })}
                                        required
                                    >
                                        {instances.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Message</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Enter your message here..."
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                                        value={messageForm.message}
                                        onChange={e => setMessageForm({ ...messageForm, message: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsMessageDialogOpen(false);
                                            setSelectedContact(null);
                                        }}
                                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingMessage}
                                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center"
                                    >
                                        {sendingMessage ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending...
                                            </>
                                        ) : 'Send Message'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {instances.length === 0 && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        setIsMessageDialogOpen(false);
                                        setSelectedContact(null);
                                        router.push('/dashboard/instances');
                                    }}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                >
                                    Go to Instances
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bulk Send Message Modal */}
            {isBulkMessageDialogOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-xl p-6">
                        <h2 className="text-xl font-bold mb-4">Send Message to {selectedContacts.size} Contacts</h2>
                        <p className="text-gray-400 text-sm mb-4">This message will be sent to all selected contacts.</p>

                        {instances.length === 0 ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-4">
                                <p className="text-yellow-400 text-sm">No connected WhatsApp instances found. Please connect an instance first.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleBulkMessageSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">WhatsApp Instance</label>
                                    <select
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                        value={bulkMessageForm.instanceId}
                                        onChange={e => setBulkMessageForm({ ...bulkMessageForm, instanceId: e.target.value })}
                                        required
                                    >
                                        {instances.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Message</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Enter your message here..."
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 resize-none"
                                        value={bulkMessageForm.message}
                                        onChange={e => setBulkMessageForm({ ...bulkMessageForm, message: e.target.value })}
                                    />
                                </div>
                                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
                                    <p className="text-blue-400 text-xs">
                                        Note: Messages will be sent one by one. This may take some time for large selections.
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsBulkMessageDialogOpen(false);
                                        }}
                                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendingBulk}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
                                    >
                                        {sendingBulk ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Sending...
                                            </>
                                        ) : `Send to ${selectedContacts.size}`}
                                    </button>
                                </div>
                            </form>
                        )}

                        {instances.length === 0 && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        setIsBulkMessageDialogOpen(false);
                                        router.push('/dashboard/instances');
                                    }}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                >
                                    Go to Instances
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Contact Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl w-full max-w-md border border-gray-700 shadow-xl p-6">
                        <h2 className="text-xl font-bold mb-4">Add New Contact</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Phone (with country code)</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="201234567890"
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    placeholder="vip, customer"
                                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                                    value={formData.tags}
                                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsDialogOpen(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Adding...' : 'Add Contact'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
