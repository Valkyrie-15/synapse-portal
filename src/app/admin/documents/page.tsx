"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DOC_TYPES = [
  { value: "HOSPITAL_CONTRACT", label: "Hospital Contract" },
  { value: "SURGICAL_PACKAGES", label: "Surgical Packages" },
  { value: "SOP", label: "SOP" },
  { value: "CIRCULAR", label: "Circular" },
  { value: "CASHLESS_MANUAL", label: "Cashless Manual" },
  { value: "ESCALATION_MATRIX", label: "Escalation Matrix" },
  { value: "FAQ", label: "FAQ" },
];

type Document = {
  id: string;
  type: string;
  title: string;
  url: string;
  isActive: boolean;
  insurerId: string;
  insurer: { name: string };
};

type Insurer = { id: string; name: string };

const emptyForm = { insurerId: "", type: "", title: "", url: "" };

export default function DocumentsAdminPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterInsurerId, setFilterInsurerId] = useState("all");

  async function fetchDocuments() {
    const url = filterInsurerId && filterInsurerId !== "all"
      ? `/api/admin/documents?insurerId=${filterInsurerId}`
      : "/api/admin/documents";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/admin/insurers").then((r) => r.json()).then((d) => setInsurers(d.insurers || []));
  }, []);

  useEffect(() => { fetchDocuments(); }, [filterInsurerId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(doc: Document) {
    setEditing(doc);
    setForm({ insurerId: doc.insurerId, type: doc.type, title: doc.title, url: doc.url });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/documents/${editing.id}` : "/api/admin/documents";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
        return;
      }
      toast.success(editing ? "Document updated" : "Document created");
      setDialogOpen(false);
      fetchDocuments();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Document deleted");
      fetchDocuments();
    } else {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  }

  const docLabel = (type: string) => DOC_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500 text-sm mt-1">Manage portal documents and resources</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Document
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Label className="text-sm">Filter by insurer:</Label>
        <Select value={filterInsurerId} onValueChange={setFilterInsurerId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All insurers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All insurers</SelectItem>
            {insurers.map((ins) => (
              <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insurer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium text-slate-700 text-sm">{doc.insurer.name}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                      {docLabel(doc.type)}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-700 text-sm">{doc.title}</TableCell>
                  <TableCell>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline text-xs max-w-[200px] truncate"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{doc.url}</span>
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(doc.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document" : "Add Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Insurer *</Label>
              <Select value={form.insurerId} onValueChange={(v) => setForm({ ...form, insurerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select insurer" /></SelectTrigger>
                <SelectContent>
                  {insurers.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Document Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>URL *</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.insurerId || !form.type || !form.title || !form.url}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Document?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
