'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; }

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
                    <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 text-center mb-4">Oops! Something went wrong</h1>
                        <p className="text-slate-600 text-center mb-8">We encountered an unexpected error. Try reloading the page or return to the dashboard.</p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-8 bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-auto max-h-64">
                                <h3 className="font-bold text-sm text-slate-700 mb-2">Error Details:</h3>
                                <pre className="text-xs text-red-600 font-mono whitespace-pre-wrap">{this.state.error.toString()}</pre>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md">
                                <RefreshCw size={18} /> Reload Page
                            </button>
                            <button onClick={() => { window.location.href = '/admin/dashboard'; }} className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border-2 border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium">
                                <Home size={18} /> Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
