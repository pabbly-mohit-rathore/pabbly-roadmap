import { useEffect, useState } from 'react';
import { Search, X, XCircle, Users, Shield, UserCog, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import api from '../../services/api';
import LoadingBar from '../../components/ui/LoadingBar';
import LoadingButton from '../../components/ui/LoadingButton';
import CustomDropdown from '../../components/ui/CustomDropdown';
import toast from 'react-hot-toast';

interface TeamMember {
  id: string;
  userId: string;
  boardId: string;
  accessLevel: string;
  createdAt: string;
  status?: 'accepted' | 'pending';
  user: { id: string; name: string; email: string; avatar?: string };
  board: { id: string; name: string; slug: string; color: string };
}

interface Board {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Stats {
  uniqueTeamMembers: number;
  adminAccessCount: number;
  managerAccessCount: number;
}

export default function AdminTeamMembers({ triggerCreate }: { triggerCreate?: number }) {
  const theme = useThemeStore((state) => state.theme);
  const d = theme === 'dark';

  const [stats, setStats] = useState<Stats>({ uniqueTeamMembers: 0, adminAccessCount: 0, managerAccessCount: 0 });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState<TeamMember | null>(null);
  const [updateAccessLevel, setUpdateAccessLevel] = useState<'admin' | 'manager'>('manager');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Pagination for Team Members table
  const [tmPage, setTmPage] = useState(0);
  const [tmRowsPerPage, setTmRowsPerPage] = useState(10);
  const [tmDenseMode, setTmDenseMode] = useState(false);
  const [tmRowsDropOpen, setTmRowsDropOpen] = useState(false);

  const [adding, setAdding] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    boardId: '',
    accessLevel: 'manager' as 'admin' | 'manager',
  });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (triggerCreate && triggerCreate > 0) {
      setFormData(prev => ({ ...prev, boardId: boards.length > 0 ? boards[0].id : '' }));
      setShowAddModal(true);
    }
  }, [triggerCreate]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, membersRes, boardsRes] = await Promise.all([
        api.get('/team-members/stats'),
        api.get('/team-members'),
        api.get('/boards'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (membersRes.data.success) setMembers(membersRes.data.data.members);
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

    setAdding(true);
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
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove access for this team member?')) return;
    setRemovingId(memberId);
    try {
      const res = await api.delete(`/team-members/${memberId}`);
      if (res.data.success) {
        toast.success('Access removed successfully');
        setOpenMenuId(null);
        fetchAll();
      }
    } catch (error) {
      toast.error('Failed to remove access');
    } finally {
      setRemovingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;
    setRemovingId(invitationId);
    try {
      const res = await api.delete(`/team-members/invitations/${invitationId}`);
      if (res.data.success) {
        toast.success('Invitation cancelled');
        fetchAll();
      }
    } catch (error) {
      toast.error('Failed to cancel invitation');
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateAccess = async () => {
    if (!showUpdateModal) return;
    setUpdatingAccess(true);
    try {
      const res = await api.put(`/team-members/${showUpdateModal.id}`, { accessLevel: updateAccessLevel });
      if (res.data.success) {
        toast.success('Access updated successfully');
        setShowUpdateModal(null);
        fetchAll();
      }
    } catch (error) {
      toast.error('Failed to update access');
    } finally {
      setUpdatingAccess(false);
    }
  };

  const [accessFilter, setAccessFilter] = useState('all');

  const filteredMembers = members.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!m.user.email.toLowerCase().includes(q) && !m.user.name.toLowerCase().includes(q)) return false;
    }
    if (accessFilter !== 'all' && m.accessLevel !== accessFilter) return false;
    return true;
  });

  const tmTotalPages = Math.ceil(filteredMembers.length / tmRowsPerPage);
  const paginatedMembers = filteredMembers.slice(tmPage * tmRowsPerPage, (tmPage + 1) * tmRowsPerPage);

  const STAT_CONFIG: Record<string, { iconColor: string; glowColor: string }> = {
    'Unique Team Members Added': { iconColor: 'text-orange-400', glowColor: 'linear-gradient(180deg, rgba(251,146,60,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
    'Admin Access':              { iconColor: 'text-purple-500', glowColor: 'linear-gradient(180deg, rgba(168,85,247,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
    'Manager Access':            { iconColor: 'text-blue-500',   glowColor: 'linear-gradient(180deg, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0.0) 100%)' },
  };

  const statCards = [
    { label: 'Unique Team Members Added', value: stats.uniqueTeamMembers, icon: Users },
    { label: 'Admin Access', value: stats.adminAccessCount, icon: Shield },
    { label: 'Manager Access', value: stats.managerAccessCount, icon: UserCog },
  ];

  if (loading) {
    return <LoadingBar />;
  }

  const TM_HEADERS = ['S.No', 'Team Member Email', 'Permission Type', 'Status', 'Actions'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Filter Bar */}
      <div className={`p-4 rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by email..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setTmPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>

          <CustomDropdown label="Access Type" value={accessFilter}
            options={[{ value: 'all', label: 'All Access' }, { value: 'admin', label: 'Admin Access' }, { value: 'manager', label: 'Manager Access' }]}
            onChange={(v) => { setAccessFilter(v); setTmPage(0); }} />
        </div>
      </div>

      {/* Team Members Table */}
      <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Team Members</h2>
        </div>

        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
              {TM_HEADERS.map((h, i) => (
                <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                  style={{
                    fontSize: '14px', color: d ? undefined : '#1C252E',
                    textAlign: i === 4 ? 'right' as const : 'left' as const,
                    width: i === 0 ? '80px' : i === 4 ? '70px' : undefined,
                  }}>
                  <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 4 ? '24px' : '16px' }}>{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedMembers.length > 0 ? paginatedMembers.map((member, idx) => (
              <tr key={member.id} className={`border-b border-dashed transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                <td className={`${tmDenseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                  {tmPage * tmRowsPerPage + idx + 1}
                </td>
                <td className={`px-4 ${tmDenseMode ? 'py-1.5' : 'py-4'}`}>
                  <div>
                    <p className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{member.user.name}</p>
                    <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{member.user.email}</p>
                  </div>
                </td>
                <td className={`px-4 ${tmDenseMode ? 'py-1.5' : 'py-4'}`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    member.accessLevel === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {member.accessLevel === 'admin' ? 'Admin Access' : 'Manager Access'}
                  </span>
                </td>
                <td className={`px-4 ${tmDenseMode ? 'py-1.5' : 'py-4'}`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    member.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {member.status === 'pending' ? 'Pending' : 'Active'}
                  </span>
                </td>
                <td className={`${tmDenseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                  <div className="relative inline-block">
                    <button onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {openMenuId === member.id && (
                      <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 whitespace-nowrap ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '160px' }}>
                        <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                        {member.status === 'pending' ? (
                          <button onClick={() => { setOpenMenuId(null); handleCancelInvitation(member.id); }}
                            disabled={removingId === member.id}
                            className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'} ${removingId === member.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <XCircle className="w-[18px] h-[18px] shrink-0" /> {removingId === member.id ? 'Cancelling...' : 'Cancel Invite'}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => {
                              setUpdateAccessLevel(member.accessLevel as 'admin' | 'manager');
                              setShowUpdateModal(member);
                              setOpenMenuId(null);
                            }}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                              <Edit2 className="w-[18px] h-[18px] shrink-0 text-amber-500" /> Update Access
                            </button>
                            <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                            <button onClick={() => handleRemoveMember(member.id)}
                              disabled={removingId === member.id}
                              className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'} ${removingId === member.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <Trash2 className="w-[18px] h-[18px] shrink-0" /> {removingId === member.id ? 'Removing...' : 'Remove Access'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5}>
                <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Users className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                    {searchQuery ? 'No Results Found' : 'No Team Members'}
                  </p>
                  <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                    {searchQuery ? 'No team members match your search' : 'Add your first team member to get started.'}
                  </p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setTmDenseMode(!tmDenseMode)}
              className={`relative w-9 h-5 rounded-full transition-colors ${tmDenseMode ? 'bg-[#0c68e9]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tmDenseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
              <div className="relative">
                <button onClick={() => setTmRowsDropOpen(!tmRowsDropOpen)}
                  className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                  {tmRowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tmRowsDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {tmRowsDropOpen && (
                  <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    {[10, 25, 50, 100].map(n => (
                      <button key={n} onClick={() => { setTmRowsPerPage(n); setTmRowsDropOpen(false); setTmPage(0); }}
                        className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                          tmRowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                          : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                        }`}>{n}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
              {filteredMembers.length > 0 ? `${tmPage * tmRowsPerPage + 1}–${Math.min((tmPage + 1) * tmRowsPerPage, filteredMembers.length)}` : '0–0'} of {filteredMembers.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setTmPage(Math.max(0, tmPage - 1))} disabled={tmPage === 0}
                className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setTmPage(Math.min(tmTotalPages - 1, tmPage + 1))} disabled={tmPage >= tmTotalPages - 1}
                className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {tmRowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setTmRowsDropOpen(false)} />}
      </div>

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}

      {/* Add Team Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Email */}
              <div>
                <div className="relative">
                  <input type="email" value={formData.email} placeholder=" "
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ padding: '16.5px 14px' }}
                    className={`peer w-full rounded-lg border text-sm outline-none transition-colors ${
                      d ? 'border-gray-700 bg-gray-800 text-white focus:border-gray-400' : 'border-gray-300 bg-white text-gray-900 focus:border-gray-400'
                    }`} />
                  <span className={`absolute left-2.5 px-1 text-sm transition-all pointer-events-none
                    top-1/2 -translate-y-1/2
                    peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[11px] peer-focus:font-medium
                    peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-medium
                    ${d ? 'text-gray-400 bg-gray-900' : 'text-gray-500 bg-white'}`}>Email Address *</span>
                </div>
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Ensure that the email address is already registered.</p>
              </div>

              {/* Access Level */}
              <div className="relative z-[60]">
                <CustomDropdown label="Access Level *" value={formData.accessLevel}
                  options={[{ value: 'admin', label: 'Admin Access' }, { value: 'manager', label: 'Manager Access' }]}
                  onChange={(v) => setFormData({ ...formData, accessLevel: v as 'admin' | 'manager' })}
                  minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} portalMode />
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Admin (full) or Manager (limited).</p>
              </div>

              {/* Points to Remember */}
              <div className={`p-4 rounded-lg ${d ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-bold mb-2 ${d ? 'text-gray-200' : 'text-gray-800'}`}>Points To Remember</h3>
                <ul className={`text-xs space-y-1.5 list-disc pl-4 ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  <li>'Admin Access' role has full access to all features for the shared board.</li>
                  <li>'Manager Access' can create and edit but cannot delete.</li>
                  <li>Team members will not have access to general settings or team member management.</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowAddModal(false); setFormData({ email: '', boardId: '', accessLevel: 'manager' }); }}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleAddMember} loading={adding}
                  className="px-3 py-1.5 bg-[#009966] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Add Member</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Access Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ maxWidth: '600px' }}>
            <div className={`flex items-center justify-between border-b ${d ? 'border-gray-700' : 'border-gray-200'}`} style={{ padding: '24px' }}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Update Access</h2>
              <button onClick={() => setShowUpdateModal(null)} className={`p-2 rounded-lg ${d ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-5" style={{ padding: '24px' }}>
              {/* Member Info (read-only) */}
              <div className={`w-full rounded-lg border flex items-center ${d ? 'border-gray-700 bg-gray-800/60' : 'border-gray-300 bg-gray-50'}`} style={{ padding: '16.5px 14px' }}>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`}>Team Member</p>
                  <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-gray-900'}`}>{showUpdateModal.user.name} — {showUpdateModal.user.email}</p>
                </div>
              </div>

              {/* Board Info (read-only) */}
              <div className={`w-full rounded-lg border flex items-center ${d ? 'border-gray-700 bg-gray-800/60' : 'border-gray-300 bg-gray-50'}`} style={{ padding: '16.5px 14px' }}>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`}>Board</p>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: showUpdateModal.board.color }} />
                    <p className={`text-sm font-medium truncate ${d ? 'text-white' : 'text-gray-900'}`}>{showUpdateModal.board.name}</p>
                  </div>
                </div>
              </div>

              {/* Access Level */}
              <div className="relative z-[60]">
                <CustomDropdown label="Access Level *" value={updateAccessLevel}
                  options={[{ value: 'admin', label: 'Admin Access (full access)' }, { value: 'manager', label: 'Manager Access (limited access)' }]}
                  onChange={(v) => setUpdateAccessLevel(v as 'admin' | 'manager')}
                  minWidth="100%" bgClass={d ? 'bg-gray-900' : 'bg-white'} portalMode />
                <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`} style={{ margin: '8px 14px 0' }}>Change the access level for this team member.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowUpdateModal(null)}
                  className={`px-3 py-1.5 text-sm font-medium border transition-colors ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} style={{ borderRadius: '8px' }}>Cancel</button>
                <LoadingButton onClick={handleUpdateAccess} loading={updatingAccess}
                  className="px-3 py-1.5 bg-[#009966] text-white text-sm font-medium hover:bg-[#047857] transition-colors disabled:opacity-70" style={{ borderRadius: '8px' }}>Update Access</LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
