'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import DashboardNav from '@/components/DashboardNav';

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [previewContent, setPreviewContent] = useState('');
  const [formData, setFormData] = useState({ name: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      alert('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingTemplate) {
        await api.updateTemplate(editingTemplate.id, formData);
      } else {
        await api.createTemplate(formData);
      }
      setIsDialogOpen(false);
      setFormData({ name: '', content: '' });
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, content: template.content });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await api.deleteTemplate(id);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template');
    }
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    const vars: Record<string, string> = {};
    template.variables.forEach(v => vars[v] = '');
    setPreviewVariables(vars);
    setPreviewContent(template.content);
    setIsPreviewOpen(true);
  };

  const updatePreview = () => {
    if (!previewTemplate) return;
    let content = previewTemplate.content;
    Object.entries(previewVariables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
    });
    setPreviewContent(content);
  };

  useEffect(() => {
    updatePreview();
  }, [previewVariables]);

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
      <DashboardNav onLogout={handleLogout} currentPath="/dashboard/templates" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Message Templates</h1>
            <p className="text-gray-400 mt-2">Create reusable message templates with variables</p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setFormData({ name: '', content: '' });
              setIsDialogOpen(true);
            }}
            className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            + Create Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-12 text-center">
            <p className="text-gray-300 text-lg mb-4">No templates yet</p>
            <p className="text-gray-500 mb-6">Create your first template to get started</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="bg-emerald-500 text-white px-6 py-3 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div key={template.id} className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 hover:border-emerald-500/50 transition-all p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-gray-400 mb-4 line-clamp-3">{template.content}</p>

                {template.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((variable) => (
                        <span
                          key={variable}
                          className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handlePreview(template)}
                    className="flex-1 bg-gray-700 text-gray-200 px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="flex-1 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded hover:bg-emerald-500/20 transition-colors text-sm border border-emerald-500/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="flex-1 bg-red-500/10 text-red-400 px-4 py-2 rounded hover:bg-red-500/20 transition-colors text-sm border border-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  placeholder="e.g., Welcome Message"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                  rows={8}
                  placeholder="Hello {{name}}, welcome to {{company}}!"
                  required
                />
                <p className="text-sm text-gray-400 mt-2">
                  Use {`{{variable}}`} syntax to add placeholders (e.g., {`{{name}}`}, {`{{company}}`})
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingTemplate(null);
                    setFormData({ name: '', content: '' });
                  }}
                  className="px-6 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {isPreviewOpen && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Preview Template</h2>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Fill in Variables:</h3>
              {previewTemplate.variables.map((variable) => (
                <div key={variable} className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {variable}
                  </label>
                  <input
                    type="text"
                    value={previewVariables[variable] || ''}
                    onChange={(e) => setPreviewVariables({
                      ...previewVariables,
                      [variable]: e.target.value
                    })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-white"
                    placeholder={`Enter ${variable}...`}
                  />
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Preview:</h3>
              <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                <p className="whitespace-pre-wrap text-gray-200">{previewContent}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setPreviewTemplate(null);
                  setPreviewVariables({});
                }}
                className="px-6 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
