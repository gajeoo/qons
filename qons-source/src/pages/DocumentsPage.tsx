import { useMutation, useQuery } from "convex/react";
import {
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Grid3X3,
  List,
  Search,
  Shield,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const DOC_TYPES = [
  "lease",
  "inspection",
  "insurance",
  "tax",
  "receipt",
  "contract",
  "notice",
  "other",
] as const;

const typeColors: Record<string, string> = {
  lease: "bg-blue-100 text-blue-700",
  inspection: "bg-amber-100 text-amber-700",
  insurance: "bg-purple-100 text-purple-700",
  tax: "bg-green-100 text-green-700",
  receipt: "bg-sky-100 text-sky-700",
  contract: "bg-orange-100 text-orange-700",
  notice: "bg-red-100 text-red-700",
  other: "bg-gray-100 text-gray-600",
};

const typeIcons: Record<string, React.ReactNode> = {
  lease: <FileText className="size-5" />,
  inspection: <Eye className="size-5" />,
  insurance: <Shield className="size-5" />,
  tax: <FileSpreadsheet className="size-5" />,
  receipt: <File className="size-5" />,
  contract: <FileText className="size-5" />,
  notice: <FileText className="size-5" />,
  other: <FolderOpen className="size-5" />,
};

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Per-document component to fetch URL and render action buttons */
function DocActions({
  docId,
  onDelete,
  variant = "grid",
}: {
  docId: Id<"documents">;
  onDelete: () => void;
  variant?: "grid" | "list";
}) {
  const docWithUrl = useQuery(api.documents.getUrl, { id: docId });

  if (variant === "list") {
    return (
      <div className="flex gap-1 justify-end">
        {docWithUrl?.url && (
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0"
            onClick={() => window.open(docWithUrl.url!, "_blank")}
          >
            <Download className="size-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="size-8 p-0 text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
      {docWithUrl?.url && (
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => window.open(docWithUrl.url!, "_blank")}
        >
          <Download className="size-3" /> Download
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={onDelete}
      >
        <Trash2 className="size-3" />
      </Button>
    </div>
  );
}

function DocumentsPageInner() {
  const documents = useQuery(api.documents.list, {}) || [];
  const properties = useQuery(api.properties.list, {}) || [];
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const uploadDocument = useMutation(api.documents.upload);
  const removeDocument = useMutation(api.documents.remove);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterType, setFilterType] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "",
    type: "other" as (typeof DOC_TYPES)[number],
    propertyId: "",
  });

  // Property name lookup map
  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) map.set(p._id, p.name);
    return map;
  }, [properties]);

  const filtered = useMemo(() => {
    let result = documents;
    if (filterType !== "all") {
      result = result.filter((d) => d.type === filterType);
    }
    if (filterProperty !== "all") {
      result = result.filter((d) => d.propertyId === filterProperty);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d) => {
        const propName = d.propertyId
          ? propertyMap.get(d.propertyId) || ""
          : "";
        return (
          d.name.toLowerCase().includes(q) ||
          propName.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [documents, filterType, filterProperty, search, propertyMap]);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!uploadForm.name && !file.name) {
        toast.error("Document name is required");
        return;
      }
      setUploading(true);
      try {
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();

        await uploadDocument({
          name: uploadForm.name || file.name,
          type: uploadForm.type,
          storageId: storageId as Id<"_storage">,
          propertyId: uploadForm.propertyId
            ? (uploadForm.propertyId as Id<"properties">)
            : undefined,
          fileSize: file.size,
          mimeType: file.type,
        });

        toast.success("Document uploaded");
        setShowUpload(false);
        setUploadForm({ name: "", type: "other", propertyId: "" });
      } catch (e: any) {
        toast.error(e.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [uploadForm, generateUploadUrl, uploadDocument]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        setUploadForm((prev) => ({ ...prev, name: prev.name || file.name }));
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm((prev) => ({ ...prev, name: prev.name || file.name }));
      handleUpload(file);
    }
  };

  const handleDelete = (docId: Id<"documents">) => {
    removeDocument({ id: docId }).then(() => toast.success("Document deleted"));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Store and manage property documents, contracts, and receipts.
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-teal text-white hover:bg-teal/90"
        >
          <Upload className="size-4" /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p._id} value={p._id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="size-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <FolderOpen className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No documents found</p>
            <p className="text-sm mt-1">
              Upload your first document to start organizing files.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doc) => (
            <Card
              key={doc._id}
              className="group hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                      typeColors[doc.type]
                        ? typeColors[doc.type]
                            .split(" ")[0]
                            .replace("text-", "bg-")
                            .replace("700", "100")
                        : "bg-gray-100"
                    }`}
                  >
                    {typeIcons[doc.type] || <File className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        className={`${typeColors[doc.type] || ""} text-[10px] capitalize`}
                      >
                        {doc.type}
                      </Badge>
                    </div>
                    {doc.propertyId && propertyMap.get(doc.propertyId) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {propertyMap.get(doc.propertyId)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{formatDate(doc.uploadedAt)}</span>
                      {doc.fileSize && (
                        <span>{formatFileSize(doc.fileSize)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <DocActions
                  docId={doc._id as Id<"documents">}
                  onDelete={() => handleDelete(doc._id as Id<"documents">)}
                  variant="grid"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc._id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>
                      <Badge
                        className={`${typeColors[doc.type] || ""} text-[11px] capitalize`}
                      >
                        {doc.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(doc.propertyId
                        ? propertyMap.get(doc.propertyId)
                        : null) || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(doc.uploadedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.fileSize ? formatFileSize(doc.fileSize) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DocActions
                        docId={doc._id as Id<"documents">}
                        onDelete={() =>
                          handleDelete(doc._id as Id<"documents">)
                        }
                        variant="list"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Name</Label>
              <Input
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, name: e.target.value })
                }
                placeholder="Name (auto-filled from file if blank)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={uploadForm.type}
                  onValueChange={(v: any) =>
                    setUploadForm({ ...uploadForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property</Label>
                <Select
                  value={uploadForm.propertyId || "__none__"}
                  onValueChange={(v) =>
                    setUploadForm({
                      ...uploadForm,
                      propertyId: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Property</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-teal bg-teal/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="size-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drop file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, images, documents up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DocumentsPage() {
  return (
    <FeatureGate feature="documents">
      <DocumentsPageInner />
    </FeatureGate>
  );
}
