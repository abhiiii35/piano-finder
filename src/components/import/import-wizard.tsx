"use client";

import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { SourceStep } from "./source-step";
import { MappingStep, type PreviewResult } from "./mapping-step";
import { ResultsStep, type RunResult } from "./results-step";
import { autoGuessMapping, looksLikeGazelleExport, type ColumnMapping } from "@/lib/import/mapping";
import { GOOGLE_ROWS_FILENAME } from "@/lib/import/parse";
import { parseImportFile, previewImport, runImport, importFromGoogle } from "@/actions/import";

type Step = "source" | "mapping" | "results";

function readAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:<mime>;base64,XXXX"
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(blob);
  });
}

export function ImportWizard({ googleEnabled }: { googleEnabled: boolean }) {
  const [step, setStep] = useState<Step>("source");
  const [loadingSource, setLoadingSource] = useState(false);
  const [googleError, setGoogleError] = useState<{ message: string; reconnect: boolean } | null>(
    null
  );

  const [fileBase64, setFileBase64] = useState("");
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  async function loadPreview(nextMapping: ColumnMapping) {
    setPreviewing(true);
    try {
      const result = await previewImport(fileBase64, filename, nextMapping);
      setPreview(result);
    } catch {
      toast.error("Could not check your data. Try again.");
    } finally {
      setPreviewing(false);
    }
  }

  async function startWithHeaders(headerList: string[], base64: string, name: string) {
    const guess = autoGuessMapping(headerList);
    setFileBase64(base64);
    setFilename(name);
    setHeaders(headerList);
    setMapping(guess);
    setPreview(null);
    setStep("mapping");
    await loadPreview(guess);
  }

  async function handleFile(file: File) {
    setLoadingSource(true);
    setGoogleError(null);
    try {
      const base64 = await readAsBase64(file);
      const { headers: headerList } = await parseImportFile(base64, file.name);
      if (headerList.length === 0) {
        toast.error("Couldn't find any columns in that file.");
        return;
      }
      await startWithHeaders(headerList, base64, file.name);
    } catch {
      toast.error("Couldn't read that file. Check the format and try again.");
    } finally {
      setLoadingSource(false);
    }
  }

  async function handleGoogle() {
    setLoadingSource(true);
    setGoogleError(null);
    try {
      const result = await importFromGoogle();
      if (!result.ok) {
        setGoogleError({ message: result.message, reconnect: result.reconnect });
        return;
      }
      const base64 = await readAsBase64(
        new Blob([JSON.stringify({ headers: result.headers, rows: result.rows })], {
          type: "application/json",
        })
      );
      await startWithHeaders(result.headers, base64, GOOGLE_ROWS_FILENAME);
    } catch {
      setGoogleError({ message: "Could not load Google Contacts.", reconnect: false });
    } finally {
      setLoadingSource(false);
    }
  }

  function handleMappingChange(next: ColumnMapping) {
    setMapping(next);
    loadPreview(next);
  }

  async function handleRun() {
    setRunning(true);
    try {
      const result = await runImport(fileBase64, filename, mapping);
      setRunResult(result);
      setStep("results");
      if (result.failed.length === 0) {
        toast.success("Import complete");
      }
    } catch {
      toast.error("Import failed. Nothing else was changed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <ol className="mb-8 flex gap-6 text-sm text-muted-foreground">
        {(["source", "mapping", "results"] as Step[]).map((s, i) => (
          <li key={s} className={step === s ? "font-medium text-foreground" : ""}>
            {i + 1}. {s === "source" ? "Source" : s === "mapping" ? "Map columns" : "Done"}
          </li>
        ))}
      </ol>

      {step === "source" && (
        <div className="space-y-4">
          {googleError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {googleError.message}{" "}
              {googleError.reconnect && (
                <Link href="/api/auth/signin/google" className="underline">
                  Reconnect Google
                </Link>
              )}
            </p>
          )}
          <SourceStep
            googleEnabled={googleEnabled}
            loading={loadingSource}
            onFile={handleFile}
            onGoogle={handleGoogle}
          />
        </div>
      )}

      {step === "mapping" && (
        <MappingStep
          headers={headers}
          mapping={mapping}
          onMappingChange={handleMappingChange}
          preview={preview}
          previewing={previewing}
          isGazelle={looksLikeGazelleExport(headers)}
          onBack={() => setStep("source")}
          onNext={handleRun}
          nextDisabled={running || previewing}
          nextLoading={running}
        />
      )}

      {step === "results" && runResult && <ResultsStep result={runResult} />}
    </div>
  );
}
