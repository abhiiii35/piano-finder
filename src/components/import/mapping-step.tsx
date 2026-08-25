"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TARGET_FIELDS, type ColumnMapping, type TargetField } from "@/lib/import/mapping";
import type { EvalRow } from "@/actions/import";
import { Loader2 } from "lucide-react";

const UNMAPPED = "__unmapped__";

export type PreviewResult = {
  preview: EvalRow[];
  counts: { create: number; mergeDuplicate: number; invalid: { row: number; reason: string }[] };
  totalRows: number;
  capped: boolean;
};

type Props = {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  preview: PreviewResult | null;
  previewing: boolean;
  isGazelle: boolean;
  onBack: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLoading: boolean;
};

export function MappingStep({
  headers,
  mapping,
  onMappingChange,
  preview,
  previewing,
  isGazelle,
  onBack,
  onNext,
  nextDisabled,
  nextLoading,
}: Props) {
  function setField(header: string, field: TargetField | null) {
    onMappingChange({ ...mapping, [header]: field });
  }

  const requiredMapped = Object.values(mapping).includes("customerName");

  return (
    <div className="space-y-6">
      {isGazelle && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          This looks like a Gazelle export — columns were matched automatically. Adjust anything
          below before continuing.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column in your file</TableHead>
              <TableHead>Maps to</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header) => (
              <TableRow key={header}>
                <TableCell className="font-medium">{header}</TableCell>
                <TableCell>
                  <Select
                    value={mapping[header] ?? UNMAPPED}
                    onValueChange={(v) =>
                      v && setField(header, v === UNMAPPED ? null : (v as TargetField))
                    }
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Don't import" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>Don&apos;t import</SelectItem>
                      {TARGET_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                          {f.required ? " *" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!requiredMapped && (
        <p className="text-sm text-destructive">
          Map at least one column to Customer name to continue.
        </p>
      )}

      {previewing && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your data…
        </p>
      )}

      {preview && !previewing && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{preview.counts.create} new customers</Badge>
            <Badge variant="secondary">{preview.counts.mergeDuplicate} will be merged</Badge>
            {preview.counts.invalid.length > 0 && (
              <Badge variant="destructive">{preview.counts.invalid.length} can&apos;t be imported</Badge>
            )}
            {preview.capped && (
              <Badge variant="outline">Only the first 2000 rows will be imported</Badge>
            )}
          </div>

          {preview.counts.invalid.length > 0 && (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {preview.counts.invalid.slice(0, 5).map((issue) => (
                <li key={issue.row}>
                  Row {issue.row}: {issue.reason}
                </li>
              ))}
              {preview.counts.invalid.length > 5 && (
                <li>…and {preview.counts.invalid.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={nextDisabled || !requiredMapped}>
          {nextLoading ? "Importing…" : "Import"}
        </Button>
      </div>
    </div>
  );
}
