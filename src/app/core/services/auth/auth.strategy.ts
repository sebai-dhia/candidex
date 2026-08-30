export interface AuthStrategy {
  /**
   * Request an OAuth token.
   * @param interactive If true, prompts the user to log in if necessary. If false, fails silently.
   */
  requestToken(interactive: boolean): Promise<string>;

  /**
   * Clear the cached token to force a re-prompt on next login.
   * @param token The token to clear.
   */
  clearToken(token: string): Promise<void>;
}