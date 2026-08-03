"use client";

import { addAudit, getCurrentAdmin } from "@/lib/admin-api";

export type IncidentSeverity = "SEV-1" | "SEV-2" | "SEV-3";
export type IncidentStatus = "ochiq" | "tekshirilmoqda" | "bartaraf_etildi" | "yopildi";

export interface AdminIncident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  commander: string;
  impact: string;
  timeline: { at: string; text: string }[];
  createdAt: string;
  resolvedAt?: string;
}

const KEY = "sb2_admin_incidents";

function read(): AdminIncident[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: AdminIncident[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getIncidents() {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createIncident(input: Pick<AdminIncident, "title" | "severity" | "impact">) {
  const admin = getCurrentAdmin();
  if (!admin?.permissions.includes("monitoring")) throw new Error("FORBIDDEN");
  if (input.title.trim().length < 5 || input.impact.trim().length < 10) throw new Error("INVALID_INPUT");
  const now = new Date().toISOString();
  const incident: AdminIncident = {
    id: `inc-${Date.now()}`,
    title: input.title.trim().slice(0, 160),
    severity: input.severity,
    impact: input.impact.trim().slice(0, 1000),
    status: "ochiq",
    commander: admin.fullName,
    createdAt: now,
    timeline: [{ at: now, text: `Incident ${admin.fullName} tomonidan ochildi` }],
  };
  write([incident, ...read()]);
  addAudit("Incident ochildi", incident.id, admin);
  return incident;
}

export function advanceIncident(id: string, note: string) {
  const admin = getCurrentAdmin();
  if (!admin?.permissions.includes("monitoring")) throw new Error("FORBIDDEN");
  if (note.trim().length < 5) throw new Error("NOTE_REQUIRED");
  const order: IncidentStatus[] = ["ochiq", "tekshirilmoqda", "bartaraf_etildi", "yopildi"];
  const incidents = read();
  const target = incidents.find((item) => item.id === id);
  if (!target || target.status === "yopildi") throw new Error("INVALID_STATE");
  const status = order[order.indexOf(target.status) + 1];
  const now = new Date().toISOString();
  write(incidents.map((item) => item.id === id ? {
    ...item,
    status,
    resolvedAt: status === "yopildi" ? now : item.resolvedAt,
    timeline: [...item.timeline, { at: now, text: note.trim().slice(0, 1000) }],
  } : item));
  addAudit(`Incident holati: ${status}`, id, admin);
}
