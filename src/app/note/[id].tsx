import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { format } from 'date-fns';
import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import Markdown from 'react-native-markdown-display';

import { SketchThumb } from '@/components/sketch-thumb';
import { Checkbox, IconButton, Pill, SectionLabel, useColors } from '@/components/ui';
import { LABEL_COLORS, Radius, Spacing } from '@/constants/theme';
import { pickFromLibrary, takePhoto } from '@/lib/images';
import type { ChecklistItem, LabelColor } from '@/lib/types';
import { useNotesStore } from '@/store/notesStore';

const COLOR_KEYS = Object.keys(LABEL_COLORS) as LabelColor[];

export default function NoteEditor() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = useNotesStore((s) => s.notes.find((n) => n.id === id));
  const updateNote = useNotesStore((s) => s.updateNote);
  const addItem = useNotesStore((s) => s.addItem);
  const updateItem = useNotesStore((s) => s.updateItem);
  const toggleItem = useNotesStore((s) => s.toggleItem);
  const deleteItem = useNotesStore((s) => s.deleteItem);
  const reorderItems = useNotesStore((s) => s.reorderItems);
  const setColor = useNotesStore((s) => s.setColor);
  const addTag = useNotesStore((s) => s.addTag);
  const removeTag = useNotesStore((s) => s.removeTag);
  const setDueAt = useNotesStore((s) => s.setDueAt);
  const toggleArchive = useNotesStore((s) => s.toggleArchive);
  const addImage = useNotesStore((s) => s.addImage);
  const removeImage = useNotesStore((s) => s.removeImage);
  const removeSketch = useNotesStore((s) => s.removeSketch);

  const [newItem, setNewItem] = useState('');
  const [newTag, setNewTag] = useState('');
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  if (!note) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <Text style={{ color: c.textSecondary, padding: Spacing.four }}>Note not found.</Text>
      </View>
    );
  }

  const submitItem = () => {
    const text = newItem.trim();
    if (!text) return;
    addItem(note.id, text);
    setNewItem('');
  };

  const submitTag = () => {
    if (!newTag.trim()) return;
    addTag(note.id, newTag);
    setNewTag('');
  };

  const onPickerChange = (_: unknown, date?: Date) => {
    if (picker === 'date') {
      if (!date) return setPicker(null);
      setPendingDate(date);
      setPicker('time');
    } else if (picker === 'time') {
      setPicker(null);
      if (date && pendingDate) {
        const combined = new Date(pendingDate);
        combined.setHours(date.getHours(), date.getMinutes(), 0, 0);
        setDueAt(note.id, combined.getTime());
      }
      setPendingDate(null);
    }
  };

  const onAddPhoto = async () => {
    const uri = await pickFromLibrary();
    if (uri) addImage(note.id, uri);
  };
  const onCamera = async () => {
    const uri = await takePhoto();
    if (uri) addImage(note.id, uri);
  };

  const mdStyles = {
    body: { color: c.text, fontSize: 17, lineHeight: 24 },
    heading1: { color: c.text, fontSize: 24, fontWeight: '800' as const, marginTop: 8 },
    heading2: { color: c.text, fontSize: 20, fontWeight: '700' as const, marginTop: 8 },
    heading3: { color: c.text, fontSize: 18, fontWeight: '700' as const },
    link: { color: c.tint },
    code_inline: { backgroundColor: c.backgroundElement, color: c.text, borderRadius: 4 },
    fence: { backgroundColor: c.backgroundElement, color: c.text, borderColor: c.border },
    blockquote: { backgroundColor: c.backgroundElement, borderColor: c.border, color: c.textSecondary },
  };

  const renderChecklistItem = ({ item: it, drag, isActive }: { item: ChecklistItem; drag: () => void; isActive: boolean }) => (
    <ScaleDecorator>
      <View style={[styles.itemRow, isActive && { opacity: 0.85 }]}>
        <Pressable onLongPress={drag} hitSlop={6}>
          <Ionicons name="reorder-three" size={22} color={c.textMuted} />
        </Pressable>
        <Pressable onPress={() => toggleItem(note.id, it.id)} hitSlop={8}>
          <Checkbox checked={it.done} />
        </Pressable>
        <TextInput
          value={it.text}
          onChangeText={(t) => updateItem(note.id, it.id, { text: t })}
          style={[styles.itemText, { color: it.done ? c.textSecondary : c.text, textDecorationLine: it.done ? 'line-through' : 'none' }]}
        />
        <IconButton name="close" size={18} onPress={() => deleteItem(note.id, it.id)} />
      </View>
    </ScaleDecorator>
  );

  const Header = (
    <View style={{ gap: Spacing.three }}>
      <TextInput
        value={note.title}
        onChangeText={(t) => updateNote(note.id, { title: t })}
        placeholder="Title"
        placeholderTextColor={c.textSecondary}
        style={[styles.title, { color: c.text }]}
      />

      <View style={styles.row}>
        <Pill label="Text" active={note.type === 'text'} onPress={() => updateNote(note.id, { type: 'text' })} />
        <Pill label="Checklist" active={note.type === 'checklist'} onPress={() => updateNote(note.id, { type: 'checklist' })} />
      </View>

      <View style={styles.colorRow}>
        <Pressable onPress={() => setColor(note.id, undefined)} style={[styles.colorChip, styles.colorNone, { borderColor: c.border }, !note.color && { borderColor: c.tint }]}>
          <Ionicons name="ban-outline" size={16} color={c.textMuted} />
        </Pressable>
        {COLOR_KEYS.map((k) => (
          <Pressable key={k} onPress={() => setColor(note.id, k)} style={[styles.colorChip, { backgroundColor: LABEL_COLORS[k] }, note.color === k && { borderWidth: 3, borderColor: c.text }]} />
        ))}
      </View>

      <View style={styles.tagWrap}>
        {note.tags.map((t) => (
          <Pressable key={t} onPress={() => removeTag(note.id, t)} style={[styles.tagChip, { backgroundColor: c.backgroundElement }]}>
            <Text style={{ color: c.text, fontSize: 13 }}>#{t}</Text>
            <Ionicons name="close" size={13} color={c.textSecondary} />
          </Pressable>
        ))}
        <TextInput value={newTag} onChangeText={setNewTag} onSubmitEditing={submitTag} blurOnSubmit={false} placeholder="+ tag" placeholderTextColor={c.textMuted} style={[styles.tagInput, { color: c.text }]} />
      </View>

      <Pressable onPress={() => setPicker('date')} style={[styles.reminderRow, { borderColor: c.border, backgroundColor: c.card }]}>
        <Ionicons name="alarm-outline" size={18} color={note.dueAt ? c.tint : c.textSecondary} />
        <Text style={{ color: note.dueAt ? c.text : c.textSecondary, fontSize: 15, flex: 1 }}>
          {note.dueAt ? format(note.dueAt, 'EEE, MMM d • h:mm a') : 'Add reminder'}
        </Text>
        {note.dueAt ? <IconButton name="close" size={18} onPress={() => setDueAt(note.id, undefined)} /> : null}
      </Pressable>
      {picker ? (
        <DateTimePicker value={pendingDate ?? (note.dueAt ? new Date(note.dueAt) : new Date())} mode={picker} onChange={onPickerChange} />
      ) : null}

      {/* Attachments */}
      <View style={styles.attachBtns}>
        <Pressable onPress={onAddPhoto} style={[styles.attachBtn, { borderColor: c.border }]}>
          <Ionicons name="image-outline" size={18} color={c.text} />
          <Text style={[styles.attachText, { color: c.text }]}>Photo</Text>
        </Pressable>
        <Pressable onPress={onCamera} style={[styles.attachBtn, { borderColor: c.border }]}>
          <Ionicons name="camera-outline" size={18} color={c.text} />
          <Text style={[styles.attachText, { color: c.text }]}>Camera</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/sketch/${note.id}` as Href)} style={[styles.attachBtn, { borderColor: c.border }]}>
          <Ionicons name="brush-outline" size={18} color={c.text} />
          <Text style={[styles.attachText, { color: c.text }]}>Draw</Text>
        </Pressable>
      </View>
      {note.images.length > 0 || note.sketches.length > 0 ? (
        <View style={styles.thumbWrap}>
          {note.images.map((uri) => (
            <View key={uri}>
              <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
              <Pressable onPress={() => removeImage(note.id, uri)} style={[styles.thumbX, { backgroundColor: c.text }]}>
                <Ionicons name="close" size={12} color={c.background} />
              </Pressable>
            </View>
          ))}
          {note.sketches.map((sk) => (
            <View key={sk.id}>
              <SketchThumb sketch={sk} size={96} />
              <Pressable onPress={() => removeSketch(note.id, sk.id)} style={[styles.thumbX, { backgroundColor: c.text }]}>
                <Ionicons name="close" size={12} color={c.background} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {note.type === 'text' ? (
        <>
          <View style={styles.bodyHead}>
            <SectionLabel>Body</SectionLabel>
            <Pill label={preview ? 'Edit' : 'Preview'} onPress={() => setPreview((v) => !v)} />
          </View>
          {preview ? (
            <View style={styles.previewBox}>
              {note.body.trim() ? <Markdown style={mdStyles}>{note.body}</Markdown> : <Text style={{ color: c.textMuted }}>Nothing to preview.</Text>}
            </View>
          ) : (
            <TextInput
              value={note.body}
              onChangeText={(t) => updateNote(note.id, { body: t })}
              placeholder="Start writing… (markdown supported)"
              placeholderTextColor={c.textSecondary}
              multiline
              style={[styles.body, { color: c.text }]}
            />
          )}
        </>
      ) : (
        <SectionLabel>Checklist</SectionLabel>
      )}
    </View>
  );

  const Footer =
    note.type === 'checklist' ? (
      <View style={[styles.itemRow, { marginTop: Spacing.two }]}>
        <Ionicons name="add" size={22} color={c.textSecondary} />
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={submitItem}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder="Add item"
          placeholderTextColor={c.textSecondary}
          style={[styles.itemText, { color: c.text }]}
        />
      </View>
    ) : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: note.type === 'checklist' ? 'Checklist' : 'Note',
          headerRight: () => (
            <IconButton name={note.archived ? 'arrow-undo-outline' : 'archive-outline'} onPress={() => toggleArchive(note.id)} color={c.tint} />
          ),
        }}
      />
      <NestableScrollContainer contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {Header}
        {note.type === 'checklist' ? (
          <NestableDraggableFlatList
            data={note.items}
            keyExtractor={(it) => it.id}
            renderItem={renderChecklistItem}
            onDragEnd={({ data }) => reorderItems(note.id, data)}
          />
        ) : null}
        {Footer}
      </NestableScrollContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  title: { fontSize: 26, fontWeight: '800' },
  row: { flexDirection: 'row', gap: Spacing.two },
  colorRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  colorChip: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  colorNone: { alignItems: 'center', justifyContent: 'center' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.full },
  tagInput: { minWidth: 80, fontSize: 14, paddingVertical: 4 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  attachBtns: { flexDirection: 'row', gap: Spacing.two },
  attachBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  attachText: { fontSize: 14, fontWeight: '600' },
  thumbWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumb: { width: 96, height: 96, borderRadius: Radius.sm },
  thumbX: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bodyHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewBox: { minHeight: 160 },
  body: { fontSize: 17, lineHeight: 24, minHeight: 200, textAlignVertical: 'top' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  itemText: { flex: 1, fontSize: 17, paddingVertical: Spacing.one },
});
