"use client";

import { useState, useEffect } from "react";
import { BookOpen, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type OpenApiSpec = {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, unknown>;
};

export default function DeveloperDocsPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/developer/docs")
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        setSpec(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const paths = spec?.paths || {};
  const filteredPaths = search
    ? Object.entries(paths).filter(([path]) =>
        path.toLowerCase().includes(search.toLowerCase())
      )
    : Object.entries(paths);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  if (loading) return <p className="text-muted-foreground">Loading API docs...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground">OpenAPI 3.0 specification for KaziFlow Public API</p>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search endpoints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Badge variant="secondary">{filteredPaths.length} endpoints</Badge>
      </div>

      <div className="space-y-4">
        {filteredPaths.map(([path, methods]: [string, unknown]) => {
          const pathObj = methods as Record<string, { summary?: string; description?: string; tags?: string[] }>;
          return (
            <Card key={path} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{path}</code>
                  <h3 className="font-semibold mt-2">{pathObj?.get?.summary || pathObj?.post?.summary || path}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pathObj?.get?.description || pathObj?.post?.description || ""}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {pathObj?.get && <Badge variant="outline" className="text-xs">GET</Badge>}
                    {pathObj?.post && <Badge variant="outline" className="text-xs">POST</Badge>}
                    {pathObj?.patch && <Badge variant="outline" className="text-xs">PATCH</Badge>}
                    {pathObj?.delete && <Badge variant="outline" className="text-xs">DELETE</Badge>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(path)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
