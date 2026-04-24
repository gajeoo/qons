import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Calculator,
  Download,
  FileSpreadsheet,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const INCOME_CATEGORIES = [
  { value: "rent_income", label: "Rent Income" },
  { value: "late_fee_income", label: "Late Fee Income" },
  { value: "deposit_income", label: "Deposit Income" },
  { value: "other_income", label: "Other Income" },
] as const;

const EXPENSE_CATEGORIES = [
  { value: "maintenance_expense", label: "Maintenance" },
  { value: "insurance_expense", label: "Insurance" },
  { value: "tax_expense", label: "Taxes" },
  { value: "utility_expense", label: "Utilities" },
  { value: "management_fee", label: "Management Fee" },
  { value: "repair_expense", label: "Repairs" },
  { value: "legal_expense", label: "Legal" },
  { value: "other_expense", label: "Other Expense" },
] as const;

const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCategoryLabel(value: string) {
  return ALL_CATEGORIES.find((c) => c.value === value)?.label || value;
}

function AccountingPageInner() {
  const transactions =
    useQuery(api.accounting.listTransactions, {}) || [];
  const stats = useQuery(api.accounting.getPortfolioSummary, {});
  const properties = useQuery(api.properties.list, {}) || [];
  const createTransaction = useMutation(api.accounting.createTransaction);
  const deleteTransaction = useMutation(api.accounting.deleteTransaction);
  const generateStatement = useMutation(
    api.accounting.generateOwnerStatement
  );

  const [showForm, setShowForm] = useState(false);
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("transactions");

  // P&L tab state
  const [pnlPropertyId, setPnlPropertyId] = useState("");
  const [pnlStartDate, setPnlStartDate] = useState(
    `${new Date().getFullYear()}-01-01`
  );
  const [pnlEndDate, setPnlEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const pnlData = useQuery(
    api.accounting.getPropertyPnL,
    pnlPropertyId
      ? {
          propertyId: pnlPropertyId as Id<"properties">,
          startDate: pnlStartDate,
          endDate: pnlEndDate,
        }
      : "skip"
  );

  const [form, setForm] = useState({
    type: "income" as "income" | "expense",
    category: "rent_income" as string,
    amount: "",
    description: "",
    propertyId: "",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
    referenceNumber: "",
  });

  const [statementForm, setStatementForm] = useState({
    propertyId: "",
    month: new Date().toISOString().slice(0, 7),
  });

  // Property name lookup map
  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) map.set(p._id, p.name);
    return map;
  }, [properties]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterProperty !== "all") {
      result = result.filter((t) => t.propertyId === filterProperty);
    }
    if (filterType !== "all") {
      result = result.filter((t) => t.type === filterType);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.vendor?.toLowerCase().includes(q) ||
          t.referenceNumber?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, filterProperty, filterType, search]);

  const incomeTransactions = filtered.filter((t) => t.type === "income");
  const expenseTransactions = filtered.filter((t) => t.type === "expense");

  const handleCreate = async () => {
    if (!form.amount || !form.description || !form.date) {
      toast.error("Fill required fields");
      return;
    }
    try {
      await createTransaction({
        type: form.type,
        category: form.category as any,
        amount: parseFloat(form.amount),
        description: form.description,
        propertyId: form.propertyId
          ? (form.propertyId as Id<"properties">)
          : undefined,
        date: form.date,
        vendor: form.vendor || undefined,
        referenceNumber: form.referenceNumber || undefined,
      });
      toast.success("Transaction recorded");
      setShowForm(false);
      setForm({
        type: "income",
        category: "rent_income",
        amount: "",
        description: "",
        propertyId: "",
        date: new Date().toISOString().split("T")[0],
        vendor: "",
        referenceNumber: "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create transaction");
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Description",
      "Category",
      "Type",
      "Amount",
      "Property",
      "Vendor",
      "Reference",
    ];
    const rows = filtered.map((t) => [
      t.date,
      t.description,
      getCategoryLabel(t.category),
      t.type,
      t.amount.toString(),
      (t.propertyId ? propertyMap.get(t.propertyId) : "") || "",
      t.vendor || "",
      t.referenceNumber || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleGenerateStatement = async () => {
    if (!statementForm.propertyId || !statementForm.month) {
      toast.error("Select property and month");
      return;
    }
    const [year, month] = statementForm.month.split("-");
    try {
      await generateStatement({
        propertyId: statementForm.propertyId as Id<"properties">,
        month,
        year: parseInt(year),
      });
      toast.success("Owner statement generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate statement");
    }
  };

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">Loading financial data...</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted/50 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-sm text-muted-foreground">
            Track income, expenses, and generate financial reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-teal text-white hover:bg-teal/90"
          >
            <Plus className="size-4" /> Add Transaction
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Income
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Net Income
                </p>
                <p
                  className={`text-2xl font-bold ${
                    stats.netIncome >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(stats.netIncome)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <Wallet className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Transactions
                </p>
                <p className="text-2xl font-bold">
                  {stats.transactionCount}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Receipt className="size-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pnl">P&L Report</TabsTrigger>
          <TabsTrigger value="statements">Owner Statements</TabsTrigger>
        </TabsList>

        {/* Transactions / Income / Expenses tabs */}
        {(["transactions", "income", "expenses"] as const).map((tab) => {
          const data =
            tab === "income"
              ? incomeTransactions
              : tab === "expenses"
                ? expenseTransactions
                : filtered;
          return (
            <TabsContent key={tab} value={tab}>
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={filterProperty}
                  onValueChange={setFilterProperty}
                >
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
                {tab === "transactions" && (
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {data.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center text-muted-foreground">
                    <Calculator className="size-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No transactions found</p>
                    <p className="text-sm mt-1">
                      Add your first transaction to start tracking finances.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.map((txn) => (
                          <TableRow key={txn._id}>
                            <TableCell className="text-muted-foreground">
                              {formatDate(txn.date)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {txn.description}
                                </p>
                                {txn.vendor && (
                                  <p className="text-xs text-muted-foreground">
                                    {txn.vendor}
                                    {txn.referenceNumber
                                      ? ` • Ref: ${txn.referenceNumber}`
                                      : ""}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                {getCategoryLabel(txn.category)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(txn.propertyId
                                ? propertyMap.get(txn.propertyId)
                                : null) || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-semibold ${
                                  txn.type === "income"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {txn.type === "income" ? "+" : "-"}
                                {formatCurrency(txn.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-8 p-0"
                                onClick={() =>
                                  deleteTransaction({
                                    id: txn._id as Id<"accountingTransactions">,
                                  }).then(() =>
                                    toast.success("Transaction removed")
                                  )
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>
          );
        })}

        {/* P&L Report */}
        <TabsContent value="pnl">
          <div className="space-y-4">
            {/* Portfolio summary from stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Portfolio Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Income
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(stats.totalIncome)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Expenses
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(stats.totalExpenses)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Net Income</p>
                    <p
                      className={`text-xl font-bold ${
                        stats.netIncome >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(stats.netIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Property P&L selector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Property P&L Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 flex-wrap mb-4">
                  <div>
                    <Label>Property</Label>
                    <Select
                      value={pnlPropertyId || "__none__"}
                      onValueChange={(v) =>
                        setPnlPropertyId(v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          Select property...
                        </SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={pnlStartDate}
                      onChange={(e) => setPnlStartDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={pnlEndDate}
                      onChange={(e) => setPnlEndDate(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                </div>

                {!pnlPropertyId ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="size-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Select a property</p>
                    <p className="text-sm mt-1">
                      Choose a property above to view its P&L breakdown.
                    </p>
                  </div>
                ) : !pnlData ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Loading P&L data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center border-b pb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Income</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(pnlData.totalIncome)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Expenses
                        </p>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(pnlData.totalExpenses)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Net</p>
                        <p
                          className={`text-lg font-bold ${
                            pnlData.netIncome >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(pnlData.netIncome)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">
                          <ArrowDownLeft className="size-3 inline mr-1" />
                          Income by Category
                        </p>
                        <div className="space-y-2">
                          {Object.entries(pnlData.incomeByCategory).length >
                          0 ? (
                            Object.entries(pnlData.incomeByCategory).map(
                              ([cat, amount]) => {
                                const maxAmt = Math.max(
                                  ...Object.values(pnlData.incomeByCategory),
                                  1
                                );
                                return (
                                  <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span>{getCategoryLabel(cat)}</span>
                                      <span className="text-green-600">
                                        {formatCurrency(amount as number)}
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        ((amount as number) / maxAmt) * 100
                                      }
                                      className="h-1.5"
                                    />
                                  </div>
                                );
                              }
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No income recorded
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-2">
                          <ArrowUpRight className="size-3 inline mr-1" />
                          Expenses by Category
                        </p>
                        <div className="space-y-2">
                          {Object.entries(pnlData.expenseByCategory).length >
                          0 ? (
                            Object.entries(pnlData.expenseByCategory).map(
                              ([cat, amount]) => {
                                const maxAmt = Math.max(
                                  ...Object.values(pnlData.expenseByCategory),
                                  1
                                );
                                return (
                                  <div key={cat} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                      <span>{getCategoryLabel(cat)}</span>
                                      <span className="text-red-600">
                                        {formatCurrency(amount as number)}
                                      </span>
                                    </div>
                                    <Progress
                                      value={
                                        ((amount as number) / maxAmt) * 100
                                      }
                                      className="h-1.5"
                                    />
                                  </div>
                                );
                              }
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No expenses recorded
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Owner Statements */}
        <TabsContent value="statements">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generate Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <Label>Property</Label>
                    <Select
                      value={statementForm.propertyId || "__none__"}
                      onValueChange={(v) =>
                        setStatementForm({
                          ...statementForm,
                          propertyId: v === "__none__" ? "" : v,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select...</SelectItem>
                        {properties.map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Month</Label>
                    <Input
                      type="month"
                      value={statementForm.month}
                      onChange={(e) =>
                        setStatementForm({
                          ...statementForm,
                          month: e.target.value,
                        })
                      }
                      className="w-[180px]"
                    />
                  </div>
                  <Button
                    onClick={handleGenerateStatement}
                    className="bg-teal text-white hover:bg-teal/90"
                  >
                    <FileSpreadsheet className="size-4" /> Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <Receipt className="size-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Generate Owner Statements</p>
                <p className="text-sm mt-1">
                  Select a property and month above to generate a statement
                  summarizing income, expenses, and net income.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Transaction Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: "income" | "expense") =>
                    setForm({
                      ...form,
                      type: v,
                      category:
                        v === "income" ? "rent_income" : "maintenance_expense",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(form.type === "income"
                      ? INCOME_CATEGORIES
                      : EXPENSE_CATEGORIES
                    ).map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What is this transaction for?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Property</Label>
                <Select
                  value={form.propertyId || "__none__"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
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
              <div>
                <Label>Vendor</Label>
                <Input
                  value={form.vendor}
                  onChange={(e) =>
                    setForm({ ...form, vendor: e.target.value })
                  }
                  placeholder="Vendor name"
                />
              </div>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={form.referenceNumber}
                onChange={(e) =>
                  setForm({ ...form, referenceNumber: e.target.value })
                }
                placeholder="Invoice #, Check #, etc."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <Plus className="size-4" /> Add Transaction
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AccountingPage() {
  return (
    <FeatureGate feature="accounting">
      <AccountingPageInner />
    </FeatureGate>
  );
}
