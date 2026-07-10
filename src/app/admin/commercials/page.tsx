"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Commercial = {
  id: string;
  category: string;
  description: string;
  discountPercent?: number | null;
  packageRate?: number | null;
  notes?: string | null;
  insurerId: string;
  insurer: { name: string };
};

type Insurer = { id: string; name: string };

const emptyForm = {
  insurerId: "", category: "", description: "",
  discountPercent: "", packageRate: "", notes: "",
};

export default function CommercialsAdminPage() {
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Commercial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterInsurerId, setFilterInsurerId] = useState("all");

  async function fetchCommercials() {
    const url = filterInsurerId && filterInsurerId !== "all"
      ? `/api/admin/commercials?insurerId=${filterInsurerId}`
      : "/api/admin/commercials";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setCommercials(data.commercials);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/admin/insurers").then((r) => r.json()).then((d) => setInsurers(d.insurers || []));
  }, []);

  useEffect(() => { fetchCommercials(); }, [filterInsurerId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Commercial) {
    setEditing(c);
    setForm({
      insurerId: c.insurerId,
      category: c.category,
      description: c.description,
      discountPercent: c.discountPercent?.toString() || "",
      packageRate: c.packageRate?.toString() || "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/commercials/${editing.id}` : "/api/admin/commercials";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discountPercent: form.discountPercent ? parseFloat(form.discountPercent) : null,
          packageRate: form.packageRate ? parseFloat(form.packageRate) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.error || "Failed to save");
        return;
      }
      toast.success(editing ? "Commercial updated" : "Commercial created");
      setDialogOpen(false);
      fetchCommercials();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/commercials/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Commercial deleted");
      fetchCommercials();
    } else {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Commercials</h1>
          <p className="text-slate-500 text-sm mt-1">Manage commercial terms and packages</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Commercial
        </Button>
      </div>

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
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Package Rate</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commercials.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm text-slate-700">{c.insurer.name}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-800">{c.category}</TableCell>
                  <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">{c.description}</TableCell>
                  <TableCell>
                    {c.discountPercent != null ? (
                      <span className="text-emerald-700 font-semibold text-sm">{c.discountPercent}%</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {c.packageRate != null ? (
                      <span className="text-slate-700 text-sm">₹{c.packageRate.toLocaleString()}</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">{c.notes || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(c.id)}
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
            <DialogTitle>{editing ? "Edit Commercial" : "Add Commercial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Surgery" />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} type="number" placeholder="10" min="0" max="100" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Package Rate (₹)</Label>
                <Input value={form.packageRate} onChange={(e) => setForm({ ...form, packageRate: e.target.value })} type="number" placeholder="50000" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.insurerId || !form.category || !form.description}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Commercial?</DialogTitle></DialogHeader>
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
