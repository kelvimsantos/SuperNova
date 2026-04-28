// hooks/useQuestStore.js
import { create } from 'zustand';

export const QuestStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REWARDED: 'rewarded',
  ABANDONED: 'abandoned'
};


const useQuestStore = create((set, get) => ({
  // Estado do diálogo
  showQuestDialog: false,
  currentQuest: null,
  currentNpcName: '',
  currentQuestStatus: null,
  
  // Lista de todas as quests do jogador
  playerQuests: {}, // { questId: { status, progress, takenAt }}
  
  openQuestDialog: (quest, npcName, status) => set({
    showQuestDialog: true,
    currentQuest: quest,
    currentNpcName: npcName,
    currentQuestStatus: status
  }),
  
  closeQuestDialog: () => set({
    showQuestDialog: false,
    currentQuest: null,
    currentNpcName: '',
    currentQuestStatus: null
  }),
  
  // 🔥 GERENCIAMENTO DE QUESTS
  startQuest: (questId) => set((state) => ({
    playerQuests: {
      ...state.playerQuests,
      [questId]: {
        status: QuestStatus.IN_PROGRESS,
        takenAt: Date.now(),
        progress: 0
      }
    }
  })),
  
  updateQuestProgress: (questId, progress) => set((state) => ({
    playerQuests: {
      ...state.playerQuests,
      [questId]: {
        ...state.playerQuests[questId],
        progress: progress
      }
    }
  })),
  
  completeQuest: (questId) => set((state) => ({
    playerQuests: {
      ...state.playerQuests,
      [questId]: {
        ...state.playerQuests[questId],
        status: QuestStatus.COMPLETED
      }
    }
  })),
  
  rewardQuest: (questId) => set((state) => ({
    playerQuests: {
      ...state.playerQuests,
      [questId]: {
        ...state.playerQuests[questId],
        status: QuestStatus.REWARDED
      }
    }
  })),
  
  abandonQuest: (questId) => set((state) => {
    const newQuests = { ...state.playerQuests };
    delete newQuests[questId];
    return { playerQuests: newQuests };
  }),
  
  getQuestStatus: (questId) => {
    const state = get();
    return state.playerQuests[questId]?.status || QuestStatus.NOT_STARTED;
  },
  // hooks/useQuestStore.js - Adicione esta função
setQuestFromSave: (questId, questData) => set((state) => ({
  playerQuests: {
    ...state.playerQuests,
    [questId]: questData
  }
})),
  
  getAllQuests: () => {
    const state = get();
    return state.playerQuests;
  }
}));

export default useQuestStore;