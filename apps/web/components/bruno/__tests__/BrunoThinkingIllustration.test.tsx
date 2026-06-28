import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrunoThinkingIllustration } from '@/components/bruno/BrunoThinkingIllustration';
import { BRUNO_THINKING_VIEWBOX } from '@/components/bruno/bruno-thinking-art';

describe('BrunoThinkingIllustration', () => {
  it('renders inline svg at a readable empty-state size', () => {
    const { container } = render(<BrunoThinkingIllustration />);
    const svg = container.querySelector('svg');

    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('height', '140');
    expect(svg).toHaveAttribute('viewBox', BRUNO_THINKING_VIEWBOX);
  });

  it('applies pointer-events-none styling and drop shadow wrapper', () => {
    const { container } = render(<BrunoThinkingIllustration />);
    const svg = container.querySelector('svg');
    const wrapper = svg?.parentElement;
    const [, , viewW, viewH] = BRUNO_THINKING_VIEWBOX.split(' ').map(Number);
    const expectedWidth = Math.round(140 * (viewW / viewH));

    expect(svg?.getAttribute('class')).toContain('pointer-events-none');
    expect(wrapper?.className).toContain('drop-shadow');
    expect(wrapper).toHaveStyle({
      width: `${expectedWidth}px`,
      height: '140px',
    });
  });

  it('keeps character detail without margin background tiles in the asset', () => {
    const svgPath = path.join(
      process.cwd(),
      'public/bruno-thinking-empty.svg',
    );
    const svg = readFileSync(svgPath, 'utf8');

    expect((svg.match(/fill="#FFFFFF"/g) ?? []).length).toBe(7);
    expect((svg.match(/fill="#E9E8E8"/g) ?? []).length).toBe(1);
    expect((svg.match(/fill="#5D341E"/g) ?? []).length).toBe(9);
    expect(svg).toContain('linearGradient id="gradient_0"');
    expect(svg).toContain('linearGradient id="gradient_6"');
    expect(svg).not.toMatch(/width="/);
    expect(svg).not.toContain('fill="#FDFDFD"');
  });
});
