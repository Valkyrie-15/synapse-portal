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

type Contact = {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  insurerId: string;
  insurer: { name: string };
};

type Insurer = { id: string; name: string };

const emptyForm = { insurerId: "", name: "", role: "", email: "", phone: "", mobile: "" };

export default function ContactsAdminPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterInsurerId, setFilterInsurerId] = useState("all");

  async function fetchContacts() {
    const url = filterInsurerId && filterInsurerId !== "all"
      ? `/api/admin/contacts?insurerId=${filterInsurerId}`
      : "/api/admin/contacts";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/admin/insurers").then((r) => r.json()).then((d) => setInsurers(d.insurers || []));
  }, []);

  useEffect(() => { fetchContacts(); }, [filterInsurerId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setForm({
      insurerId: c.insurerId,
      name: c.name,
      role: c.role,
      email: c.email || "",
      phone: c.phone || "",
      mobile: c.mobile || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/contacts/${editing.id}` : "/api/admin/contacts";
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
      toast.success(editing ? "Contact updated" : "Contact created");
      setDialogOpen(false);
      fetchContacts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Contact deleted");
      fetchContacts();
    } else {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contacts</h1>
          <p className="text-slate-500 text-sm mt-1">Manage insurer contact persons</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Contact
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
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-sm text-slate-700">{c.insurer.name}</TableCell>
                  <TableCell className="text-slate-800 font-medium text-sm">{c.name}</TableCell>
                  <TableCell className="text-slate-600 text-sm">{c.role}</TableCell>
                  <TableCell className="text-xs text-blue-600">{c.email || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-600">{c.phone || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-600">{c.mobile || "—"}</TableCell>
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
            <DialogTitle>{editing ? "Edit Contact" : "Add Contact"}</DialogTitle>
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
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Claims Manager" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="email@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 ..." />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+91 ..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.insurerId || !form.name || !form.role}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Contact?</DialogTitle></DialogHeader>
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
