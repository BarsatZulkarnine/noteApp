import { Ionicons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwipeRow } from '@/components/swipe-row';
import { toast } from '@/components/toast';
import { Card, EmptyState, Fab, IconButton, Pill, ScreenTitle, useColors } from '@/components/ui';
import { LABEL_COLORS, Spacing } from '@/constants/theme';
import type { Note } from '@/lib/types';
import { useNotesStore } from '@/store/notesStore';

function preview(note: Note): string {
  if (note.type === 'checklist') {
    const done = note.items.filter((i) => i.done).length;
    return note.items.length ? `${done}/${note.items.length} done` : 'Empty checklist';
  }
  if (note.images.length || note.sketches.length) return `${note.images.length + note.sketches.length} attachment(s)`;
  return note.body.trim().split('\n')[0] || 'Empty note';
}

export default function NotesScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notes = useNotesStore((s) => s.notes);
  const addNote = useNotesStore((s) => s.addNote);
  const togglePin = useNotesStore((s) => s.togglePin);
  const toggleArchive = useNotesStore((s) => s.toggleArchive);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const restoreNote = useNotesStore((s) => s.restoreNote);
  const reorderNotes = useNotesStore((s) => s.reorderNotes);

  const [showArchived, setShowArchived] = useState(false);
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [notes]);

  const visible = useMemo(() => {
    return notes
      .filter((n) => n.archived === showArchived)
      .filter((n) => (tag ? n.tags.includes(tag) : true))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const ao = a.order ?? -1;
        const bo = b.order ?? -1;
        if (ao !== bo) return ao - bo;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, showArchived, tag]);

  const remove = (note: Note) => {
    deleteNote(note.id);
    toast('Note deleted', 'Undo', () => restoreNote(note));
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Note>) => (
    <SwipeRow
      actions={[
        { icon: item.archived ? 'arrow-undo' : 'archive', label: item.archived ? 'Unarchive' : 'Archive', color: c.textSecondary, onPress: () => toggleArchive(item.id) },
        { icon: 'trash', label: 'Delete', color: c.danger, onPress: () => remove(item) },
      ]}
    >
      <Pressable
        onPress={() => router.push(`/note/${item.id}`)}
        onLongPress={drag}
        style={({ pressed }) => ({ opacity: pressed || isActive ? 0.6 : 1, marginBottom: Spacing.two })}
      >
        <Card style={styles.row}>
          {item.color ? (
            <View style={[styles.colorDot, { backgroundColor: LABEL_COLORS[item.color] }]} />
          ) : (
            <Ionicons name={item.type === 'checklist' ? 'checkbox-outline' : 'reader-outline'} size={22} color={c.textSecondary} />
          )}
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{item.title || 'Untitled'}</Text>
            <Text style={[styles.rowSub, { color: c.textSecondary }]} numberOfLines={1}>{preview(item)}</Text>
            {item.dueAt || item.tags.length > 0 ? (
              <View style={styles.metaRow}>
                {item.dueAt ? (
                  <View style={styles.badge}>
                    <Ionicons name="alarm-outline" size={12} color={isPast(item.dueAt) ? c.danger : c.textSecondary} />
                    <Text style={{ color: isPast(item.dueAt) ? c.danger : c.textSecondary, fontSize: 12 }}>{format(item.dueAt, 'MMM d, h:mm a')}</Text>
                  </View>
                ) : null}
                {item.tags.slice(0, 3).map((t) => (
                  <Text key={t} style={[styles.tag, { color: c.textMuted }]}>#{t}</Text>
                ))}
              </View>
            ) : null}
          </View>
          {!item.archived ? (
            <IconButton name={item.pinned ? 'bookmark' : 'bookmark-outline'} color={item.pinned ? c.tint : c.textMuted} onPress={() => togglePin(item.id)} />
          ) : null}
        </Card>
      </Pressable>
    </SwipeRow>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScreenTitle
        right={
          <View style={styles.headerBtns}>
            <IconButton name={showArchived ? 'documents-outline' : 'archive-outline'} onPress={() => setShowArchived((v) => !v)} color={showArchived ? c.tint : c.textSecondary} />
            <IconButton name="search" onPress={() => router.push('/search')} />
          </View>
        }
      >
        {showArchived ? 'Archived' : 'Notes'}
      </ScreenTitle>

      {allTags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagBar}>
          <Pill label="All" active={tag === null} onPress={() => setTag(null)} />
          {allTags.map((t) => (
            <Pill key={t} label={`#${t}`} active={tag === t} onPress={() => setTag(tag === t ? null : t)} />
          ))}
        </ScrollView>
      ) : null}

      <DraggableFlatList
        data={visible}
        keyExtractor={(n) => n.id}
        onDragEnd={({ data }) => reorderNotes(data.map((n) => n.id))}
        contentContainerStyle={visible.length === 0 ? styles.flex : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon={showArchived ? 'archive-outline' : 'document-text-outline'}
            title={showArchived ? 'No archived notes' : 'No notes yet'}
            subtitle={showArchived ? 'Archived notes show up here.' : 'Tap + to jot a note. Hold a note to reorder.'}
          />
        }
        renderItem={renderItem}
      />
      {!showArchived ? <Fab onPress={() => router.push(`/note/${addNote('text')}`)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flexGrow: 1 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  tagBar: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.two },
  list: { padding: Spacing.three, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginHorizontal: 4 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 17, fontWeight: '700' },
  rowSub: { fontSize: 14, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 4, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tag: { fontSize: 12, fontWeight: '600' },
});
