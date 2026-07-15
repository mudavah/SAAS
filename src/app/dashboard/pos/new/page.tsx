"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Store, Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, X, Check, Barcode, Printer, Receipt, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  taxRate: number;
  lineTotal: number;
  image?: string;
  barcode?: string;
}

interface Product {
  id: string;
  name: string;
  sellingPrice: string;
  barcode?: string;
  sku?: string;
  category?: { id: string; name: string };
  stock?: { quantity: string } | null;
}

export default function NewSalePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/inventory/products?limit=100");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      logger.error("Failed to load products:", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/inventory/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      logger.error("Failed to load categories:", { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    }
  };

  const addToCart = useCallback((product: Product) => {
    const existing = cart.find((item) => item.productId === product.id);
    const price = Number(product.sellingPrice);
    const stock = product.stock ? Number(product.stock.quantity) : Infinity;

    if (existing) {
      if (existing.quantity >= stock) {
        toast({ title: "Insufficient stock", variant: "destructive" });
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                lineTotal: (item.quantity + 1) * (item.price - item.discount) * (1 + item.taxRate / 100),
              }
            : item
        )
      );
    } else {
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        discount: 0,
        taxRate: 16,
        lineTotal: price * (1 + 16 / 100),
        barcode: product.barcode,
      };
      setCart((prev) => [...prev, newItem]);
    }
  }, [cart, toast]);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            lineTotal: newQty * (item.price - item.discount) * (1 + item.taxRate / 100),
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateDiscount = (id: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              discount: Math.max(0, Math.min(discount, item.price * item.quantity)),
              lineTotal: item.quantity * (item.price - Math.max(0, Math.min(discount, item.price * item.quantity))) * (1 + item.taxRate / 100),
            }
          : item
      )
    );
  };

  const handleBarcodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!barcodeInput.trim()) return;

      const product = products.find(
        (p) => p.barcode === barcodeInput.trim() || p.sku === barcodeInput.trim()
      );

      if (product) {
        addToCart(product);
        setBarcodeInput("");
        toast({ title: `${product.name} added to cart` });
      } else {
        toast({ title: "Product not found", variant: "destructive" });
      }
    },
    [barcodeInput, products, toast, addToCart]
  );

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category?.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * (item.price - item.discount), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  const taxAmount = cart.reduce((sum, item) => sum + item.quantity * (item.price - item.discount) * (item.taxRate / 100), 0);
  const total = subtotal + taxAmount;

  const handleCompleteSale = async (paymentMethod: string, payments: { amount: number; method: string; reference?: string; phoneNumber?: string }[]) => {
    if (cart.length === 0) return;
    if (!sessionId) {
      toast({ title: "No active session", description: "Open a shift first.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderRes = await fetch("/api/pos/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: item.discount,
            taxRate: item.taxRate,
          })),
          discount: totalDiscount,
          notes: "",
        }),
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        throw new Error(error.error || "Failed to create order");
      }

      const order = await orderRes.json();

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - total) > 0.01) {
        for (const payment of payments) {
          await fetch(`/api/pos/orders/${order.order.id}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
          });
        }
      }

      const completeRes = await fetch(`/api/pos/orders/${order.order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", payments }),
      });

      if (!completeRes.ok) {
        const error = await completeRes.json();
        throw new Error(error.error || "Failed to complete order");
      }

      const completed = await completeRes.json();
      setCompletedOrder(completed.order);
      setShowPaymentModal(false);
      setShowReceiptModal(true);
      setCart([]);

      toast({ title: "Sale completed successfully!" });
    } catch (error) {
      toast({
        title: "Error completing sale",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-4 flex flex-col gap-4 flex-1">
            {/* Search and Barcode */}
            <div className="flex gap-2">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={barcodeRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode or enter SKU..."
                    className="pl-9 h-12 text-lg"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 h-12"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === null ? "kazi" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="whitespace-nowrap"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "kazi" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto -mx-4 px-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const stock = product.stock ? Number(product.stock.quantity) : 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => !isOutOfStock && addToCart(product)}
                      disabled={isOutOfStock}
                      className={cn(
                        "relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all active:scale-95 touch-manipulation",
                        isOutOfStock
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-kazi-green hover:shadow-md cursor-pointer"
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-kazi-green/10 text-kazi-green font-bold text-lg">
                        {product.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku || product.barcode || "No SKU"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-kazi-green">
                          {formatCurrency(Number(product.sellingPrice))}
                        </span>
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-xs">Out</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {stock} left
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-4 flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCart([])}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto -mx-4 px-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Cart is empty</p>
                  <p className="text-xs text-muted-foreground">Add products by clicking or scanning</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-destructive">-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (16%)</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-kazi-green">{formatCurrency(total)}</span>
                </div>
                <Button
                  variant="kazi"
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={!sessionId || cart.length === 0}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  {!sessionId ? "Open Shift First" : `Pay ${formatCurrency(total)}`}
                </Button>
                {!sessionId && (
                  <p className="text-xs text-center text-destructive">
                    Open a cashier shift to process sales
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <PaymentForm
            total={total}
            onComplete={handleCompleteSale}
            onCancel={() => setShowPaymentModal(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sale Complete</DialogTitle>
          </DialogHeader>
          {completedOrder && (
            <ReceiptView order={completedOrder} onClose={() => setShowReceiptModal(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentForm({
  total,
  onComplete,
  onCancel,
  isSubmitting,
}: {
  total: number;
  onComplete: (method: string, payments: { amount: number; method: string; reference?: string; phoneNumber?: string }[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amount, setAmount] = useState(total.toString());
  const [reference, setReference] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [splitPayments, setSplitPayments] = useState<{ amount: number; method: string }[]>([]);
  const [isSplit, setIsSplit] = useState(false);
  const { toast } = useToast();

  const handleSinglePayment = () => {
    const paid = Number(amount);
    if (paid < total) {
      toast({ title: "Insufficient amount", variant: "destructive" });
      return;
    }
    onComplete(paymentMethod, [{ amount: paid, method: paymentMethod, reference, phoneNumber }]);
  };

  const addSplitPayment = () => {
    const paid = Number(amount);
    if (paid <= 0) return;
    setSplitPayments((prev) => [...prev, { amount: paid, method: paymentMethod }]);
    setAmount("");
    setReference("");
    setPhoneNumber("");
  };

  const removeSplitPayment = (index: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSplitPayment = () => {
    const totalPaid = splitPayments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPaid - total) > 0.01) {
      toast({ title: "Split payments must equal total", variant: "destructive" });
      return;
    }
    onComplete("split", splitPayments.map((p) => ({ amount: p.amount, method: p.method, reference, phoneNumber })));
  };

  const splitTotal = splitPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - splitTotal;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Total Amount</p>
        <p className="text-3xl font-bold text-kazi-green">{formatCurrency(total)}</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={!isSplit ? "kazi" : "outline"}
          className="flex-1"
          onClick={() => setIsSplit(false)}
        >
          Single Payment
        </Button>
        <Button
          variant={isSplit ? "kazi" : "outline"}
          className="flex-1"
          onClick={() => setIsSplit(true)}
        >
          Split Payment
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Payment Method</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {["cash", "mpesa", "card", "bank_transfer", "other"].map((method) => (
              <Button
                key={method}
                variant={paymentMethod === method ? "kazi" : "outline"}
                size="sm"
                onClick={() => setPaymentMethod(method)}
                className="capitalize"
              >
                {method === "mpesa" ? "M-Pesa" : method}
              </Button>
            ))}
          </div>
        </div>

        {isSplit ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div>
                <Label>Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>
            {paymentMethod === "mpesa" && (
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number (2547XXXXXXXX)"
              />
            )}
            <Button variant="outline" className="w-full" onClick={addSplitPayment}>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>

            {splitPayments.length > 0 && (
              <div className="space-y-2">
                {splitPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <p className="font-medium">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.method}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSplitPayment(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span>Remaining</span>
                  <span className={remaining > 0 ? "text-destructive" : "text-kazi-green"}>
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="kazi"
              className="w-full"
              onClick={handleSplitPayment}
              disabled={isSubmitting || splitPayments.length === 0}
            >
              {isSubmitting ? "Processing..." : "Complete Split Payment"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Amount Received</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="text-lg h-12"
              />
            </div>
            {paymentMethod === "mpesa" && (
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number (2547XXXXXXXX)"
              />
            )}
            {paymentMethod !== "cash" && (
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Reference / Transaction ID"
              />
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                variant="kazi"
                className="flex-1"
                onClick={handleSinglePayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Complete Sale"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptView({
  order,
  onClose,
}: {
  order: any;
  onClose: () => void;
}) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Store className="h-12 w-12 text-kazi-green mx-auto mb-2" />
        <h3 className="text-xl font-bold">{order.orderNumber}</h3>
        <p className="text-sm text-muted-foreground">
          {new Date(order.completedAt || order.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Items</span>
          <span>{order.items?.length || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCurrency(order.taxAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span>{formatCurrency(order.discount)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Total</span>
          <span className="text-kazi-green">{formatCurrency(order.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span>{formatCurrency(order.amountPaid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Change</span>
          <span>{formatCurrency(order.changeDue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payment</span>
          <span className="capitalize">{order.paymentMethod || "N/A"}</span>
        </div>
      </div>

      {order.etimsInvoiceNumber && (
        <div className="text-center text-xs text-muted-foreground">
          eTIMS: {order.etimsInvoiceNumber}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
        <Button variant="kazi" className="flex-1" onClick={onClose}>
          <Check className="mr-2 h-4 w-4" />
          Done
        </Button>
      </div>
    </div>
  );
}
