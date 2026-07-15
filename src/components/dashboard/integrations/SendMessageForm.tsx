"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import type { IntegrationCategory } from "./types";

interface SendMessageFormProps {
  integrationId: string;
  category: IntegrationCategory;
  className?: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "Push",
};

export function SendMessageForm({
  integrationId,
  category,
  className,
}: SendMessageFormProps) {
  const defaultChannel =
    category === "email" || category === "sms" || category === "whatsapp"
      ? category
      : "push";

  const [channel, setChannel] = useState(defaultChannel);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const showSubject = channel === "email" || channel === "push";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          to,
          subject: showSubject ? subject : undefined,
          body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to send message");
      }
      setResult({
        ok: true,
        message: data?.message || "Message dispatched successfully.",
      });
      setBody("");
      setSubject("");
      setTo("");
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-kazi-green" />
          Send a Message
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">
              {channel === "push" ? "Recipient / Topic" : "To"}
            </label>
            <input
              value={to}
              required
              placeholder={
                channel === "email"
                  ? "customer@example.com"
                  : channel === "sms"
                  ? "+2547…"
                  : channel === "whatsapp"
                  ? "+2547…"
                  : "topic-or-token"
              }
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {showSubject && (
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Invoice #1234 from KaziFlow"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={body}
              required
              rows={4}
              placeholder="Your message body…"
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {result && (
            <p
              className={
                result.ok
                  ? "text-sm text-green-700 rounded-md bg-green-100 p-2"
                  : "text-sm text-destructive rounded-md bg-destructive/10 p-2"
              }
            >
              {result.message}
            </p>
          )}

          <Button type="submit" variant="kazi" className="w-full" disabled={sending}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
