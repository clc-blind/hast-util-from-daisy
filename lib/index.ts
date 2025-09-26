/**
 * hast-util-from-daisy
 *
 * A utility to convert DAISY v3 XML documents to semantic HTML elements in HAST.
 * Transforms complete DAISY audiobook markup to accessible HTML while preserving
 * semantic meaning, accessibility features, and document metadata.
 *
 * @example
 * ```js
 * import { fromDaisyXml } from 'hast-util-from-daisy'
 *
 * const daisyXml = `<?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
 *   "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
 * <dtbook version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/dtbook/">
 *   <head>
 *     <meta name="dtb:uid" content="example-123" />
 *     <meta name="dc:Title" content="Example Book" />
 *   </head>
 *   <book>
 *     <frontmatter>
 *       <level1>
 *         <hd>Chapter 1</hd>
 *         <p>Example content</p>
 *       </level1>
 *     </frontmatter>
 *   </book>
 * </dtbook>`
 *
 * const result = fromDaisyXml(daisyXml)
 * console.log(result.metadata['dtb:uid']) // "example-123"
 * ```
 */

import type { Element, Properties, Root } from 'hast';
import type { Element as XastElement, Root as XastRoot } from 'xast';
import { fromXml } from 'xast-util-from-xml';

type DaisyElementMapping = {
  tagName: string;
  dataType?: string;
  preserveAttributes?: string[];
  roleAttribute?: string;
};

type FromDaisyOptions = {
  preserveDataAttributes?: boolean;
  customMappings?: Record<string, DaisyElementMapping>;
};

/**
 * DAISY to HTML element mapping configuration
 * Only includes DAISY-specific elements that need conversion to HTML.
 * Standard HTML elements (a, p, div, span, etc.) are left as-is.
 */
const DAISY_ELEMENT_MAP: Record<string, DaisyElementMapping> = {
  // Document Structure (DAISY-specific)
  dtbook: { tagName: 'main', roleAttribute: 'document' },
  book: { tagName: 'article', dataType: 'book' },
  frontmatter: { tagName: 'section', dataType: 'frontmatter' },
  bodymatter: { tagName: 'main', dataType: 'bodymatter' },
  rearmatter: { tagName: 'section', dataType: 'rearmatter' },

  // Navigation and Hierarchy (DAISY-specific)
  level: { tagName: 'section', dataType: 'level' },
  level1: { tagName: 'section', dataType: 'level-1' },
  level2: { tagName: 'section', dataType: 'level-2' },
  level3: { tagName: 'section', dataType: 'level-3' },
  level4: { tagName: 'section', dataType: 'level-4' },
  level5: { tagName: 'section', dataType: 'level-5' },
  level6: { tagName: 'section', dataType: 'level-6' },
  hd: { tagName: 'h1' }, // Will be adjusted based on level depth
  bridgehead: { tagName: 'h3', dataType: 'bridgehead' },
  pagenum: { tagName: 'span', dataType: 'page-number' },

  // Document metadata (DAISY-specific)
  doctitle: { tagName: 'h1', dataType: 'document-title' },
  docauthor: { tagName: 'div', dataType: 'document-author' },
  covertitle: { tagName: 'h2', dataType: 'cover-title' },
  author: { tagName: 'cite', dataType: 'author' },

  // Text Structure (DAISY-specific)
  linegroup: { tagName: 'div', dataType: 'linegroup' },
  line: { tagName: 'span', dataType: 'line' },
  linenum: { tagName: 'span', dataType: 'linenum' },
  sent: { tagName: 'span', dataType: 'sentence' },
  w: { tagName: 'span', dataType: 'word' },

  // DAISY-specific inline elements
  acronym: { tagName: 'abbr', dataType: 'acronym' }, // Convert to abbr since acronym is deprecated

  // Notes and Annotations (DAISY-specific)
  prodnote: { tagName: 'aside', dataType: 'production-note' },
  noteref: {
    tagName: 'a',
    dataType: 'note-ref',
    preserveAttributes: ['href', 'idref'],
  },
  annoref: {
    tagName: 'a',
    dataType: 'annotation-ref',
    preserveAttributes: ['href', 'idref'],
  },
  annotation: { tagName: 'aside', dataType: 'annotation' },
  note: { tagName: 'aside', dataType: 'note' },

  // Specialized Content (DAISY-specific)
  sidebar: { tagName: 'aside', dataType: 'sidebar' },
  epigraph: { tagName: 'blockquote', dataType: 'epigraph' },
  poem: { tagName: 'article', dataType: 'poem' },

  // DAISY Lists (enhanced beyond standard HTML)
  list: { tagName: 'ul' }, // Will be adjusted based on type attribute
  lic: { tagName: 'span', dataType: 'list-item-component' },

  // DAISY-specific block elements
  byline: { tagName: 'div', dataType: 'byline' },
  dateline: { tagName: 'div', dataType: 'dateline' },

  // Media and Images (DAISY-specific)
  imggroup: { tagName: 'section', dataType: 'image-group' },
};

