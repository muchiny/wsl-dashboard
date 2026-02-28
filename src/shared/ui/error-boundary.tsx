import { Component, type ReactNode } from "react";
import { Translation } from "react-i18next";
import { AlertTriangle, RotateCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Translation>
          {(t) => (
            <div className="flex min-h-[300px] items-center justify-center p-8">
              <div className="max-w-md text-center">
                <AlertTriangle className="text-red mx-auto mb-4 h-12 w-12" />
                <h3 className="text-text mb-2 text-lg font-semibold">
                  {t("errors.somethingWentWrong")}
                </h3>
                <p className="text-subtext-0 mb-4 text-sm">
                  {this.state.error?.message ?? t("errors.unexpectedError")}
                </p>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="bg-blue text-crust hover:bg-blue/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  <RotateCw className="h-4 w-4" />
                  {t("errors.tryAgain")}
                </button>
              </div>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}
