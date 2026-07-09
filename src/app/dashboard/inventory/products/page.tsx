"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, AlertTriangle, Edit, Trash2, Loader2, Package } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: string;
  costPrice: string;
  unit: string;
  isActive: boolean;
  minStockLevel: number;
  category: { name: string } | null;
  brand: { name: string } | null;
  stock: { quantity: string; reservedQuantity: string } | null;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory/products")
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete ${product.name}? This will also remove all stock records.`
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      const res = await fetch(`/api/inventory/products/${product.id}`, {
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
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast({ title: "Product deleted", description: `${product.name} has been removed.` });
    } finally {
      setDeletingId(null);
    }
  }

  const getStockStatus = (product: Product) => {
    const stockQty = parseFloat(product.stock?.quantity || "0");
    const minLevel = product.minStockLevel || 0;
    if (stockQty <= 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (stockQty <= minLevel) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog and stock levels
            </p>
          </div>
          <Link href="/dashboard/inventory/products/new">
            <Button variant="kazi">
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-kazi-green" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No products yet</p>
              <Link href="/dashboard/inventory/products/new">
                <Button variant="kazi">Add Your First Product</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-xl bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Product</th>
                    <th className="text-left p-4 font-medium hidden sm:table-cell">SKU</th>
                    <th className="text-left p-4 font-medium hidden md:table-cell">Category</th>
                    <th className="text-right p-4 font-medium">Price</th>
                    <th className="text-center p-4 font-medium">Stock</th>
                    <th className="text-center p-4 font-medium">Status</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const stockQty = parseFloat(product.stock?.quantity || "0");
                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.brand?.name || ""}</p>
                          </div>
                        </td>
                        <td className="p-4 hidden sm:table-cell text-muted-foreground">
                          {product.sku || "—"}
                        </td>
                        <td className="p-4 hidden md:table-cell text-muted-foreground">
                          {product.category?.name || "—"}
                        </td>
                        <td className="p-4 text-right font-medium">
                          {formatCurrency(product.sellingPrice)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={stockQty <= (product.minStockLevel || 0) ? "text-kazi-orange font-medium" : ""}>
                            {stockQty} {product.unit}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={stockStatus.variant} className="capitalize text-xs">
                            {stockStatus.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteProduct(product)}
                              disabled={deletingId === product.id}
                            >
                              {deletingId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
