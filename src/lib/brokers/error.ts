export function normalizeBrokerRequestError(brokerName: string, error: unknown): Error {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return new Error(
      `${brokerName} connection failed because the broker edge function could not be reached. Check your network, Supabase URL, login session, and deployed broker function, then retry.`,
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(`${brokerName} request failed`);
}
