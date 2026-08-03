"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminPageHeader, EmptyAdmin } from "@/components/admin/AdminUI";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  advanceIncident,
  createIncident,
  getIncidents,
  type AdminIncident,
  type IncidentSeverity,
} from "@/lib/api/admin";
import { formatDate, formatTime } from "@/lib/format";

function severityTone(value: IncidentSeverity): BadgeTone {
  return value === "SEV-1" ? "danger" : value === "SEV-2" ? "warning" : "neutral";
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<AdminIncident | null>(null);
  const [title, setTitle] = useState("");
  const [impact, setImpact] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("SEV-2");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const load = () => setIncidents(getIncidents());
  useEffect(load, []);

  function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      createIncident({ title, impact, severity });
      setCreateOpen(false);
      setTitle("");
      setImpact("");
      load();
    } catch {
      setError("Sarlavha va foydalanuvchiga ta’sirini batafsil kiriting.");
    }
  }

  function advance() {
    if (!selected) return;
    setError("");
    try {
      advanceIncident(selected.id, note);
      setSelected(null);
      setNote("");
      load();
    } catch {
      setError("Timeline izohi kamida 5 belgidan iborat bo‘lishi kerak.");
    }
  }

  return (
    <>
      <AdminPageHeader title="Incidentlar markazi" description="Foydalanuvchiga ta’sir qiluvchi uzilishlarni e’lon qilish, Incident Commander tayinlash va tiklanish timeline’ini yuritish." action={<Button onClick={() => setCreateOpen(true)}>Incident ochish</Button>} />
      <div className="flex flex-col gap-4">
        {incidents.length ? incidents.map((incident) => (
          <Card key={incident.id} padding="lg">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2"><Badge tone={severityTone(incident.severity)}>{incident.severity}</Badge><Badge tone={incident.status === "yopildi" ? "success" : "warning"}>{incident.status.replaceAll("_", " ")}</Badge></div>
                <h2 className="mt-3 break-words font-heading text-base font-bold text-ink">{incident.title}</h2>
                <p className="mt-2 break-words text-sm text-muted">{incident.impact}</p>
                <p className="mt-3 text-2xs text-faint">IC: {incident.commander} · {formatDate(incident.createdAt)} {formatTime(incident.createdAt)}</p>
              </div>
              {incident.status !== "yopildi" && <Button size="sm" variant="secondary" onClick={() => setSelected(incident)}>Holatni yangilash</Button>}
            </div>
            <ol className="mt-4 border-l border-line pl-4">
              {incident.timeline.map((item) => <li key={`${item.at}-${item.text}`} className="mb-3 last:mb-0"><p className="break-words text-xs text-ink">{item.text}</p><p className="mt-0.5 text-2xs text-faint">{formatDate(item.at)} · {formatTime(item.at)}</p></li>)}
            </ol>
          </Card>
        )) : <EmptyAdmin>Hozircha ochilgan incident yo‘q.</EmptyAdmin>}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi incident">
        <form onSubmit={create} className="flex flex-col gap-4">
          <Input label="Sarlavha" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
          <Select label="Og‘irlik" value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)} options={[{ value: "SEV-1", label: "SEV-1 — kritik" }, { value: "SEV-2", label: "SEV-2 — yuqori" }, { value: "SEV-3", label: "SEV-3 — cheklangan" }]} />
          <Textarea label="Foydalanuvchiga ta’siri" value={impact} onChange={(e) => setImpact(e.target.value)} maxLength={1000} required error={error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Bekor qilish</Button><Button type="submit">E’lon qilish</Button></div>
        </form>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Incident timeline’ini yangilash">
        <p className="text-sm text-muted">Keyingi holat: <strong className="text-ink">{selected?.status === "ochiq" ? "Tekshirilmoqda" : selected?.status === "tekshirilmoqda" ? "Bartaraf etildi" : "Yopildi"}</strong></p>
        <div className="mt-4"><Textarea label="Bajarilgan ish va natija" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} error={error} /></div>
        <div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setSelected(null)}>Bekor qilish</Button><Button onClick={advance}>Holatni o‘tkazish</Button></div>
      </Modal>
    </>
  );
}
