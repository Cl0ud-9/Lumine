import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-mesh p-6 overflow-auto">
                    <div className="sticker-card rounded-[2rem] p-8 max-w-lg w-full text-center">
                        <h1 className="font-['Fredoka'] text-3xl font-bold text-[#ff4d7d] mb-3">Something went wrong 💔</h1>
                        <p className="font-['Quicksand'] text-gray-600 font-semibold mb-6">
                            An unexpected error occurred. Reloading the page usually fixes it.
                        </p>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="bubbly-yes px-8 py-3 rounded-[2rem] font-['Fredoka'] text-white font-semibold uppercase tracking-wider"
                        >
                            Reload
                        </button>
                        {/* Stack traces are for developers - never shown to visitors in production. */}
                        {import.meta.env.DEV && (
                            <pre className="mt-6 bg-red-100 text-red-900 p-4 rounded text-left text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
                                {this.state.error && this.state.error.toString()}
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </pre>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