/**
 * Convert DAISY-specific attributes to data-daisy-* format for any element
 */

/**
 * Get the appropriate heading level based on the current nesting depth
 */
function getHeadingLevel(element: XastElement, ancestors: Element[]): string {
  // Special case: if hd is inside a list, it should be h3 for list headings
  const parentIsListLike = ancestors.some(
    (ancestor) =>
      ancestor.tagName === 'ul' ||
      ancestor.tagName === 'ol' ||
      ancestor.tagName === 'dl',
  );

  if (parentIsListLike) {
    return 'h3';
  }

  // Count level elements in ancestors to determine heading depth
  const levelCount = ancestors.filter(
    (ancestor) =>
      ancestor.tagName === 'section' &&
      ancestor.properties?.['data-daisy-type']
        ?.toString()
        .match(/^level(-[1-6])?$/),
  ).length;

  // Heading level should be level count + 1 (h1 for top level, h2 for second, etc.)
  // But since we're inside the level element, we want the current level number
  const headingLevel = Math.min(Math.max(levelCount, 1), 6);
  return `h${headingLevel}`;
}

/**
 * Convert DAISY list element to appropriate HTML list type
 */
function getListType(element: XastElement): string {
  const type = element.attributes?.type;
  if (type === 'ol' || type === 'ordered') {
    return 'ol';
  }
  return 'ul'; // Default to unordered list
}

/**
 * Convert DAISY-specific attributes to data-daisy-* format for any element
 */
function convertDaisyAttributes(
  attributes: Record<string, string | null | undefined>,
): Properties {
  const properties: Properties = {};

  if (!attributes) return properties;

  // Standard HTML attributes that should be preserved as-is
  const standardHtmlAttributes = new Set([
    'accesskey',
    'align',
    'alt',
    'axis',
    'border',
    'cellpadding',
    'cellspacing',
    'char',
    'charoff',
    'charset',
    'cite',
    'class',
    'colspan',
    'content',
    'dir',
    'frame',
    'headers',
    'height',
    'href',
    'hreflang',
    'http-equiv',
    'id',
    'lang',
    'media',
    'name',
    'profile',
    'rel',
    'rowspan',
    'rules',
    'scope',
    'span',
    'src',
    'style',
    'summary',
    'tabindex',
    'title',
    'type',
    'valign',
    'width',
    // Also preserve ARIA and data attributes
    'role',
  ]);

  Object.keys(attributes).forEach((key) => {
    const value = attributes[key];
    if (value == null) return;

    // Helper function to convert values to proper types
    const convertValue = (
      val: typeof value,
    ): string | number | boolean | null | undefined => {
      if (Array.isArray(val)) {
        return val.join(' ');
      }
      return val;
    };

    // Special handling for class attribute (becomes className in HAST)
    if (key === 'class') {
      properties.className = convertValue(value);
      return;
    }

    // Preserve standard HTML attributes, ARIA attributes, and data attributes
    if (
      standardHtmlAttributes.has(key) ||
      key.startsWith('aria-') ||
      key.startsWith('data-')
    ) {
      properties[key] = convertValue(value);
    } else {
      // Convert DAISY-specific attributes to data-daisy-* format
      properties[`data-daisy-${key}`] = convertValue(value);
    }
  });

  return properties;
}

/**
 * Convert DAISY element attributes to HTML data attributes
 */
function convertAttributes(
  element: XastElement,
  mapping: DaisyElementMapping,
): Properties {
  const newProperties: Properties = {};

  // Add role attribute if specified
  if (mapping.roleAttribute) {
    newProperties.role = mapping.roleAttribute;
  }

  // Add data-daisy-type if specified
  if (mapping.dataType) {
    newProperties['data-daisy-type'] = mapping.dataType;
  }

  // Preserve specific attributes if configured
  if (mapping.preserveAttributes) {
    mapping.preserveAttributes.forEach((attr) => {
      if (element.attributes?.[attr]) {
        const value = element.attributes[attr];
        // Handle array values by joining them
        if (Array.isArray(value)) {
          newProperties[attr] = value.join(' ');
        } else {
          newProperties[attr] = value;
        }
      }
    });
  }

  // Convert all DAISY attributes using the unified function
  const daisyAttributes = convertDaisyAttributes(element.attributes || {});

  // Merge the properties, with specific mappings taking precedence
  Object.keys(daisyAttributes).forEach((key) => {
    if (!(key in newProperties)) {
      newProperties[key] = daisyAttributes[key];
    }
  });

  return newProperties;
}

