'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SendMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact: { name: string; phone: string } | null;
  instances: Array<{ id: string; name: string; status: string }>;
  onSuccess: () => void;
}

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

export default function SendMessageDialog({
  isOpen,
  onClose,
  contact,
  instances,
  onSuccess
}: SendMessageDialogProps) {
  const [message, setMessage] = useState('');
  const [instanceId, setInstanceId] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInstanceId(instances[0]?.id || '');
      fetchTemplates();
    }
  }, [isOpen, instances]);

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setMessage(template.content);
        const vars: Record<string, string> = {};
        template.variables.forEach(v => vars[v] = '');
        setTemplateVariables(vars);
      }
    }
  }, [selectedTemplateId, templates]);

  const fetchTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Determine media type
    const type = file.type.startsWith('image/') ? 'IMAGE'
      : file.type.startsWith('video/') ? 'VIDEO'
      : file.type.startsWith('audio/') ? 'AUDIO'
      : 'DOCUMENT';

    setMediaFile(file);
    setMediaType(type);

    // Upload file
    setUploading(true);
    try {
      const result = await api.uploadFile(file);
      setMediaUrl(result.path);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload file');
      setMediaFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;

    setSending(true);
    try {
      let finalMessage = message;

      // Apply template variables if using template
      if (useTemplate && selectedTemplateId) {
        Object.entries(templateVariables).forEach(([key, value]) => {
          finalMessage = finalMessage.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        });
      }

      await api.sendMessage(
        contact.phone,
        finalMessage,
        instanceId,
        mediaUrl ? mediaType : undefined,
        mediaUrl || undefined,
        scheduleMode ? scheduledAt : undefined
      );

      alert(scheduleMode ? 'Message scheduled successfully!' : 'Message sent successfully!');
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setInstanceId('');
    setUseTemplate(false);
    setSelectedTemplateId('');
    setTemplateVariables({});
    setMediaFile(null);
    setMediaType('');
    setMediaUrl('');
    setScheduleMode(false);
    setScheduledAt('');
    onClose();
  };

  if (!isOpen || !contact) return null;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Send Message to {contact.name}</h2>

        <form onSubmit={handleSubmit}>
          {/* Instance Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Instance
            </label>
            <select
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name} ({instance.status})
                </option>
              ))}
            </select>
          </div>

          {/* Template Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="useTemplate"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="useTemplate" className="text-sm font-medium text-gray-700">
              Use Template
            </label>
          </div>

          {/* Template Selection */}
          {useTemplate && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a template --</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Template Variables */}
          {useTemplate && selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fill in Variables:
              </label>
              {selectedTemplate.variables.map((variable) => (
                <div key={variable} className="mb-2">
                  <input
                    type="text"
                    value={templateVariables[variable] || ''}
                    onChange={(e) => setTemplateVariables({
                      ...templateVariables,
                      [variable]: e.target.value
                    })}
                    placeholder={`Enter ${variable}...`}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Message Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Enter your message..."
              required
            />
          </div>

          {/* Media Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Media (Optional)
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={uploading}
            />
            {uploading && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
            {mediaFile && !uploading && (
              <p className="text-sm text-green-600 mt-2">
                ✓ {mediaFile.name} ({mediaType})
              </p>
            )}
          </div>

          {/* Schedule Toggle */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="scheduleMode"
              checked={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="scheduleMode" className="text-sm font-medium text-gray-700">
              Schedule Message
            </label>
          </div>

          {/* Schedule DateTime */}
          {scheduleMode && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule For
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required={scheduleMode}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={sending || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={sending || uploading}
            >
              {sending ? 'Sending...' : scheduleMode ? 'Schedule' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
