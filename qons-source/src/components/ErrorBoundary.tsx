import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      const isConvexError = this.state.error?.message?.includes("CONVEX");
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <AlertTriangle className="size-12 text-amber-500" />
          <h2 className="text-xl font-semibold">
            {this.props.fallbackTitle ?? "This feature is temporarily unavailable"}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {isConvexError
              ? "This feature requires a backend update that hasn't been deployed yet. It will be available soon."
              : "Something went wrong loading this page. Please try again."}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            <RefreshCw className="size-4 mr-2" />
            Reload Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
