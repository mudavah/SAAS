"use client";

import { useState, useEffect } from "react";
import { Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Language = { id: string; label: string; install: string };

export default function DeveloperSdkPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/developer/sdk")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        setLanguages(data.languages);
        if (data.languages.length > 0) setSelectedLanguage(data.languages[0].id);
      })
      .catch(() => {});
  }, []);

  async function generateSdk() {
    setLoading(true);
    try {
      const res = await fetch("/api/developer/sdk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: selectedLanguage, apiKey }),
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  const selectedLang = languages.find((l) => l.id === selectedLanguage);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SDK Generator</h1>
        <p className="text-muted-foreground">Generate client SDK code for your favorite language</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Language</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full p-2 border rounded-md bg-background text-sm"
            >
              {languages.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.label}</option>
              ))}
            </select>
            {selectedLang && (
              <p className="text-xs text-muted-foreground mt-1">{selectedLang.install}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">API Key</label>
            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="kf_live_..." />
          </div>
        </div>
        <Button variant="kazi" onClick={generateSdk} disabled={loading || !apiKey || !selectedLanguage}>
          <Code2 className="mr-2 h-4 w-4" />
          {loading ? "Generating..." : "Generate Code"}
        </Button>
      </Card>

      {code && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Generated Code</h2>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(code)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>
          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs leading-relaxed">
            <code>{code}</code>
          </pre>
        </Card>
      )}
    </div>
  );
}
