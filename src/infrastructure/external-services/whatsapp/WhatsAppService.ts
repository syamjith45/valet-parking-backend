export interface WhatsAppMessage {
    phoneNumber: string;
    token: string;
    vehicleNumber: string;
    zone: string;
    slot: string;
}

export class WhatsAppService {
    async sendTokenMessage(message: WhatsAppMessage): Promise<void> {
        // Check if WhatsApp is configured
        if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_TOKEN) {
            console.log('[WhatsApp] Integration disabled or missing credentials. Skipping message send.');
            // Log what would have been sent for debugging/verification
            console.log(`[WhatsApp] (Skipped) Sending token ${message.token} to ${message.phoneNumber}`);
            return Promise.resolve();
        }

        // Stub implementation - log to console
        console.log(`[WhatsApp] Sending token ${message.token} to ${message.phoneNumber} for vehicle ${message.vehicleNumber} at ${message.zone}-${message.slot}`);
        return Promise.resolve();
    }
}
