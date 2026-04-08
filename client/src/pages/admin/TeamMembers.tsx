import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Users, Share2, FolderInput, MoreVertical } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import CustomDropdown from '../../components/ui/CustomDropdown';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  userId: string;
  boardId: string;
  accessLevel: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatar?: string };
  board: { id: string; name: string; slug: string; color: string };
}

interface Board {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SharedBoard {
  id: string;
  accessLevel: string;
  createdAt: string;
  board: { id: string; name: string; slug: string; color: string; description?: string };
}

interface Stats {
  uniqueTeamMembers: number;
  boardsSharedByYou: number;
  boardsSharedWithYou: number;
}

export default function AdminTeamMembers() {
  const theme = useThemeStore((state) => state.theme);
  const { user } = useAuthStore();
  const { enterTeamAccess } = useTeamAccessStore();
  const navigate = useNavigate();
  const d = theme === 'dark';

  const [stats, setStats] = useState<Stats>({ uniqueTeamMembers: 0, boardsSharedByYou: 0, boardsSharedWithYou: 0 });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedBoard[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState<TeamMember | null>(null);
  const [updateAccessLevel, setUpdateAccessLevel] = useState<'admin' | 'manager'>('manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    boardId: '',
    accessLevel: 'manager' as 'admin' | 'manager',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, membersRes, sharedRes, boardsRes] = await Promise.all([
        api.get('/team-members/stats'),
        api.get('/team-members'),
        api.get('/team-members/shared-with-me'),
        api.get('/boards'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (membersRes.data.success) setMembers(membersRes.data.data.members);
      if (sharedRes.data.success) setSharedWithMe(sharedRes.data.data.memberships);
      if (boardsRes.data.success) setBoards(boardsRes.data.data.boards);
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.email.trim()) { toast.error('Enter team member email'); return; }
    if (!formData.boardId) { toast.error('Select a board'); return; }

    try {
      const res = await api.post('/team-members', formData);
      if (res.data.success) {
        toast.success('Team member added successfully');
        setShowAddModal(false);
        setFormData({ email: '', boardId: '', accessLevel: 'manager' });
        fetchAll();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add team member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove access for this team member?')) return;
    try {
      const res = await api.delete(`/team-members/${memberId}`);
      if (res.data.success) {
        toast.success('Access removed successfully');
        setOpenMenuId(null);
        fetchAll();
      }
    } catch (error) {
      toast.error('Failed to remove access');
    }
  };

  const handleUpdateAccess = async () => {
    if (!showUpdateModal) return;
    try {
      const res = await api.put(`/team-members/${showUpdateModal.id}`, { accessLevel: updateAccessLevel });
      if (res.data.success) {
        toast.success('Access updated successfully');
        setShowUpdateModal(null);
        fetchAll();
      }
    } catch (error) {
      toast.error('Failed to update access');
    }
  };

  // Group members by user for display
  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.user.email.toLowerCase().includes(q) || m.user.name.toLowerCase().includes(q);
  });

  const STAT_CONFIG: Record<string, { iconColor: string; glowColor: string }> = {
    'Unique Team Members Added': { iconColor: 'text-orange-400', glowColor: 'linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
    'Boards Shared by You':     { iconColor: 'text-green-500',  glowColor: 'linear-gradient(180deg, rgba(34,197,94,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
    'Boards Shared With You':   { iconColor: 'text-blue-400',   glowColor: 'linear-gradient(180deg, rgba(96,165,250,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
  };

  const statCards = [
    { label: 'Unique Team Members Added', value: stats.uniqueTeamMembers, icon: Users },
    { label: 'Boards Shared by You', value: stats.boardsSharedByYou, icon: Share2 },
    { label: 'Boards Shared With You', value: stats.boardsSharedWithYou, icon: FolderInput },
  ];

  if (loading) {
    return <LoadingBar />;
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const cfg = STAT_CONFIG[card.label];
          return (
            <div key={card.label}
              className={`relative flex items-center justify-between overflow-hidden rounded-2xl border ${
                d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
              }`}
              style={{ padding: '24px 20px 24px 24px', boxShadow: d ? 'none' : '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div className="relative z-10">
                <p className={`font-extrabold mb-1 leading-none ${d ? 'text-white' : ''}`}
                  style={{ fontSize: '28px', color: d ? undefined : '#1c252e' }}>
                  {card.value}
                </p>
                <p className={`text-sm font-medium mt-1.5 ${d ? 'text-gray-400' : ''}`}
                  style={!d ? { color: '#637381' } : {}}>{card.label}</p>
              </div>
              <div
                className="absolute flex items-center justify-center"
                style={{
                  width: '110px',
                  height: '110px',
                  right: '-30px',
                  top: '50%',
                  transform: 'translateY(-50%) rotate(45deg)',
                  borderRadius: '16px',
                  background: cfg.glowColor,
                }}
              >
                <Icon className={`w-7 h-7 ${cfg.iconColor}`} style={{ transform: 'rotate(-45deg)', marginRight: '20px' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Team Members Table */}
      <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-5 pb-0">
          <h2 className={`text-xl font-bold mb-4 ${d ? 'text-white' : 'text-gray-900'}`}>Team Members</h2>

          {/* Search & Actions Bar */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 max-w-md ${
              d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent text-sm outline-none w-full ${
                  d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0c68e9] text-white text-sm font-medium rounded-lg hover:bg-[#0b5dd0] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Team Member
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflow: 'visible' }}>
          <table className="w-full">
            <thead className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
              <tr>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>S.No</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Team Member Email</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board Shared</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Permission Type</th>
                <th className={`px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member, idx) => (
                  <tr key={member.id} className={`border-t ${d ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`px-5 py-4 text-sm font-medium ${d ? 'text-blue-400' : 'text-blue-600'}`}>{idx + 1}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{member.user.name}</p>
                        <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{member.user.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: member.board.color }} />
                        <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>{member.board.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        member.accessLevel === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {member.accessLevel === 'admin' ? 'Admin Access' : 'Manager Access'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          className={`p-2 rounded-lg transition-colors ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        {openMenuId === member.id && (
                          <div className={`absolute right-0 bottom-full mb-1 w-44 rounded-lg shadow-2xl z-[9999] overflow-hidden ${
                            d ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                          }`}>
                            <button
                              onClick={() => {
                                setUpdateAccessLevel(member.accessLevel as 'admin' | 'manager');
                                setShowUpdateModal(member);
                                setOpenMenuId(null);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                                d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              Update Access
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className={`w-full px-4 py-2.5 text-left text-sm text-red-500 transition-colors ${
                                d ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                              }`}
                            >
                              Remove Access
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={`px-5 py-10 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    {searchQuery ? 'No team members match your search' : 'No team members added yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Boards Shared With You Table */}
      <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="p-5 pb-0">
          <h2 className={`text-xl font-bold mb-4 ${d ? 'text-white' : 'text-gray-900'}`}>Boards Shared With You</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
              <tr>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>S.No</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Shared On</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board Name</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Permission Type</th>
                <th className={`px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider ${d ? 'text-gray-400' : 'text-gray-500'}`}>Access Board</th>
              </tr>
            </thead>
            <tbody>
              {sharedWithMe.length > 0 ? (
                sharedWithMe.map((item, idx) => (
                  <tr key={item.id} className={`border-t ${d ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`px-5 py-4 text-sm font-medium ${d ? 'text-blue-400' : 'text-blue-600'}`}>{idx + 1}</td>
                    <td className={`px-5 py-4 text-sm ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                      {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.board.color }} />
                        <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{item.board.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.accessLevel === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.accessLevel === 'admin' ? 'Full Access' : 'Manager Access'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => {
                          enterTeamAccess({
                            accessLevel: item.accessLevel,
                            boardId: item.board.id,
                            boardName: item.board.name,
                            memberName: user?.name || '',
                          });
                          navigate('/admin/dashboard');
                        }}
                        className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          d ? 'border-blue-500 text-blue-400 hover:bg-blue-500/10' : 'border-blue-500 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        Access Now
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={`px-5 py-10 text-center text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    No boards shared with you yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Team Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-md ${d ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-1 rounded-lg ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Email */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                  Pabbly Account Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sample@example.com"
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                    d ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <p className={`text-xs mt-1.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  Ensure that the email address is already registered.
                </p>
              </div>

              {/* Board Selection */}
              <div>
                <CustomDropdown
                  label="Board"
                  value={formData.boardId}
                  options={[{ value: '', label: 'Select Board' }, ...boards.map(b => ({ value: b.id, label: b.name }))]}
                  onChange={(v) => setFormData({ ...formData, boardId: v })}
                  minWidth="100%"
                  bgClass={d ? 'bg-gray-800' : 'bg-white'}
                />
                <p className={`text-xs mt-1.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  Select the board to be shared.
                </p>
              </div>

              {/* Access Type */}
              <div>
                <CustomDropdown
                  label="Access Level"
                  value={formData.accessLevel}
                  options={[{ value: 'admin', label: 'Admin Access (full access)' }, { value: 'manager', label: 'Manager Access (limited access)' }]}
                  onChange={(v) => setFormData({ ...formData, accessLevel: v as 'admin' | 'manager' })}
                  minWidth="100%"
                  bgClass={d ? 'bg-gray-800' : 'bg-white'}
                />
                <p className={`text-xs mt-1.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  Select the team member role: Admin Access (full access) or Manager Access (limited access).
                </p>
              </div>

              {/* Points to Remember */}
              <div className={`p-4 rounded-lg ${d ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-bold mb-2 ${d ? 'text-gray-200' : 'text-gray-800'}`}>Points To Remember</h3>
                <ul className={`text-xs space-y-1.5 list-disc pl-4 ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  <li>You can share multiple boards with team members.</li>
                  <li>'Admin Access' role has full access to all features for the shared board.</li>
                  <li>'Manager Access' can create and edit but cannot delete.</li>
                  <li>Team members will not have access to general settings or team member management.</li>
                </ul>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={handleAddMember}
                  className="px-6 py-2.5 bg-[#0c68e9] text-white text-sm font-medium rounded-lg hover:bg-[#0b5dd0] transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowAddModal(false); setFormData({ email: '', boardId: '', accessLevel: 'manager' }); }}
                  className={`px-6 py-2.5 rounded-lg border text-sm font-medium ${
                    d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Access Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-sm ${d ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Update Access</h2>
              <button onClick={() => setShowUpdateModal(null)} className={`p-1 rounded-lg ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className={`text-sm mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Team Member</p>
                <p className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{showUpdateModal.user.name}</p>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{showUpdateModal.user.email}</p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: showUpdateModal.board.color }} />
                  <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{showUpdateModal.board.name}</span>
                </div>
              </div>
              <div>
                <CustomDropdown
                  label="Access Level"
                  value={updateAccessLevel}
                  options={[{ value: 'admin', label: 'Admin Access (full access)' }, { value: 'manager', label: 'Manager Access (limited access)' }]}
                  onChange={(v) => setUpdateAccessLevel(v as 'admin' | 'manager')}
                  minWidth="100%"
                  bgClass={d ? 'bg-gray-800' : 'bg-white'}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={handleUpdateAccess}
                  className="px-5 py-2 bg-[#0c68e9] text-white text-sm font-medium rounded-lg hover:bg-[#0b5dd0] transition-colors">
                  Update
                </button>
                <button onClick={() => setShowUpdateModal(null)}
                  className={`px-5 py-2 rounded-lg border text-sm font-medium ${
                    d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
