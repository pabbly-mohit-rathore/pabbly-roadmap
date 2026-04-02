import { useEffect, useState } from 'react';
import { Plus, Copy, Trash2, X, Eye } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface InviteLink {
  id: string;
  token: string;
  name?: string;
  boardIds: string[];
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

interface Board {
  id: string;
  name: string;
}

export default function AdminInviteLinks() {
  const theme = useThemeStore((state) => state.theme);
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    boardIds: [] as string[],
    expiresAt: '',
    maxUses: '',
  });

  useEffect(() => {
    fetchLinks();
    fetchBoards();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/invite-links');
      if (response.data.success) {
        setLinks(response.data.data.links);
      }
    } catch (error) {
      console.error('Error fetching links:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      if (response.data.success) {
        setBoards(response.data.data.boards);
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const handleCreateLink = async () => {
    if (!formData.name.trim() || formData.boardIds.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const response = await api.post('/invite-links', {
        name: formData.name,
        boardIds: formData.boardIds,
        expiresAt: formData.expiresAt || null,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
      });

      if (response.data.success) {
        setShowCreateModal(false);
        setFormData({ name: '', boardIds: [], expiresAt: '', maxUses: '' });
        fetchLinks();
        toast.success('Invite link created!');
      }
    } catch (error) {
      console.error('Error creating link:', error);
      toast.error('Failed to create link');
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Delete this invite link?')) return;

    try {
      const response = await api.delete(`/invite-links/${linkId}`);
      if (response.data.success) {
        fetchLinks();
        toast.success('Link deleted');
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to delete link');
    }
  };

  const handleRevokeLink = async (linkId: string, isActive: boolean) => {
    try {
      const response = await api.put(`/invite-links/${linkId}/revoke`, {
        isActive: !isActive,
      });
      if (response.data.success) {
        fetchLinks();
        toast.success(isActive ? 'Link revoked' : 'Link reactivated');
      }
    } catch (error) {
      console.error('Error revoking link:', error);
      toast.error('Failed to update link');
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const toggleBoardSelection = (boardId: string) => {
    setFormData((prev) => ({
      ...prev,
      boardIds: prev.boardIds.includes(boardId)
        ? prev.boardIds.filter((id) => id !== boardId)
        : [...prev.boardIds, boardId],
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Board Access Links
            </h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Create and manage user invitation links
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Link
          </button>
        </div>
      </div>

      {/* Links List */}
      {loading ? (
        <div className="text-center py-8">Loading links...</div>
      ) : (
        <>
          {links.length > 0 ? (
            <div className="space-y-4">
              {links.map((link) => {
                const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                const isFull = link.maxUses && link.usedCount >= link.maxUses;

                return (
                  <div
                    key={link.id}
                    className={`p-6 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className={`text-lg font-bold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {link.name || 'Unnamed Link'}
                        </h3>
                        <p className={`text-sm mt-1 ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Boards: {link.boardIds.map((bid) => boards.find((b) => b.id === bid)?.name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isExpired || isFull || !link.isActive
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {!link.isActive ? 'Revoked' : isExpired ? 'Expired' : isFull ? 'Full' : 'Active'}
                        </span>
                      </div>
                    </div>

                    {/* Link URL */}
                    <div className={`p-3 rounded-lg mb-4 flex items-center justify-between ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                    }`}>
                      <code className={`text-xs font-mono ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {window.location.origin}/invite/{link.token}
                      </code>
                      <button
                        onClick={() => copyToClipboard(link.token)}
                        className={`p-2 rounded-lg ${
                          theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stats */}
                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <div>
                        <p className="text-xs opacity-75">Used</p>
                        <p className="font-bold">{link.usedCount}{link.maxUses ? `/${link.maxUses}` : ''}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Expires</p>
                        <p className="font-bold">
                          {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Created</p>
                        <p className="font-bold">{new Date(link.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-75">Status</p>
                        <p className="font-bold">{link.isActive ? 'Active' : 'Revoked'}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRevokeLink(link.id, link.isActive)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          link.isActive
                            ? theme === 'dark'
                              ? 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/30'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : theme === 'dark'
                            ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {link.isActive ? 'Revoke' : 'Reactivate'}
                      </button>
                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === 'dark'
                            ? 'bg-red-900/20 text-red-400 hover:bg-red-900/30'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`p-8 text-center rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-gray-400'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              No invite links created yet
            </div>
          )}
        </>
      )}

      {/* Create Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className={`rounded-lg p-6 w-full max-w-md my-8 ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Generate Invite Link
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-1 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Link Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                  placeholder="e.g., Support Team Access"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select Boards *
                </label>
                <div className="space-y-2">
                  {boards.map((board) => (
                    <label key={board.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.boardIds.includes(board.id)}
                        onChange={() => toggleBoardSelection(board.id)}
                        className="w-4 h-4"
                      />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {board.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Max Uses (Optional)
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-200'
                  }`}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLink}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