/**
 * Transform a DAISY XAST element to its HTML HAST equivalent
 */
function transformDaisyElement(
  element: XastElement,
  ancestors: Element[],
  mapping: DaisyElementMapping,
): Element {
  const originalTagName = element.name;

  if (!mapping) {
    // Convert XAST element to basic HAST element if no mapping exists
    return {
      type: 'element',
      tagName: originalTagName,
      properties: {},
      children: [], // Will be handled by convertXastChildren
    };
  }

  let newTagName = mapping.tagName;

  // Special handling for specific elements
  if (originalTagName === 'hd') {
    newTagName = getHeadingLevel(element, ancestors);
  } else if (originalTagName === 'list') {
    newTagName = getListType(element);
  }

  // Convert attributes
  const newProperties = convertAttributes(element, mapping);

  // Create new HAST element with transformed properties
  const transformedElement: Element = {
    type: 'element',
    tagName: newTagName,
    properties: newProperties,
    children: [], // Children will be set by the calling function
  };

  return transformedElement;
}

/**
 * Convert XAST children to HAST children with DAISY transformation
 */
function convertXastChildren(
  children: XastRoot['children'],
  mappings: Record<string, DaisyElementMapping>,
  ancestors: Element[] = [],
): Element['children'] {
  if (!children) return [];

  return children.map((child) => {
    if (child.type === 'text') {
      return child;
    }

    if (child.type === 'element') {
      const xastElement = child as XastElement;

      // Check if this is a DAISY element that needs conversion
      if (mappings[xastElement.name]) {
        const transformedElement = transformDaisyElement(
          xastElement,
          ancestors,
          mappings[xastElement.name]!,
        );

        // For level elements, add to ancestors for proper heading depth calculation
        // Also add list elements for list heading calculations
        const newAncestors =
          xastElement.name.match(/^level[1-6]?$/) || xastElement.name === 'list'
            ? [...ancestors, transformedElement]
            : ancestors;

        // Add converted children to the transformed element
        transformedElement.children = convertXastChildren(
          xastElement.children || [],
          mappings,
          newAncestors,
        );

        return transformedElement;
      }

      // Convert to basic HAST element for HTML-compatible elements
      const hastElement: Element = {
        type: 'element',
        tagName: xastElement.name,
        properties: convertDaisyAttributes(xastElement.attributes || {}),
        children: convertXastChildren(xastElement.children || [], mappings, [
          ...ancestors,
        ]),
      };

      return hastElement;
    }

    // For other node types (comments, etc.), convert to text
    return { type: 'text', value: '' };
  });
}

/**
 * Convert DAISY elements to HTML semantic elements in a HAST tree
 *
 * @param tree - The XAST tree to transform (from xast-util-from-xml)
 * @param options - Configuration options
 * @returns The transformed HAST tree with DAISY elements converted to HTML
 */
export function fromDaisy(
  tree: XastRoot,
  options: FromDaisyOptions = {},
): Root {
  const mappings = { ...DAISY_ELEMENT_MAP, ...options.customMappings };

  // Convert XAST to HAST with proper transformation
  const hastTree: Root = {
    type: 'root',
    children: convertXastChildren(tree.children || [], mappings),
  };

  return hastTree;
}

/**
 * Convert DAISY elements to HTML semantic elements in a cloned XAST tree
 * (non-mutating version)
 *
 * @param tree - The XAST tree to transform
 * @param options - Configuration options
 * @returns A new HAST tree with DAISY elements converted to HTML
 */
export function fromDaisyClone(
  tree: XastRoot,
  options: FromDaisyOptions = {},
): Root {
  // Deep clone the XAST tree to avoid mutating the original
  const clonedTree = JSON.parse(JSON.stringify(tree)) as XastRoot;
  return fromDaisy(clonedTree, options);
}

/**
 * Check if an element is a DAISY-specific element that needs conversion
 */
export function isDaisyElement(tagName: string): boolean {
  return tagName in DAISY_ELEMENT_MAP;
}

/**
 * Get the HTML equivalent tag name for a DAISY element
 */
export function getDaisyMapping(tagName: string): string | undefined {
  return DAISY_ELEMENT_MAP[tagName]?.tagName;
}

/**
 * Extract DAISY book content from a complete DTBook XML document
 *
 * @param tree - The complete XAST tree of a DAISY document
 * @returns The book content subtree or null if not found
 */
