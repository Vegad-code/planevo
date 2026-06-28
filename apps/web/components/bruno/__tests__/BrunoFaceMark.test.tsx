import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrunoFaceMark } from '@/components/bruno/BrunoFaceMark';
import { BRUNO_FACE_PATHS } from '@/components/bruno/bruno-face-art';

describe('BrunoFaceMark', () => {
  it('renders an accessible inline svg', () => {
    const { getByRole } = render(<BrunoFaceMark size={36} />);
    const svg = getByRole('img', { name: 'Bruno' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('width', '36');
    expect(svg).toHaveAttribute('height', '36');
  });

  it('themes only the background paths with settings brand token', () => {
    const themedPaths = BRUNO_FACE_PATHS.filter(
      (path) => path.fill === 'var(--color-settings-brand)',
    );
    const facePaths = BRUNO_FACE_PATHS.filter(
      (path) => path.fill !== 'var(--color-settings-brand)',
    );

    expect(themedPaths.length).toBe(5);
    expect(facePaths.length).toBe(29);
    expect(facePaths.filter((path) => path.fill === '#FFFFFF').length).toBe(4);
    expect(facePaths.some((path) => path.fill === '#B26F46')).toBe(true);
    expect(facePaths.some((path) => path.fill === '#E6A56B')).toBe(true);
  });

  it('includes a themed background path in the rendered svg', () => {
    const { container } = render(<BrunoFaceMark />);
    const themedPath = container.querySelector(
      'path[fill="var(--color-settings-brand)"]',
    );
    expect(themedPath).toBeTruthy();
  });

  it('keeps eye highlight paths white', () => {
    const { container } = render(<BrunoFaceMark />);
    const whitePaths = container.querySelectorAll('path[fill="#FFFFFF"]');
    expect(whitePaths.length).toBe(4);
  });
});
