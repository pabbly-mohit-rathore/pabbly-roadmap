import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Users, Share2, FolderInput, MoreVertical, Edit2, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import useTeamAccessStore from '../../store/teamAccessStore';
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

export default function AdminTeamMembers({ triggerCreate }: { triggerCreate?: number }) {
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
  const [openSharedMenuId, setOpenSharedMenuId] = useState<string | null>(null);

  // Pagination for Team Members table
  const [tmPage, setTmPage] = useState(0);
  const [tmRowsPerPage, setTmRowsPerPage] = useState(10);
  const [tmDenseMode, setTmDenseMode] = useState(false);
  const [tmRowsDropOpen, setTmRowsDropOpen] = useState(false);

  // Pagination for Shared With You table
  const [swPage, setSwPage] = useState(0);
  const [swRowsPerPage, setSwRowsPerPage] = useState(10);
  const [swDenseMode, setSwDenseMode] = useState(false);
  const [swRowsDropOpen, setSwRowsDropOpen] = useState(false);

  const [adding, setAdding] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    boardId: '',
    accessLevel: 'manager' as 'admin' | 'manager',
  });

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (triggerCreate && triggerCreate > 0) setShowAddModal(true); }, [triggerCreate]);

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

  const filteredMembers = members.filter(m => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.user.email.toLowerCase().includes(q) || m.user.name.toLowerCase().includes(q);
  });

  const tmTotalPages = Math.ceil(filteredMembers.length / tmRowsPerPage);
  const paginatedMembers = filteredMembers.slice(tmPage * tmRowsPerPage, (tmPage + 1) * tmRowsPerPage);

  const swTotalPages = Math.ceil(sharedWithMe.length / swRowsPerPage);
  const paginatedShared = sharedWithMe.slice(swPage * swRowsPerPage, (swPage + 1) * swRowsPerPage);

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

  const TM_HEADERS = ['S.No', 'Team Member Email', 'Board Shared', 'Permission Type', 'Actions'];
  const SW_HEADERS = ['S.No', 'Shared On', 'Board Name', 'Permission Type', 'Actions'];

  return (
    <div className="space-y-6">
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

      {/* Filter Bar */}
      <div className={`p-4 rounded-lg border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`flex items-center gap-2 rounded-lg border flex-1 min-w-[180px] max-w-[380px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} style={{ padding: '0 14px', height: '48px' }}>
            <Search className="w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by email..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setTmPage(0); }}
              className={`bg-transparent text-sm outline-none w-full ${d ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#0C68E9] text-white rounded-lg hover:bg-[#0b5dd0] transition shrink-0"
            style={{ padding: '8px 16px', fontSize: '15px', height: '48px' }}
          >
            <Plus className="w-5 h-5" />
            Add Team Member
          </button>
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
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: member.board.color }} />
                    <span className={`text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>{member.board.name}</span>
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
                <td className={`${tmDenseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
                  <div className="relative inline-block">
                    <button onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      className={`p-1.5 rounded-lg transition ${d ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {openMenuId === member.id && (
                      <div className={`absolute right-0 top-full mt-3 rounded-xl z-50 p-1.5 ${d ? 'bg-gray-700 shadow-xl shadow-black/30' : 'bg-white shadow-[0_4px_24px_rgba(0,0,0,0.12)]'}`} style={{ minWidth: '160px' }}>
                        <div className={`absolute -top-2 right-[10px] w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${d ? 'border-b-gray-700' : 'border-b-white'}`} />
                        <button onClick={() => {
                          setUpdateAccessLevel(member.accessLevel as 'admin' | 'manager');
                          setShowUpdateModal(member);
                          setOpenMenuId(null);
                        }}
                          className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-50 text-gray-800'}`}>
                          <Edit2 className="w-[18px] h-[18px] text-amber-500" /> Update Access
                        </button>
                        <div className={`mx-1 my-1 border-t border-dashed ${d ? 'border-gray-500' : 'border-gray-200'}`} />
                        <button onClick={() => handleRemoveMember(member.id)}
                          disabled={removingId === member.id}
                          className={`w-full px-3 py-2 text-left text-[14px] font-medium flex items-center gap-3 transition-colors rounded-lg ${d ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'} ${removingId === member.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Trash2 className="w-[18px] h-[18px]" /> {removingId === member.id ? 'Removing...' : 'Remove Access'}
                        </button>
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

      {/* Boards Shared With You Table */}
      <div className={`rounded-xl border ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div style={{ padding: '24px 24px 16px 24px' }}>
          <h2 className={`font-bold ${d ? 'text-white' : 'text-gray-900'}`} style={{ fontSize: '18px' }}>Boards Shared With You</h2>
        </div>

        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'} style={{ height: '56.5px' }}>
              {SW_HEADERS.map((h, i) => (
                <th key={h} className={`font-semibold ${d ? 'text-gray-400' : ''}`}
                  style={{
                    fontSize: '14px', color: d ? undefined : '#1C252E',
                    textAlign: i === 4 ? 'right' as const : 'left' as const,
                    width: i === 0 ? '80px' : i === 4 ? '160px' : undefined,
                  }}>
                  <div style={{ paddingLeft: i === 0 ? '24px' : '16px', paddingRight: i === 4 ? '24px' : '16px' }}>{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedShared.length > 0 ? paginatedShared.map((item, idx) => (
              <tr key={item.id} className={`border-b border-dashed transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}`}>
                <td className={`${swDenseMode ? 'py-1.5' : 'py-4'} text-sm font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`} style={{ paddingLeft: '24px' }}>
                  {swPage * swRowsPerPage + idx + 1}
                </td>
                <td className={`px-4 ${swDenseMode ? 'py-1.5' : 'py-4'} text-sm ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </td>
                <td className={`px-4 ${swDenseMode ? 'py-1.5' : 'py-4'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.board.color }} />
                    <span className={`text-sm font-medium ${d ? 'text-white' : 'text-gray-900'}`}>{item.board.name}</span>
                  </div>
                </td>
                <td className={`px-4 ${swDenseMode ? 'py-1.5' : 'py-4'}`}>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.accessLevel === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {item.accessLevel === 'admin' ? 'Full Access' : 'Manager Access'}
                  </span>
                </td>
                <td className={`${swDenseMode ? 'py-1.5' : 'py-4'} text-right`} style={{ paddingRight: '16px' }}>
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
                    className={`whitespace-nowrap px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      d ? 'border-[#0c68e9] text-[#0c68e9] hover:bg-[#0c68e9]/10' : 'border-[#0c68e9] text-[#0c68e9] hover:bg-blue-50'
                    }`}
                  >
                    Access Now
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5}>
                <div className={`flex flex-col items-center justify-center rounded-xl mx-4 my-4 ${d ? 'bg-gray-900/50' : 'bg-gray-50/80'}`} style={{ height: '400px' }}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <FolderInput className={`w-8 h-8 ${d ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                  <p className={`text-base font-semibold mb-1 ${d ? 'text-gray-300' : 'text-gray-600'}`}>No Shared Boards</p>
                  <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>No boards have been shared with you yet.</p>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSwDenseMode(!swDenseMode)}
              className={`relative w-9 h-5 rounded-full transition-colors ${swDenseMode ? 'bg-[#0c68e9]' : (d ? 'bg-gray-600' : 'bg-gray-300')}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${swDenseMode ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Dense</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>Rows per page:</span>
              <div className="relative">
                <button onClick={() => setSwRowsDropOpen(!swRowsDropOpen)}
                  className={`text-sm font-medium cursor-pointer flex items-center gap-1 ${d ? 'text-white' : 'text-gray-800'}`}>
                  {swRowsPerPage} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${swRowsDropOpen ? 'rotate-180' : ''}`} />
                </button>
                {swRowsDropOpen && (
                  <div className={`absolute top-full mt-2 right-0 rounded-lg border shadow-lg z-50 p-1 min-w-[60px] ${d ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                    {[10, 25, 50, 100].map(n => (
                      <button key={n} onClick={() => { setSwRowsPerPage(n); setSwRowsDropOpen(false); setSwPage(0); }}
                        className={`w-full px-3 py-1.5 text-left text-sm rounded-md transition-colors ${
                          swRowsPerPage === n ? (d ? 'bg-gray-600 text-white font-semibold' : 'bg-gray-100 text-gray-800 font-semibold')
                          : (d ? 'text-gray-200 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-50')
                        }`}>{n}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <span className={`text-sm ${d ? 'text-gray-400' : 'text-gray-600'}`}>
              {sharedWithMe.length > 0 ? `${swPage * swRowsPerPage + 1}–${Math.min((swPage + 1) * swRowsPerPage, sharedWithMe.length)}` : '0–0'} of {sharedWithMe.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setSwPage(Math.max(0, swPage - 1))} disabled={swPage === 0}
                className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setSwPage(Math.min(swTotalPages - 1, swPage + 1))} disabled={swPage >= swTotalPages - 1}
                className={`p-1.5 rounded transition disabled:opacity-30 ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {swRowsDropOpen && <div className="fixed inset-0 z-40" onClick={() => setSwRowsDropOpen(false)} />}
      </div>

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}
      {openSharedMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenSharedMenuId(null)} />}

      {/* Add Team Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl w-full max-w-md ${d ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`flex items-center justify-between p-6 border-b ${d ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-1 rounded-lg ${d ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
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

              <div className={`p-4 rounded-lg ${d ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-bold mb-2 ${d ? 'text-gray-200' : 'text-gray-800'}`}>Points To Remember</h3>
                <ul className={`text-xs space-y-1.5 list-disc pl-4 ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  <li>You can share multiple boards with team members.</li>
                  <li>'Admin Access' role has full access to all features for the shared board.</li>
                  <li>'Manager Access' can create and edit but cannot delete.</li>
                  <li>Team members will not have access to general settings or team member management.</li>
                </ul>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <LoadingButton
                  loading={adding}
                  onClick={handleAddMember}
                  className="px-6 py-2.5 bg-[#0c68e9] text-white text-sm font-medium rounded-lg hover:bg-[#0b5dd0] transition-colors"
                >
                  Add
                </LoadingButton>
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
                <LoadingButton loading={updatingAccess} onClick={handleUpdateAccess}
                  className="px-5 py-2 bg-[#0c68e9] text-white text-sm font-medium rounded-lg hover:bg-[#0b5dd0] transition-colors">
                  Update
                </LoadingButton>
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
