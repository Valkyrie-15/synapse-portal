"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, ExternalLink, CheckCircle, XCircle } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Insurer = {
  id: string;
  name: string;
  code: string;
  portalUrl: string | null;
  logoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { documents: number; contacts: number };
};

const emptyForm = { name: "", code: "", portalUrl: "", logoUrl: "", sortOrder: 0 };

export default function InsurersAdminPage() {
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Insurer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchInsurers() {
    const res = await fetch("/api/admin/insurers");
    if (res.ok) {
      const data = await res.json();
      setInsurers(data.insurers);
    }
    setLoading(false);
  }

  useEffect(() => { fetchInsurers(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(ins: Insurer) {
    setEditing(ins);
    setForm({
      name: ins.name,
      code: ins.code,
      portalUrl: ins.portalUrl || "",
      logoUrl: ins.logoUrl || "",
      sortOrder: ins.sortOrder,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/insurers/${editing.id}` : "/api/admin/insurers";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          isActive: editing?.isActive ?? true,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
        return;
      }
      toast.success(editing ? "Insurer updated" : "Insurer created");
      setDialogOpen(false);
      fetchInsurers();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(ins: Insurer) {
    const res = await fetch(`/api/admin/insurers/${ins.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ins, isActive: !ins.isActive, portalUrl: ins.portalUrl || "", logoUrl: ins.logoUrl || "" }),
    });
    if (res.ok) {
      toast.success(`Insurer ${ins.isActive ? "deactivated" : "activated"}`);
      fetchInsurers();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/insurers/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Insurer deleted");
      fetchInsurers();
    } else {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insurers</h1>
          <p className="text-slate-500 text-sm mt-1">Manage insurance companies and TPAs</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Insurer
        </Button>
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
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Portal URL</TableHead>
                <TableHead>Docs</TableHead>
                <TableHead>Contacts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insurers.map((ins, i) => (
                <TableRow key={ins.id}>
                  <TableCell className="text-slate-400 text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium text-slate-800">{ins.name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{ins.code}</TableCell>
                  <TableCell>
                    {ins.portalUrl ? (
                      <a
                        href={ins.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline text-xs max-w-[160px] truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{ins.portalUrl}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{ins._count.documents}</TableCell>
                  <TableCell className="text-center">{ins._count.contacts}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(ins)}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        ins.isActive
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-red-100 text-red-700 hover:bg-red-200"
                      } transition-colors`}
                    >
                      {ins.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {ins.isActive ? "Active" : "Inactive"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(ins)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(ins.id)}
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Insurer" : "Add Insurer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Star Health Insurance"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. STAR_HEALTH"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Portal URL</Label>
              <Input
                value={form.portalUrl}
                onChange={(e) => setForm({ ...form, portalUrl: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                type="number"
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.code}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Insurer?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This will permanently delete the insurer and all associated documents, contacts, and commercials.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
