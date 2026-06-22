import { ADMIN_EMAILS, auth } from "./auth";

export const rethrowFirebaseError = (
  operation: string,
  collection: string,
  documentId: string,
  error: unknown,
): never => {
  if (import.meta.env.DEV) {
    const firebaseError = error as { code?: string; message?: string };
    console.error(
      "[Firebase write failed]",
      JSON.stringify({
        operation,
        collection,
        documentId,
        code: firebaseError.code ?? "unknown",
        message: firebaseError.message ?? String(error),
        currentUserEmail: auth().currentUser?.email ?? null,
        adminEmails: ADMIN_EMAILS,
      }),
    );
  }
  throw error;
};
