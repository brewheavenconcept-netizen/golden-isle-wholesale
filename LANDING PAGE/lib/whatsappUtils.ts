export const sendToWhatsApp = (text: string) => {
    console.log("🚀 [WhatsApp Simulation] Sending message:", text);

    // Simulate a delay and then "send"
    setTimeout(() => {
        alert(`📲 WhatsApp Simulation:\n\n"${text}"\n\n(This would normally be sent to the user's phone)`);
        // In a real app, this could check for 'wa.me' link or API integration
    }, 1000);
};
