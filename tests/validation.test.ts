import { describe, it, expect } from 'vitest';
import { isValidEmail, validateEmail } from '../src/lib/validation';

describe('Email Validation', () => {
  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user_name@example-domain.com',
        'test123@test123.com',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example',
        'user name@example.com'
      ];

      invalidEmails.forEach(email => {
        expect(isValidEmail(email), `Expected "${email}" to be invalid`).toBe(false);
      });
    });

    it('should handle whitespace correctly', () => {
      expect(isValidEmail('  test@example.com  ')).toBe(true);
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    it('should handle null and undefined correctly', () => {
      expect(isValidEmail(null as unknown as string)).toBe(false);
      expect(isValidEmail(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return null for valid emails', () => {
      expect(validateEmail('test@example.com')).toBeNull();
    });

    it('should return error message for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('   ')).toBe('Email is required');
    });

    it('should return error message for invalid email', () => {
      expect(validateEmail('invalid-email')).toBe('Please enter a valid email address');
    });
  });
});
