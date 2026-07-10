"use client";

import {
  ExternalLink,
  FileText,
  Scissors,
  BookOpen,
  Bell,
  BookMarked,
  AlertTriangle,
  Phone,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Document = {
  id: string;
  type: string;
  title: string;
  url: string;
  isActive: boolean;
};

type Contact = {
  id: string;
  name: string;
  role: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
};

interface ResourceCardsProps {
  portalUrl: string | null;
  documents: Document[];
  contacts: Contact[];
  loading: boolean;
  insurerName: string;
}

const docTypeMap: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  HOSPITAL_CONTRACT: { label: "Hospital Contract", icon: FileText, color: "text-blue-700", bg: "bg-blue-50" },
  SURGICAL_PACKAGES: { label: "Agreed Surgical Packages", icon: Scissors, color: "text-violet-700", bg: "bg-violet-50" },
  SOP: { label: "Standard Operating Procedure", icon: BookOpen, color: "text-emerald-700", bg: "bg-emerald-50" },
  CIRCULAR: { label: "Circulars", icon: Bell, color: "text-amber-700", bg: "bg-amber-50" },
  CASHLESS_MANUAL: { label: "Cashless Manual", icon: BookMarked, color: "text-cyan-700", bg: "bg-cyan-50" },
  ESCALATION_MATRIX: { label: "Escalation Matrix", icon: AlertTriangle, color: "text-red-700", bg: "bg-red-50" },
  FAQ: { label: "FAQs", icon: HelpCircle, color: "text-slate-700", bg: "bg-slate-50" },
};

export default function ResourceCards({
  portalUrl,
  documents,
  contacts,
  loading,
  insurerName,
}: ResourceCardsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const docsByType = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Portal Link — highlighted card */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Portal Access
        </h3>
        <Card
          className={cn(
            "border-2 transition-all duration-200",
            portalUrl
              ? "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 hover:border-blue-400 hover:shadow-md cursor-pointer"
              : "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
          )}
          onClick={() => {
            if (portalUrl) window.open(portalUrl, "_blank", "noopener,noreferrer");
          }}
        >
          <div className="p-5 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 flex-shrink-0 shadow">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-slate-800">Portal Link</h4>
                {portalUrl && (
                  <Badge variant="success" className="text-xs">Active</Badge>
                )}
              </div>
              <p className="text-sm text-slate-500 truncate mt-0.5">
                {portalUrl ? `Open ${insurerName} provider portal` : "Portal URL not configured"}
              </p>
            </div>
            {portalUrl && (
              <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
        </Card>
      </div>

      {/* Documents grid */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Documents & Resources
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Object.entries(docTypeMap).map(([type, meta]) => {
            const docs = docsByType[type] || [];
            const Icon = meta.icon;
            return (
              <Card
                key={type}
                className={cn(
                  "border transition-all duration-200",
                  docs.length > 0
                    ? "hover:shadow-md hover:border-slate-300 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0", meta.bg)}>
                      <Icon className={cn("w-5 h-5", meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-800 text-sm leading-tight">{meta.label}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {docs.length} {docs.length === 1 ? "document" : "documents"}
                      </p>
                    </div>
                  </div>
                  {docs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {docs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:underline truncate group"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="truncate">{doc.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Contact Details */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Contact Details
        </h3>
        {contacts.length === 0 ? (
          <Card className="border border-dashed">
            <div className="p-4 flex items-center gap-3 opacity-50">
              <Phone className="w-5 h-5 text-slate-400" />
              <p className="text-sm text-slate-500">No contacts configured</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {contacts.map((contact) => (
              <Card key={contact.id} className="border hover:shadow-sm transition-shadow">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-semibold text-sm">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{contact.name}</p>
                      <p className="text-xs text-slate-500 truncate">{contact.role}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline truncate"
                      >
                        <span>✉</span>
                        <span className="truncate">{contact.email}</span>
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 truncate"
                      >
                        <span>📞</span>
                        <span>{contact.phone}</span>
                      </a>
                    )}
                    {contact.mobile && (
                      <a
                        href={`tel:${contact.mobile}`}
                        className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 truncate"
                      >
                        <span>📱</span>
                        <span>{contact.mobile}</span>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
