import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from '@/lib/id';
import { cancelReminder, scheduleOneOff } from '@/lib/notifications';
import type { ChecklistItem, LabelColor, Note, NoteType, Sketch } from '@/lib/types';
import { zustandStorage } from './persist';

type NotesState = {
  notes: Note[];
  addNote: (type: NoteType) => string;
  getNote: (id: string) => Note | undefined;
  updateNote: (id: string, patch: Partial<Omit<Note, 'id' | 'createdAt'>>) => void;
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  setColor: (id: string, color?: LabelColor) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  /** Set or clear a one-off reminder; (re)schedules the OS notification. */
  setDueAt: (id: string, dueAt?: number) => Promise<void>;
  addImage: (id: string, uri: string) => void;
  removeImage: (id: string, uri: string) => void;
  addSketch: (id: string, sketch: Sketch) => void;
  removeSketch: (id: string, sketchId: string) => void;
  reorderItems: (id: string, items: ChecklistItem[]) => void;
  /** Persist a manual ordering of notes (array of ids, top-first). */
  reorderNotes: (orderedIds: string[]) => void;
  deleteNote: (id: string) => void;
  /** Re-insert a previously deleted note (for Undo). */
  restoreNote: (note: Note) => void;
  addItem: (noteId: string, text: string) => void;
  updateItem: (noteId: string, itemId: string, patch: Partial<ChecklistItem>) => void;
  toggleItem: (noteId: string, itemId: string) => void;
  deleteItem: (noteId: string, itemId: string) => void;
};

const touch = (note: Note): Note => ({ ...note, updatedAt: Date.now() });

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote: (type) => {
        const now = Date.now();
        const note: Note = {
          id: uid('note_'),
          title: '',
          type,
          body: '',
          items: [],
          pinned: false,
          archived: false,
          tags: [],
          images: [],
          sketches: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ notes: [note, ...s.notes] }));
        return note.id;
      },

      getNote: (id) => get().notes.find((n) => n.id === id),

      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? touch({ ...n, ...patch }) : n)),
        })),

      togglePin: (id) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? touch({ ...n, pinned: !n.pinned }) : n)),
        })),

      toggleArchive: (id) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? touch({ ...n, archived: !n.archived, pinned: false }) : n,
          ),
        })),

      setColor: (id, color) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? touch({ ...n, color }) : n)),
        })),

      addTag: (id, tag) => {
        const clean = tag.trim().toLowerCase();
        if (!clean) return;
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id && !n.tags.includes(clean)
              ? touch({ ...n, tags: [...n.tags, clean] })
              : n,
          ),
        }));
      },

      removeTag: (id, tag) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? touch({ ...n, tags: n.tags.filter((t) => t !== tag) }) : n,
          ),
        })),

      setDueAt: async (id, dueAt) => {
        const prev = get().notes.find((n) => n.id === id);
        if (!prev) return;
        await cancelReminder(prev.reminderId);
        let reminderId: string | undefined;
        if (dueAt) {
          reminderId = await scheduleOneOff(dueAt, prev.title || 'Note reminder', prev.title ? '' : 'You set a reminder on this note.');
        }
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? touch({ ...n, dueAt, reminderId }) : n)),
        }));
      },

      addImage: (id, uri) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? touch({ ...n, images: [...n.images, uri] }) : n)),
        })),

      removeImage: (id, uri) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? touch({ ...n, images: n.images.filter((u) => u !== uri) }) : n,
          ),
        })),

      addSketch: (id, sketch) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? touch({ ...n, sketches: [...n.sketches, sketch] }) : n)),
        })),

      removeSketch: (id, sketchId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? touch({ ...n, sketches: n.sketches.filter((sk) => sk.id !== sketchId) }) : n,
          ),
        })),

      reorderItems: (id, items) =>
        set((s) => ({ notes: s.notes.map((n) => (n.id === id ? touch({ ...n, items }) : n)) })),

      reorderNotes: (orderedIds) =>
        set((s) => ({
          notes: s.notes.map((n) => {
            const idx = orderedIds.indexOf(n.id);
            return idx === -1 ? n : { ...n, order: idx };
          }),
        })),

      deleteNote: (id) =>
        set((s) => {
          const target = s.notes.find((n) => n.id === id);
          if (target?.reminderId) void cancelReminder(target.reminderId);
          return { notes: s.notes.filter((n) => n.id !== id) };
        }),

      restoreNote: (note) =>
        set((s) => (s.notes.some((n) => n.id === note.id) ? s : { notes: [note, ...s.notes] })),

      addItem: (noteId, text) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? touch({
                  ...n,
                  items: [...n.items, { id: uid('it_'), text, done: false }],
                })
              : n,
          ),
        })),

      updateItem: (noteId, itemId, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? touch({
                  ...n,
                  items: n.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
                })
              : n,
          ),
        })),

      toggleItem: (noteId, itemId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? touch({
                  ...n,
                  items: n.items.map((it) =>
                    it.id === itemId ? { ...it, done: !it.done } : it,
                  ),
                })
              : n,
          ),
        })),

      deleteItem: (noteId, itemId) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === noteId
              ? touch({ ...n, items: n.items.filter((it) => it.id !== itemId) })
              : n,
          ),
        })),
    }),
    {
      name: 'notes-v1',
      storage: zustandStorage,
      version: 2,
      // Backfill fields added in later versions so older persisted notes don't crash the UI.
      migrate: (persisted: unknown) => {
        const state = persisted as NotesState;
        return {
          ...state,
          notes: (state.notes ?? []).map((n) => ({
            ...n,
            archived: n.archived ?? false,
            tags: n.tags ?? [],
            images: n.images ?? [],
            sketches: n.sketches ?? [],
          })),
        };
      },
    },
  ),
);
