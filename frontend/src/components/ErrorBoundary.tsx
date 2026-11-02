import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="page space-y-3 pt-12 text-center" role="alert">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">Please reload the page. Your saved data is safe.</p>
        <Button className="btn-tap" onClick={() => window.location.reload()}>Reload</Button>
      </main>
    );
  }
}