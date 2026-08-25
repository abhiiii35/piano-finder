"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet, Contact, Users2, Loader2 } from "lucide-react";

type Props = {
  googleEnabled: boolean;
  loading: boolean;
  onFile: (file: File) => void;
  onGoogle: () => void;
};

export function SourceStep({ googleEnabled, loading, onFile, onGoogle }: Props) {
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const vcfInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) onFile(file);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Upload a spreadsheet</p>
            <p className="text-sm text-muted-foreground">CSV or Excel (.xlsx, .xls)</p>
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => sheetInputRef.current?.click()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Choose file"}
          </Button>
          <input
            ref={sheetInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={handleChange}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Contact className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">Upload a vCard (.vcf)</p>
            <p className="text-sm text-muted-foreground">
              Exported contacts from your phone or address book
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => vcfInputRef.current?.click()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Choose file"}
          </Button>
          <input
            ref={vcfInputRef}
            type="file"
            accept=".vcf,text/vcard,text/x-vcard"
            className="hidden"
            onChange={handleChange}
          />
        </CardContent>
      </Card>

      {googleEnabled && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Import from Google Contacts</p>
              <p className="text-sm text-muted-foreground">
                Uses the Google account you signed in with
              </p>
            </div>
            <Button variant="outline" disabled={loading} onClick={onGoogle}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
            </Button>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-muted-foreground">
        Using Gazelle? Export your clients as CSV and upload here — we&apos;ll auto-match the
        columns.
      </p>
    </div>
  );
}
