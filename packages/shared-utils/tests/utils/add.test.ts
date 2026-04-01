import { describe, it, expect } from 'vitest';
import { add } from '../../src/utils/add.js';

describe('add', () => {
  it('should add two positive numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('should add two negative numbers', () => {
    expect(add(-1, -2)).toBe(-3);
  });

  it('should add a positive and a negative number', () => {
    expect(add(5, -3)).toBe(2);
  });

  it('should add zero to a number', () => {
    expect(add(5, 0)).toBe(5);
  });

  it('should handle floating point numbers', () => {
    expect(add(1.5, 2.5)).toBe(4);
  });
});