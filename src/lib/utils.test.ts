import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional');
  });

  it('should handle Tailwind class conflicts', () => {
    // twMerge should resolve conflicts by keeping the last one
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3');
  });

  it('should handle objects with boolean values', () => {
    expect(cn({
      'class1': true,
      'class2': false,
      'class3': true
    })).toBe('class1 class3');
  });

  it('should handle undefined and null values', () => {
    expect(cn('class1', undefined, 'class2', null)).toBe('class1 class2');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn([])).toBe('');
    expect(cn({})).toBe('');
  });

  it('should handle mixed input types', () => {
    expect(cn(
      'base',
      ['array1', 'array2'],
      { 'obj1': true, 'obj2': false },
      'string',
      undefined,
      null
    )).toBe('base array1 array2 obj1 string');
  });

  it('should handle complex Tailwind scenarios', () => {
    // Test responsive classes
    expect(cn('p-4', 'md:p-6', 'lg:p-8')).toBe('p-4 md:p-6 lg:p-8');
    
    // Test hover states
    expect(cn('bg-blue-500', 'hover:bg-blue-600')).toBe('bg-blue-500 hover:bg-blue-600');
    
    // Test conflicting responsive classes
    expect(cn('p-4', 'p-2', 'md:p-6')).toBe('p-2 md:p-6');
  });

  it('should handle whitespace correctly', () => {
    expect(cn('  class1  ', '  class2  ')).toBe('class1 class2');
    expect(cn('class1\n', '\tclass2')).toBe('class1 class2');
  });

  it('should handle duplicate classes', () => {
    // cn doesn't deduplicate, it just merges
    expect(cn('class1', 'class2', 'class1')).toBe('class1 class2 class1');
  });
});