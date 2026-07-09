"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface Category {
  id: string;
  name: string;
  type: string;
  description: string | null;
}

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory/categories")
      .then((r) => r.json())
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"? Products in this category will be unassigned.`
    );
    if (!confirmed) return;

    setDeletingId(category.id);
    try {
      const res = await fetch(`/api/inventory/categories/${category.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Could not delete",
          description: data.error,
          variant: "destructive",
        });
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      toast({ title: "Category deleted", description: `${category.name} has been removed.` });
    } finally {
      setDeletingId(null);
    }
  }

  const addCategory = async (name: string, type: string) => {
    const res = await fetch("/api/inventory/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
      return;
    }
    const category = await res.json();
    setCategories((prev) => [...prev, category]);
    toast({ title: "Category created", description: `${name} has been added.` });
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-muted-foreground">Organize your products with categories</p>
          </div>
          <AddCategoryForm onAdd={addCategory} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
          </div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <p className="text-muted-foreground mb-4">No categories yet</p>
              <AddCategoryForm onAdd={addCategory} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{category.name}</h3>
                      <Badge variant="secondary" className="text-xs capitalize mt-1">
                        {category.type}
                      </Badge>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteCategory(category)}
                      disabled={deletingId === category.id}
                      aria-label={`Delete ${category.name}`}
                    >
                      {deletingId === category.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function AddCategoryForm({ onAdd }: { onAdd: (name: string, type: string) => Promise<void> }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState("product");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onAdd(name, type);
      setName("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        className="w-40"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="product">Product</option>
        <option value="service">Service</option>
      </select>
      <Button type="submit" size="sm" variant="kazi" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </form>
  );
}
