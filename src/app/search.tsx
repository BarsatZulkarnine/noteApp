import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, useColors } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useGroceryStore } from '@/store/groceryStore';
import { useNotesStore } from '@/store/notesStore';
import { useTodosStore } from '@/store/todosStore';

type Result = {
  id: string;
  kind: 'Note' | 'Todo' | 'Grocery';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

export default function SearchScreen() {
  const c = useColors();
  const router = useRouter();
  const [q, setQ] = useState('');
  const notes = useNotesStore((s) => s.notes);
  const todos = useTodosStore((s) => s.todos);
  const grocery = useGroceryStore((s) => s.items);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const out: Result[] = [];

    for (const n of notes) {
      const hay = [n.title, n.body, ...n.items.map((i) => i.text)].join(' ').toLowerCase();
      if (hay.includes(query)) {
        out.push({
          id: n.id,
          kind: 'Note',
          title: n.title || 'Untitled',
          subtitle: n.type === 'checklist' ? `${n.items.length} items` : n.body.slice(0, 60),
          icon: 'document-text-outline',
          href: `/note/${n.id}`,
        });
      }
    }
    for (const t of todos) {
      const hay = [t.title, ...t.items.map((i) => i.text)].join(' ').toLowerCase();
      if (hay.includes(query)) {
        out.push({
          id: t.id,
          kind: 'Todo',
          title: t.title || 'Untitled routine',
          subtitle: `${t.items.length} steps`,
          icon: 'repeat-outline',
          href: `/todo/${t.id}`,
        });
      }
    }
    for (const g of grocery) {
      if (`${g.name} ${g.qty ?? ''}`.toLowerCase().includes(query)) {
        out.push({
          id: g.id,
          kind: 'Grocery',
          title: g.name,
          subtitle: g.low ? 'Running low' : 'In stock',
          icon: 'cart-outline',
          href: '/grocery',
        });
      }
    }
    return out;
  }, [q, notes, todos, grocery]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.searchBar}>
        <Field value={q} onChangeText={setQ} placeholder="Search notes, todos, grocery" autoFocus />
      </View>
      <FlatList
        data={results}
        keyExtractor={(r) => `${r.kind}-${r.id}`}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.textMuted }]}>
            {q.trim() ? 'No matches.' : 'Type to search across everything.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.replace(item.href as never)}
            style={({ pressed }) => [styles.row, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name={item.icon} size={20} color={c.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
            </View>
            <Text style={[styles.kind, { color: c.textMuted }]}>{item.kind}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { padding: Spacing.three },
  list: { paddingHorizontal: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 1 },
  kind: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { textAlign: 'center', marginTop: Spacing.five, fontSize: 14 },
});
