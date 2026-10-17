"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * Age check as a modal. Uses your existing ageVerification.confirmAdult
 * mutation (server validates the date of birth and stores only ageConfirmedAt),
 * so no backend or schema change is needed.
 */
export function AgeGateDialog({
  open,
  onOpenChange,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}) {
  const confirmAdult = useMutation(api.ageVerification.confirmAdult);
  const [dob, setDob] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    if (!dob) return setError("Enter your date of birth");
    if (!agreed) return setError("Please tick the confirmation");
    setBusy(true);
    try {
      await confirmAdult({ dateOfBirth: dob });
      onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm you&apos;re 18 or older</DialogTitle>
          <DialogDescription>
            This site is for adults only. Enter your date of birth to continue
            to payment. We don&apos;t store it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="agreed"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="agreed"
              className="text-sm font-normal leading-snug"
            >
              I confirm that I am 18 or older and that the date I entered is
              true.
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button onClick={onConfirm} disabled={busy} className="w-full">
            {busy ? "Checking…" : "Confirm and continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
