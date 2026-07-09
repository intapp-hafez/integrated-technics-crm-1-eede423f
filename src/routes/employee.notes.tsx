import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { newUuid } from "@/lib/supabaseWrites";

export const Route = createFileRoute("/employee/notes")({
  component: EmployeeNotesPage,
});

type StickyNote = {
  id: string;
  profile_id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
};

const COLORS = [
  "bg-yellow-200",
  "bg-blue-200",
  "bg-green-200",
  "bg-pink-200",
  "bg-purple-200",
  "bg-orange-200",
];

function EmployeeNotesPage() {
  const { t, lang } = useI18n();
  const { role } = useRole();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const user = {
    name: profile?.full_name_en || profile?.full_name_ar || "",
    role: t(role as any),
    initials: (profile?.full_name_en || profile?.full_name_ar || "U")
      .split(" ")
      .map((s: string) => s[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  };

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["sticky_notes", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("sticky_notes" as any)
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load notes");
        throw error;
      }
      return data as unknown as StickyNote[];
    },
    enabled: !!profile?.id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Not authenticated");
      const newNote = {
        id: newUuid(),
        profile_id: profile.id,
        title: "",
        content: "",
        color: "bg-yellow-200",
      };
      const { error } = await supabase.from("sticky_notes" as any).insert(newNote);
      if (error) throw error;
      return newNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sticky_notes"] });
      toast.success("Note added");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add note");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async (note: { id: string; title: string; content: string; color: string }) => {
      const { error } = await supabase
        .from("sticky_notes" as any)
        .update({
          title: note.title,
          content: note.content,
          color: note.color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", note.id);
      if (error) throw error;
    },
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: ["sticky_notes", profile?.id] });
      const previousNotes = queryClient.getQueryData(["sticky_notes", profile?.id]);
      queryClient.setQueryData(["sticky_notes", profile?.id], (old: any) =>
        old.map((n: any) => (n.id === newNote.id ? { ...n, ...newNote } : n))
      );
      return { previousNotes };
    },
    onError: (err, newNote, context: any) => {
      queryClient.setQueryData(["sticky_notes", profile?.id], context.previousNotes);
      toast.error("Failed to update note");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sticky_notes", profile?.id] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sticky_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sticky_notes"] });
      toast.success("Note deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete note");
    },
  });

  return (
    <AppShell panel="employee" user={user} pageTitle={t("stickyNotes" as any) || "Sticky Notes"}>
      <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t("stickyNotes" as any) || "Sticky Notes"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "ar" ? "أضف ملاحظاتك وأفكارك السريعة." : "Add your quick thoughts and notes."}
            </p>
          </div>
          <button
            onClick={() => addNoteMutation.mutate()}
            disabled={addNoteMutation.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {lang === "ar" ? "إضافة ملاحظة" : "Add Note"}
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
              {lang === "ar" ? "لا توجد ملاحظات" : "No notes yet"}
            </h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              {lang === "ar"
                ? "ابدأ بإضافة أول ملاحظة لاصقة للحفاظ على أفكارك منظمة."
                : "Start by adding your first sticky note to keep your thoughts organized."}
            </p>
            <button
              onClick={() => addNoteMutation.mutate()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {lang === "ar" ? "إضافة ملاحظة" : "Add Note"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onUpdate={(n) => updateNoteMutation.mutate(n)}
                onDelete={() => deleteNoteMutation.mutate(note.id)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function NoteCard({
  note,
  onUpdate,
  onDelete,
}: {
  note: StickyNote;
  onUpdate: (note: { id: string; title: string; content: string; color: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color || COLORS[0]);
  const [showColors, setShowColors] = useState(false);

  // Debounced update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== note.title || content !== note.content || color !== note.color) {
        onUpdate({ id: note.id, title, content, color });
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, color, note, onUpdate]);

  return (
    <div
      className={`group relative flex flex-col rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md ${color}`}
      style={{ minHeight: "200px" }}
    >
      <div className="mb-2 flex items-start justify-between">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title..."
          className="w-full bg-transparent text-base font-bold text-gray-900 placeholder-gray-900/40 outline-none"
        />
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setShowColors(!showColors)}
            className="p-1 text-gray-700 hover:text-gray-900"
            title="Change Color"
          >
            <div className="h-4 w-4 rounded-full border border-gray-900/20 bg-current opacity-50" />
          </button>
          <button
            onClick={() => onDelete()}
            className="p-1 text-gray-700 hover:text-red-600"
            title="Delete Note"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showColors && (
        <div className="absolute right-4 top-12 z-10 flex gap-1 rounded-lg bg-white/90 p-1.5 shadow-lg backdrop-blur-sm">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                setShowColors(false);
              }}
              className={`flex h-6 w-6 items-center justify-center rounded-full border border-black/10 ${c}`}
            >
              {color === c && <Check className="h-3 w-3 text-black/60" />}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type your note here..."
        className="h-full w-full resize-none bg-transparent text-sm text-gray-800 placeholder-gray-800/40 outline-none"
        spellCheck={false}
      />
    </div>
  );
}
