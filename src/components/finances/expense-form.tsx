"use client";

import { useRef, useState } from "react";
import { createExpense } from "@/actions/expense";
import { uploadPhoto } from "@/actions/photos";
import { IRS_SCHEDULE_C_CATEGORIES } from "@/lib/constants";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";

// Sentinel Select value for "type your own category". Not a real category —
// never submitted.
const CUSTOM_CATEGORY = "__custom__";

export function ExpenseForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [receipt, setReceipt] = useState<{ url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", "receipts");
    const result = await uploadPhoto(formData);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      setReceipt({ url: result.url });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    const resolvedCategory =
      category === CUSTOM_CATEGORY ? customCategory.trim() : category;
    if (!resolvedCategory) {
      toast.error("Please enter a custom category name");
      return;
    }

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    formData.set("category", resolvedCategory);
    if (receipt) formData.set("receiptUrl", receipt.url);

    const result = await createExpense(formData);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense added");
    formRef.current?.reset();
    setCategory("");
    setCustomCategory("");
    setReceipt(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="expense-date">Date</Label>
            <Input id="expense-date" name="date" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={category || null} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an IRS category" />
              </SelectTrigger>
              <SelectContent>
                {IRS_SCHEDULE_C_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_CATEGORY}>Custom category…</SelectItem>
              </SelectContent>
            </Select>
            {category === CUSTOM_CATEGORY && (
              <Input
                id="expense-custom-category"
                aria-label="Custom category name"
                placeholder="e.g. Piano wire stock"
                maxLength={60}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            )}
            <p className="text-xs text-muted-foreground">
              IRS Schedule C categories, or pick Custom to use your own label.
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expense-amount">Amount ($)</Label>
            <Input
              id="expense-amount"
              name="amount"
              inputMode="decimal"
              placeholder="45.99"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expense-vendor">Vendor (optional)</Label>
            <Input id="expense-vendor" name="vendor" placeholder="Schaff Piano Supply" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="expense-notes">Notes (optional)</Label>
            <Textarea id="expense-notes" name="notes" rows={2} />
          </div>
          <div className="grid gap-2">
            <Label>Receipt (optional)</Label>
            {receipt ? (
              <div className="flex items-center gap-2 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={receipt.url}
                  alt="Receipt"
                  className="h-12 w-12 rounded object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReceipt(null)}
                >
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 h-4 w-4" />
                )}
                Upload receipt
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="deductible"
                defaultChecked
                className="h-4 w-4 accent-primary"
              />
              Deductible
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving || uploading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Expense
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
