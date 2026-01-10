/**
 * Email validation utility
 * Uses a more comprehensive regex that handles most valid email formats
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim();
  
  // Additional checks for edge cases
  if (trimmedEmail.includes('..') || trimmedEmail.includes(' ')) {
    return false;
  }
  
  // More comprehensive email regex that requires proper TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  return emailRegex.test(trimmedEmail);
}

/**
 * Validates email and returns error message if invalid
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "Email is required";
  }
  
  if (!isValidEmail(email)) {
    return "Please enter a valid email address";
  }
  
  return null;
}
