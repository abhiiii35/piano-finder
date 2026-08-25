"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  sendReminderNow,
  dismissReminder,
  updateReminderMode,
  saveMessageTemplate,
} from "@/actions/reminders";
import { renderTemplate, PLACEHOLDER_KEYS, DEFAULT_RECALL, DEFAULT_APPT_REMINDER } from "@/lib/reminder-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ReminderRow = {
  id: string;
  reminderType: string;
  dueDate: string;
  lastTuningDate: string;
  customerName: string;
  pianoLabel: string | null;
  monthsOverdue: number;
};

export type TemplateRow = {
  subject: string;
  body: string;
  sendOffsetHours: number | null;
} | null;

const SAMPLE_VARS = {
  customerName: "Jane Doe",
  pianoMake: "Steinway",
  lastServiceDate: "March 3, 2026",
  bookingTime: "Friday, June 12 at 2:00 PM",
  technicianName: "Mike Tuner",
  businessName: "Mike's Piano Service",
};

function ReminderRowItem({
  reminder,
  onHandled,
}: {
  reminder: ReminderRow;
  onHandled: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSendNow() {
    startTransition(async () => {
      const result = await sendReminderNow(reminder.id);
      if (result.success) {
        toast.success(`Reminder sent to ${reminder.customerName}`);
        onHandled(reminder.id);
      } else {
        toast.error(result.error ?? "Failed to send reminder");
      }
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      const result = await dismissReminder(reminder.id);
      if (result.success) {
        toast.success("Marked handled");
        onHandled(reminder.id);
      } else {
        toast.error(result.error ?? "Failed to update reminder");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">{reminder.customerName}</p>
          {reminder.monthsOverdue > 0 && (
            <Badge variant="destructive">{reminder.monthsOverdue}mo overdue</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            reminder.pianoLabel,
            `Last service ${format(new Date(reminder.lastTuningDate), "MMM d, yyyy")}`,
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={handleDismiss}>
          Mark handled
        </Button>
        <Button size="sm" disabled={pending} onClick={handleSendNow}>
          Send now
        </Button>
      </div>
    </div>
  );
}

function TemplateEditor({
  type,
  label,
  initial,
}: {
  type: "RECALL" | "APPT_REMINDER";
  label: string;
  initial: TemplateRow;
}) {
  const fallback = type === "RECALL" ? DEFAULT_RECALL : DEFAULT_APPT_REMINDER;
  const [subject, setSubject] = useState(initial?.subject ?? fallback.subject);
  const [body, setBody] = useState(initial?.body ?? fallback.body);
  const [offsetHours, setOffsetHours] = useState(initial?.sendOffsetHours ?? 24);
  const [showPreview, setShowPreview] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      const result = await saveMessageTemplate(fd);
      if (result.success) {
        toast.success(`${label} template saved`);
      } else {
        toast.error(result.error ?? "Failed to save template");
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 rounded-lg border p-4">
      <input type="hidden" name="type" value={type} />
      <h3 className="font-medium">{label}</h3>

      <div className="flex flex-wrap gap-1">
        {PLACEHOLDER_KEYS.map((key) => (
          <Badge key={key} variant="secondary">{`{${key}}`}</Badge>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${type}-subject`}>Subject</Label>
        <Input
          id={`${type}-subject`}
          name="subject"
          value={subject}
          maxLength={120}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${type}-body`}>Body</Label>
        <Textarea
          id={`${type}-body`}
          name="body"
          value={body}
          maxLength={2000}
          rows={6}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </div>

      {type === "APPT_REMINDER" && (
        <div className="space-y-2 max-w-40">
          <Label htmlFor="sendOffsetHours">Send this many hours before the appointment</Label>
          <Input
            id="sendOffsetHours"
            name="sendOffsetHours"
            type="number"
            min={1}
            max={168}
            value={offsetHours}
            onChange={(e) => setOffsetHours(Number(e.target.value))}
          />
        </div>
      )}

      {showPreview && (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">{renderTemplate(subject, SAMPLE_VARS)}</p>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {renderTemplate(body, SAMPLE_VARS)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPreview((s) => !s)}>
          {showPreview ? "Hide preview" : "Preview with sample data"}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving..." : "Save template"}
        </Button>
      </div>
    </form>
  );
}

export default function RemindersClient({
  reminderMode,
  dueReminders,
  upcomingReminders,
  recallTemplate,
  apptTemplate,
}: {
  reminderMode: string;
  dueReminders: ReminderRow[];
  upcomingReminders: ReminderRow[];
  recallTemplate: TemplateRow;
  apptTemplate: TemplateRow;
}) {
  const [due, setDue] = useState(dueReminders);
  const [mode, setMode] = useState(reminderMode);
  const [modePending, startModeTransition] = useTransition();

  function handleHandled(id: string) {
    setDue((rows) => rows.filter((r) => r.id !== id));
  }

  function handleModeChange(next: "AUTO" | "REVIEW") {
    setMode(next);
    startModeTransition(async () => {
      const result = await updateReminderMode(next);
      if (!result.success) {
        toast.error(result.error ?? "Failed to update reminder mode");
        setMode(reminderMode);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tune Reminders</h1>
        <p className="mt-1 text-muted-foreground">
          Recall reminders and appointment reminders for your customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recall queue</CardTitle>
          <CardDescription>Customers due or overdue for their next tuning, most overdue first</CardDescription>
        </CardHeader>
        <CardContent>
          {due.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nothing due right now.</p>
          ) : (
            <div className="divide-y">
              {due.map((r) => (
                <ReminderRowItem key={r.id} reminder={r} onHandled={handleHandled} />
              ))}
            </div>
          )}

          {upcomingReminders.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Upcoming ({upcomingReminders.length})
              </summary>
              <div className="mt-2 divide-y">
                {upcomingReminders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{r.customerName}</span>
                    <span className="text-muted-foreground">
                      Due {format(new Date(r.dueDate), "MMM d, yyyy")}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder settings</CardTitle>
          <CardDescription>Choose how recall reminders go out</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="reminderMode"
              className="mt-1"
              checked={mode === "AUTO"}
              disabled={modePending}
              onChange={() => handleModeChange("AUTO")}
            />
            <span>
              <span className="block font-medium">Auto-send</span>
              <span className="block text-sm text-muted-foreground">
                Due reminders email customers automatically, no review needed.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="radio"
              name="reminderMode"
              className="mt-1"
              checked={mode === "REVIEW"}
              disabled={modePending}
              onChange={() => handleModeChange("REVIEW")}
            />
            <span>
              <span className="block font-medium">Review first</span>
              <span className="block text-sm text-muted-foreground">
                Due reminders wait in the queue above for you to send or mark handled.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message templates</CardTitle>
          <CardDescription>Customize what customers receive; leave defaults as-is if you&apos;re happy with them</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TemplateEditor type="RECALL" label="Recall reminder" initial={recallTemplate} />
          <TemplateEditor type="APPT_REMINDER" label="Appointment reminder" initial={apptTemplate} />
        </CardContent>
      </Card>
    </div>
  );
}
