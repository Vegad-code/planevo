import type { Components } from 'react-markdown';

function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return /^https?:\/\//i.test(href);
}

/** External links open in a new tab so Planevo stays open in the chat sidebar. */
export const brunoMarkdownComponents: Components = {
  a({ href, children, ...props }) {
    if (isExternalHref(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    }

    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
};
