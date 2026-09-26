export class UIDAITransactionLogger {
  public static logTransaction(transactionId: string, event: string, payload?: Record<string, unknown>): boolean {
    if (!transactionId) return false;
    if (payload) {
      console.info(`[UIDAI] ${transactionId} :: ${event}`, payload);
    } else {
      console.info(`[UIDAI] ${transactionId} :: ${event}`);
    }
    return true;
  }
}
