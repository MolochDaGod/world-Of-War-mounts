/**
 * buildStore — lightweight Zustand store for build-mode UI state.
 *
 * Kept separate from worldStore to avoid polluting persistent game state
 * with transient UI choices. None of these values need to survive a refresh.
 */
import { create } from 'zustand';

export interface BuildState {
  /** Whether the player is currently in build/placement mode. */
  active: boolean;
  /** ID of the currently selected BuildPiece (from BuildCatalog). */
  selectedId: string | null;
  /** Ghost rotation in 90° increments (0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°). */
  rotation: number;
  /** Currently open build panel tab. */
  activeTab: BuildTab;

  activate: (pieceId: string) => void;
  deactivate: () => void;
  selectPiece: (pieceId: string) => void;
  rotateGhost: () => void;
  setTab: (tab: BuildTab) => void;
}

export type BuildTab = 'fortifications' | 'buildings' | 'camp' | 'nature';

export const useBuildStore = create<BuildState>((set) => ({
  active:     false,
  selectedId: null,
  rotation:   0,
  activeTab:  'fortifications',

  activate:    (pieceId) => set({ active: true, selectedId: pieceId }),
  deactivate:  ()        => set({ active: false, selectedId: null, rotation: 0 }),
  selectPiece: (pieceId) => set({ selectedId: pieceId, active: true }),
  rotateGhost: ()        => set((s) => ({ rotation: (s.rotation + 1) % 4 })),
  setTab:      (tab)     => set({ activeTab: tab }),
}));
