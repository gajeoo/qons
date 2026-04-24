import { useMutation } from "convex/react";
import { Check, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface SignaturePadProps {
  open: boolean;
  onClose: () => void;
  documentId?: Id<"documents">;
  leaseId?: Id<"leases">;
  documentTitle?: string;
  onSigned?: () => void;
}

export function SignaturePad({
  open,
  onClose,
  documentId,
  leaseId,
  documentTitle,
  onSigned,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const sign = useMutation(api.eSignatures.sign);

  // Initialize canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Drawing style
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Clear
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Signature line
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 40);
    ctx.lineTo(rect.width - 20, rect.height - 40);
    ctx.stroke();

    // Label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px system-ui";
    ctx.fillText("Sign above this line", 20, rect.height - 20);

    // Reset drawing style
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    setHasContent(false);
  }, [open]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasContent(true);
    },
    [getPos],
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing, getPos],
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw signature line
    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 40);
    ctx.lineTo(rect.width - 20, rect.height - 40);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px system-ui";
    ctx.fillText("Sign above this line", 20, rect.height - 20);
    ctx.restore();

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setHasContent(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;
    setSaving(true);
    try {
      const signatureData = canvas.toDataURL("image/png");
      await sign({
        signatureData,
        documentId,
        leaseId,
        documentTitle,
      });
      onSigned?.();
      onClose();
    } catch (e) {
      console.error("Sign failed:", e);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
          <DialogDescription>
            {documentTitle
              ? `Sign "${documentTitle}" by drawing your signature below.`
              : "Draw your signature below to sign this document."}
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair touch-none"
            style={{ height: 200 }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          By signing, you agree that this electronic signature is legally binding and equivalent to
          a handwritten signature.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={clearCanvas}>
            <RotateCcw className="size-3 mr-1" /> Clear
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="size-3 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSign} disabled={!hasContent || saving}>
            <Check className="size-3 mr-1" /> {saving ? "Signing…" : "Sign & Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
