import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { PROGRAM_TEMPLATES, ProgramTemplate, TemplateCategory } from './templates';

/**
 * Ready-made programs. Stored in the database so admins can manage them (update-6-program-templates.sql);
 * until that table exists, the built-in list in templates.ts is shown read-only.
 */
const DEMO_KEY = 'fitlogix:templates';
const BUILT_IN: ProgramTemplate[] = PROGRAM_TEMPLATES.map((t, i) => ({ ...t, id: `builtin-${i}`, sort_order: (i + 1) * 10 }));

function readDemo(): ProgramTemplate[] {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* fall through */ }
  return BUILT_IN;
}
const writeDemo = (list: ProgramTemplate[]) => localStorage.setItem(DEMO_KEY, JSON.stringify(list));
const byOrder = (a: ProgramTemplate, b: ProgramTemplate) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

export function useTemplates() {
  const [list, setList] = useState<ProgramTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  /** True when the database table is missing, so the built-in list is shown and editing is off. */
  const [builtInOnly, setBuiltInOnly] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    if (!supabase) { setList(readDemo().sort(byOrder)); setLoading(false); return; }
    const { data, error } = await supabase.from('program_templates').select('*').order('sort_order').order('created_at');
    if (error) { setList(BUILT_IN); setBuiltInOnly(true); }
    else { setList((data ?? []) as ProgramTemplate[]); setBuiltInOnly(false); }
    setLoading(false);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (t: ProgramTemplate) => {
    const row = { ...t, id: t.id ?? crypto.randomUUID() };
    if (!supabase) {
      const next = readDemo().filter((x) => x.id !== row.id).concat(row).sort(byOrder);
      writeDemo(next); setList(next); return row;
    }
    const { data, error } = await supabase.from('program_templates').upsert(row).select().single();
    if (error) throw error;
    setList((prev) => prev.filter((x) => x.id !== row.id).concat(data as ProgramTemplate).sort(byOrder));
    return data as ProgramTemplate;
  }, []);

  const remove = useCallback(async (id: string) => {
    if (!supabase) { const next = readDemo().filter((x) => x.id !== id); writeDemo(next); setList(next); return; }
    const { error } = await supabase.from('program_templates').delete().eq('id', id);
    if (error) throw error;
    setList((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const nextOrder = (category: TemplateCategory) =>
    Math.max(0, ...list.filter((t) => t.category === category).map((t) => t.sort_order ?? 0), ...list.map((t) => t.sort_order ?? 0)) + 10;

  return { list, loading, builtInOnly, reload, save, remove, nextOrder };
}
