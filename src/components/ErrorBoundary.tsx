import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirebaseError = false;

      let isQuotaError = false;
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Firestore ${parsed.operationType} error: ${parsed.error}`;
            isFirebaseError = true;
            if (parsed.error.toLowerCase().includes("quota exceeded") || 
                parsed.error.toLowerCase().includes("resource-exhausted") ||
                parsed.error.toLowerCase().includes("resource_exhausted") ||
                parsed.error.toLowerCase().includes("quota_exceeded")) {
              isQuotaError = true;
            }
          }
        }
      } catch (e) {
        const errorMsgStr = this.state.error?.message || errorMessage;
        errorMessage = errorMsgStr;
        if (errorMsgStr.toLowerCase().includes("quota exceeded") || 
            errorMsgStr.toLowerCase().includes("resource-exhausted") ||
            errorMsgStr.toLowerCase().includes("resource_exhausted") ||
            errorMsgStr.toLowerCase().includes("quota_exceeded")) {
          isQuotaError = true;
        }
      }

      if (isQuotaError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
            <Card className="max-w-xl w-full p-8 text-center space-y-6 shadow-2xl border-t-4 border-t-amber-500 bg-white">
              <div className="inline-flex items-center justify-center p-4 bg-amber-50 rounded-full">
                <AlertTriangle className="w-12 h-12 text-amber-600 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Database Quota Exceeded</h2>
                <div className="text-gray-600 text-sm leading-relaxed space-y-4 text-left bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <p className="font-medium text-gray-800">
                    The Firestore database has reached its free-tier daily read/write limit (quota limit exceeded).
                  </p>
                  <p>
                    Because this application operates on Google Cloud's free-tier sandbox resources, it has a strict daily limit on database reads. Once this threshold is crossed, Google temporarily pauses additional queries to prevent any billing charges.
                  </p>
                  <p className="font-semibold text-amber-700">
                    🕒 What to do next:
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-xs text-gray-500">
                    <li>The daily limits will automatically reset at midnight Pacific Time (US).</li>
                    <li>If you are the developer/administrator, you can upgrade your Firebase project to the Pay-as-you-go (Blaze) plan or optimize Firestore queries to decrease daily read counts.</li>
                    <li>You can try reloading the application using the button below or using offline local features if applicable.</li>
                  </ul>
                </div>
              </div>
              <Button 
                className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white" 
                onClick={() => window.location.reload()}
              >
                <RefreshCcw className="w-4 h-4" /> Refresh and Try Again
              </Button>
            </Card>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-t-4 border-t-red-500">
            <div className="inline-flex items-center justify-center p-4 bg-red-50 rounded-full">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={() => window.location.reload()}
            >
              <RefreshCcw className="w-4 h-4" /> Reload Application
            </Button>
            {isFirebaseError && (
              <p className="text-xs text-gray-400">
                This might be due to missing permissions or a configuration issue.
              </p>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
