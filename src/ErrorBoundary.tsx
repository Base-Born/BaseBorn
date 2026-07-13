import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Baseborn.io runtime error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="runtimeError">
        <h1>Baseborn.io</h1>
        <h2>Launch interrupted</h2>
        <p>{this.state.error.message}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </section>
    );
  }
}
