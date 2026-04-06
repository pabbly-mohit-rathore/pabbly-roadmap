import { create } from 'zustand';

interface TeamAccessState {
  isTeamAccess: boolean;
  accessLevel: string | null; // 'admin' or 'manager'
  boardId: string | null;
  boardName: string | null;
  memberName: string | null;
  enterTeamAccess: (data: { accessLevel: string; boardId: string; boardName: string; memberName: string }) => void;
  exitTeamAccess: () => void;
}

const useTeamAccessStore = create<TeamAccessState>((set) => ({
  isTeamAccess: !!localStorage.getItem('teamAccess'),
  accessLevel: JSON.parse(localStorage.getItem('teamAccess') || 'null')?.accessLevel || null,
  boardId: JSON.parse(localStorage.getItem('teamAccess') || 'null')?.boardId || null,
  boardName: JSON.parse(localStorage.getItem('teamAccess') || 'null')?.boardName || null,
  memberName: JSON.parse(localStorage.getItem('teamAccess') || 'null')?.memberName || null,

  enterTeamAccess: (data) => {
    localStorage.setItem('teamAccess', JSON.stringify(data));
    set({
      isTeamAccess: true,
      accessLevel: data.accessLevel,
      boardId: data.boardId,
      boardName: data.boardName,
      memberName: data.memberName,
    });
  },

  exitTeamAccess: () => {
    localStorage.removeItem('teamAccess');
    set({
      isTeamAccess: false,
      accessLevel: null,
      boardId: null,
      boardName: null,
      memberName: null,
    });
  },
}));

export default useTeamAccessStore;