function extractBookContent(tree: XastRoot): XastElement | null {
  const findBookElement = (
    elements: XastRoot['children'],
  ): XastElement | null => {
    if (!elements) return null;

    // First check direct children for book element
    const directBook = elements
      .filter((element) => element.type === 'element')
      .map((element) => element as XastElement)
      .find((xastElement) => xastElement.name === 'book');

    if (directBook) return directBook;

    // Then recursively search in children
    return elements
      .filter((element) => element.type === 'element')
      .map((element) => element as XastElement)
      .reduce<XastElement | null>((found, xastElement) => {
        if (found) return found;
        if (xastElement.children) {
          return findBookElement(xastElement.children);
        }
        return null;
      }, null);
  };

  return findBookElement(tree.children);
}

/**
 * Extract metadata from DAISY document head
 *
 * @param tree - The complete XAST tree of a DAISY document
 * @returns Metadata as key-value pairs
 */
function extractMetadata(tree: XastRoot): Record<string, string> {
  const metadata: Record<string, string> = {};

  const findMetadata = (elements: XastRoot['children']): void => {
    if (!elements) return;

    elements
      .filter((element) => element.type === 'element')
      .map((element) => element as XastElement)
      .forEach((xastElement) => {
        // Look for head element
        if (xastElement.name === 'head' && xastElement.children) {
          // Extract meta elements
          xastElement.children
            .filter((child) => child.type === 'element')
            .map((child) => child as XastElement)
            .forEach((metaElement) => {
              if (metaElement.name === 'meta' && metaElement.attributes) {
                const { name, content } = metaElement.attributes;
                if (name && content) {
                  metadata[name] = content;
                }
              }
            });
          return; // Found head, stop searching
        }

        // Recursively search in children
        if (xastElement.children) {
          findMetadata(xastElement.children);
        }
      });
  };

  findMetadata(tree.children);
  return metadata;
}

/**
 * Extract metadata from a DAISY XAST tree
 *
 * @param tree - The XAST tree (could be complete DAISY document or partial)
 * @returns Metadata as key-value pairs
 *
 * @example
 * ```js
 * import { fromXml } from 'xast-util-from-xml'
 * import { extractDaisyMetadata } from 'hast-util-from-daisy'
 *
 * const xast = fromXml(daisyXmlString)
 * const metadata = extractDaisyMetadata(xast)
 * console.log(metadata['dtb:uid'])
 * ```
 */
export function extractDaisyMetadata(tree: XastRoot): Record<string, string> {
  return extractMetadata(tree);
}

/**
 * Convert a complete DAISY v3 XML document string to HTML semantic elements in HAST.
 *
 * @param xmlString - The complete DAISY XML document as a string
 * @param options - Configuration options
 * @returns An object with `{ tree, metadata }`:
 *   - `tree`: The transformed HAST tree with DAISY elements converted to HTML
 *   - `metadata`: Key-value pairs extracted from the DAISY document head
 *
 * @example
 * ```js
 * const daisyXml = `<?xml version="1.0" encoding="UTF-8"?>
 * <!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
 *   "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
 * <dtbook version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/dtbook/">
 *   <head>
 *     <meta name="dtb:uid" content="example-123" />
 *     <meta name="dc:Title" content="Example Book" />
 *   </head>
 *   <book>
 *     <frontmatter>
 *       <level1><hd>Chapter 1</hd></level1>
 *     </frontmatter>
 *   </book>
 * </dtbook>`
 *
 * const { tree, metadata } = fromDaisyXml(daisyXml)
 * console.log(metadata['dtb:uid']) // "example-123"
 * console.log(metadata['dc:Title']) // "Example Book"
 * // tree contains the transformed HAST tree
 * ```
 */
export function fromDaisyXml(
  xmlString: string,
  options: FromDaisyOptions = {},
): {
  tree: Root;
  metadata: Record<string, string>;
} {
  try {
    // Parse the complete DAISY XML document using xast-util-from-xml
    const xastTree = fromXml(xmlString);

    // Always extract metadata from DAISY documents
    const metadata = extractMetadata(xastTree);

    // Extract book content
    const bookContent = extractBookContent(xastTree);

    if (!bookContent) {
      throw new Error('No book content found in DAISY document');
    }

    // Create a temporary XAST root with just the book content
    const bookXast: XastRoot = {
      type: 'root',
      children: bookContent.children || [],
    };

    // Transform using existing fromDaisy function
    const result = fromDaisy(bookXast, options);

    return {
      tree: result,
      metadata,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse DAISY XML: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}
