export interface AuthStrategy {
  /**
   * Request an OAuth token.
   * @param interactive If true, prompts the user to log in if necessary. If false, fails silently.
   */
  requestToken(interactive: boolean): Promise<string>;
}
