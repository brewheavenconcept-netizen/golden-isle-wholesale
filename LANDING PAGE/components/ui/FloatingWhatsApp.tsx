'use client';

import { getWhatsAppLink } from '@/lib/config';
import { usePathname } from 'next/navigation';

export function FloatingWhatsApp() {
    const pathname = usePathname();
    if (pathname?.startsWith('/admin')) return null;

    const message = "Hi, I'd like to know more about Golden Isle Wholesale.";
    const link = getWhatsAppLink(message);

    return (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[9999] w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:scale-110 animate-fade-in group"
            aria-label="Chat on WhatsApp"
        >
            {/* Subtle pulse effect on load */}
            <div className="absolute inset-0 rounded-full border-2 border-[#25D366] animate-ping opacity-75" style={{ animationIterationCount: 3 }} />

            <svg
                viewBox="0 0 32 32"
                className="w-8 h-8 fill-white relative z-10"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M16 2a13.5 13.5 0 0 0-11.4 20.8l-1.9 6.7 6.9-1.8A13.5 13.5 0 1 0 16 2zm0 24.8c-2.1 0-4.2-.6-6-1.6l-.4-.2-4.5 1.2 1.2-4.4-.3-.5A11.3 11.3 0 1 1 16 26.8zm6.2-8.5c-.3-.2-2-.9-2.3-1-.3-.2-.6-.2-.8.2s-1 1.2-1.2 1.5c-.2.2-.4.3-.7.1a9.2 9.2 0 0 1-4.6-2.9c-.3-.4 0-.5.2-.8s.3-.4.5-.6.2-.2.3-.4c.1-.2 0-.3 0-.5s-.8-2-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.6c-.2 0-.6.1-.9.3A2.8 2.8 0 0 0 9 14.5c0 1.6 1.7 3.2 2 3.6.2.3 2.5 3.8 6 5.3 2.4 1.1 3.5 1.1 4.7 1 .9-.1 2-.8 2.3-1.6.3-.7.3-1.4.2-1.5-.2 0-.4-.1-.8-.3z"></path>
            </svg>

            {/* Tooltip tooltip */}
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-[#1a1a1a] text-xs font-bold rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
                Chat with us
                <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-y-4 border-y-transparent border-l-4 border-l-white" />
            </div>
        </a>
    );
}
