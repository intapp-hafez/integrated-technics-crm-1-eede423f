import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actions, type LeadStatus } from "@/lib/store";
import type { Lead } from "@/lib/mock-data";

export interface StageTransitionPayload {
  lead: Lead;
  toStage: LeadStatus;
  toLabel: string;
}

interface Props {
  open: boolean;
  payload: StageTransitionPayload | null;
  onClose: () => void;
}

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "time" | "number" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function fieldsFor(stage: string): FieldDef[] {
  switch (stage) {
    case "contacted":
      return [
        {
          name: "channel",
          label: "Contact method",
          type: "select",
          required: true,
          options: [
            { value: "Call", label: "Call" },
            { value: "Email", label: "Email" },
            { value: "WhatsApp", label: "WhatsApp" },
            { value: "In-person", label: "In-person" },
          ],
        },
        { name: "date", label: "Date", type: "date", required: true },
        {
          name: "summary",
          label: "Summary",
          type: "textarea",
          required: true,
          placeholder: "What did you discuss?",
        },
      ];
    case "qualified":
      return [
        { name: "budget", label: "Estimated budget", type: "number", placeholder: "0" },
        { name: "timeline", label: "Decision timeline", type: "text", placeholder: "e.g. Q3 2026" },
        { name: "summary", label: "Qualification notes", type: "textarea", required: true },
      ];
    case "meeting_scheduled":
      return [
        { name: "date", label: "Meeting date", type: "date", required: true },
        { name: "time", label: "Meeting time", type: "time", required: true },
        {
          name: "kind",
          label: "Meeting type",
          type: "select",
          required: true,
          options: [
            { value: "Online", label: "Online" },
            { value: "Site Visit", label: "Site Visit" },
            { value: "Office", label: "Office Meeting" },
          ],
        },
        {
          name: "location",
          label: "Location / link",
          type: "text",
          placeholder: "Zoom link or address",
        },
        {
          name: "summary",
          label: "Description",
          type: "textarea",
          required: true,
          placeholder: "Agenda, attendees, etc.",
        },
      ];
    case "proposal_sent":
      return [
        { name: "date", label: "Sent date", type: "date", required: true },
        {
          name: "amount",
          label: "Proposal amount",
          type: "number",
          required: true,
          placeholder: "0",
        },
        { name: "ref", label: "Proposal / quotation #", type: "text" },
        { name: "summary", label: "Notes", type: "textarea" },
      ];
    case "negotiation":
      return [
        { name: "counter", label: "Counter-offer / sticking points", type: "text", required: true },
        { name: "nextStep", label: "Next step date", type: "date", required: true },
        { name: "summary", label: "Notes", type: "textarea", required: true },
      ];
    case "won":
      return [
        { name: "date", label: "Close date", type: "date", required: true },
        { name: "amount", label: "Final deal value", type: "number", required: true },
        { name: "summary", label: "Win notes", type: "textarea" },
      ];
    case "lost":
      return [
        {
          name: "reason",
          label: "Reason",
          type: "select",
          required: true,
          options: [
            { value: "Price", label: "Price" },
            { value: "Competitor", label: "Competitor" },
            { value: "Timing", label: "Timing" },
            { value: "No budget", label: "No budget" },
            { value: "No response", label: "No response" },
            { value: "Other", label: "Other" },
          ],
        },
        { name: "competitor", label: "Competitor (if any)", type: "text" },
        { name: "summary", label: "Details", type: "textarea", required: true },
      ];
    case "archived":
      return [
        { name: "reason", label: "Archive reason", type: "text", required: true },
        { name: "summary", label: "Notes", type: "textarea" },
      ];
    case "new":
    default:
      return [{ name: "summary", label: "Notes (optional)", type: "textarea" }];
  }
}

export function StageTransitionDialog({ open, payload, onClose }: Props) {
  const fields = useMemo(() => (payload ? fieldsFor(payload.toStage) : []), [payload]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && payload) {
      const init: Record<string, string> = {};
      for (const f of fieldsFor(payload.toStage)) {
        if (f.type === "date") init[f.name] = today();
        else init[f.name] = "";
      }
      setValues(init);
      setErrors({});
    }
  }, [open, payload]);

  if (!payload) return null;

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  const handleConfirm = () => {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !values[f.name]?.trim()) errs[f.name] = "Required";
      if (f.type === "number" && values[f.name] && Number.isNaN(Number(values[f.name])))
        errs[f.name] = "Must be a number";
    }
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const { lead, toStage, toLabel } = payload;
    const details = fields
      .map((f) => (values[f.name] ? `${f.label}: ${values[f.name]}` : null))
      .filter(Boolean)
      .join(" • ");

    // Schedule an activity for stages that imply one
    if (toStage === "meeting_scheduled") {
      actions.addActivity({
        type: values.kind === "Site Visit" ? "Site Visit" : "Meeting",
        title: `Meeting with ${lead.company}`,
        leadId: lead.id,
        dueDate: values.date,
        time: values.time,
        owner: lead.owner,
        notes: [values.location && `Location: ${values.location}`, values.summary]
          .filter(Boolean)
          .join("\n"),
      });
    } else if (toStage === "contacted") {
      actions.addActivity({
        type:
          values.channel === "Call" ? "Call" : values.channel === "Email" ? "Email" : "Follow-up",
        title: `${values.channel} with ${lead.company}`,
        leadId: lead.id,
        dueDate: values.date,
        time: "09:00",
        owner: lead.owner,
        notes: values.summary,
      });
    } else if (toStage === "negotiation") {
      actions.addActivity({
        type: "Follow-up",
        title: `Negotiation follow-up — ${lead.company}`,
        leadId: lead.id,
        dueDate: values.nextStep,
        time: "09:00",
        owner: lead.owner,
        notes: [values.counter, values.summary].filter(Boolean).join("\n"),
      });
    }

    if (details) {
      actions.addNote(lead.id, `[${toLabel}] ${details}`);
    }
    actions.moveLead(lead.id, toStage);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to {payload.toLabel}</DialogTitle>
          <DialogDescription>
            {payload.lead.company} — provide the details required for this stage.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                />
              ) : f.type === "select" ? (
                <Select value={values[f.name] ?? ""} onValueChange={(v) => set(f.name, v)}>
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options!.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={f.name}
                  type={f.type}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
              {errors[f.name] && <p className="text-xs text-destructive">{errors[f.name]}</p>}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
