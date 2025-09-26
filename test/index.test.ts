import type { Element } from 'hast';
import { describe, expect, it } from 'vitest';
import type { Element as XastElement, Root as XastRoot } from 'xast';
import {
  extractDaisyMetadata,
  fromDaisy,
  fromDaisyClone,
  fromDaisyXml,
  getDaisyMapping,
  isDaisyElement,
} from '../lib';

describe('hast-util-from-daisy', () => {
  describe('DAISY v3 Specification Examples', () => {
    it('should convert complete frontmatter structure from specification', () => {
      // Based on actual DAISY v3 specification example
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'frontmatter',
            attributes: {},
            children: [
              {
                type: 'element',
                name: 'level1',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'pagenum',
                    attributes: { id: 'IDA3K23' },
                    children: [{ type: 'text', value: '1' }],
                  },
                  {
                    type: 'element',
                    name: 'h1',
                    attributes: {},
                    children: [{ type: 'text', value: 'Balance and Motion' }],
                  },
                  {
                    type: 'element',
                    name: 'p',
                    attributes: {},
                    children: [
                      { type: 'text', value: 'Developed at ' },
                      {
                        type: 'element',
                        name: 'strong',
                        attributes: {},
                        children: [
                          { type: 'text', value: 'Lawrence Hall of Science' },
                        ],
                      },
                      {
                        type: 'text',
                        value: ' University of California at Berkeley',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'element',
                name: 'level1',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'pagenum',
                    attributes: { id: 'IDA4EUP' },
                    children: [{ type: 'text', value: '2' }],
                  },
                  {
                    type: 'element',
                    name: 'h1',
                    attributes: {},
                    children: [{ type: 'text', value: 'Table of Contents' }],
                  },
                  {
                    type: 'element',
                    name: 'list',
                    attributes: { type: 'pl' },
                    children: [
                      {
                        type: 'element',
                        name: 'li',
                        attributes: {},
                        children: [
                          { type: 'text', value: 'Make It Balance! 3' },
                        ],
                      },
                      {
                        type: 'element',
                        name: 'li',
                        attributes: {},
                        children: [{ type: 'text', value: 'Push or Pull? 11' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const frontmatter = result.children[0] as Element;
      const firstLevel = frontmatter.children[0] as Element;
      const pagenum = firstLevel.children[0] as Element;
      const heading = firstLevel.children[1] as Element;

      expect(frontmatter.tagName).toBe('section');
      expect(frontmatter.properties?.['data-daisy-type']).toBe('frontmatter');

      expect(firstLevel.tagName).toBe('section');
      expect(firstLevel.properties?.['data-daisy-type']).toBe('level-1');

      expect(pagenum.tagName).toBe('span');
      expect(pagenum.properties?.['data-daisy-type']).toBe('page-number');
      expect(pagenum.properties?.id).toBe('IDA3K23');

      expect(heading.tagName).toBe('h1');
    });

    it('should handle bridgehead elements from specification', () => {
      // Based on DAISY v3 specification bridgehead example
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'level2',
            attributes: { class: 'chapter' },
            children: [
              {
                type: 'element',
                name: 'h2',
                attributes: {},
                children: [{ type: 'text', value: 'Chapter 3: The Mission' }],
              },
              {
                type: 'element',
                name: 'bridgehead',
                attributes: {},
                children: [{ type: 'text', value: 'Arriving by sea' }],
              },
              {
                type: 'element',
                name: 'p',
                attributes: {},
                children: [
                  {
                    type: 'text',
                    value: 'Some content about arriving by sea...',
                  },
                ],
              },
              {
                type: 'element',
                name: 'bridgehead',
                attributes: {},
                children: [{ type: 'text', value: 'Arriving by land' }],
              },
              {
                type: 'element',
                name: 'p',
                attributes: {},
                children: [
                  {
                    type: 'text',
                    value: 'Some content about arriving by land...',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const chapter = result.children[0] as Element;
      const mainHeading = chapter.children[0] as Element;
      const bridgehead1 = chapter.children[1] as Element;
      const bridgehead2 = chapter.children[3] as Element;

      expect(chapter.tagName).toBe('section');
      expect(chapter.properties?.['data-daisy-type']).toBe('level-2');

      expect(mainHeading.tagName).toBe('h2');

      expect(bridgehead1.tagName).toBe('h3');
      expect(bridgehead1.properties?.['data-daisy-type']).toBe('bridgehead');
      expect(bridgehead2.tagName).toBe('h3');
      expect(bridgehead2.properties?.['data-daisy-type']).toBe('bridgehead');
    });

    it('should handle pagenum with special attributes', () => {
      // Based on DAISY v3 specification pagenum examples with special pages
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'p',
            attributes: {},
            children: [
              { type: 'text', value: 'Regular content ' },
              {
                type: 'element',
                name: 'pagenum',
                attributes: { id: 'IDALIBR', page: 'special' },
                children: [{ type: 'text', value: 'D-14' }],
              },
              { type: 'text', value: ' more content.' },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const paragraph = result.children[0] as Element;
      const pagenum = paragraph.children[1] as Element;

      expect(pagenum.tagName).toBe('span');
      expect(pagenum.properties?.['data-daisy-type']).toBe('page-number');
      expect(pagenum.properties?.id).toBe('IDALIBR');
      expect(pagenum.properties?.['data-daisy-page']).toBe('special');
    });

    it('should convert producer notes with render attributes', () => {
      // Based on DAISY v3 specification prodnote examples
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'level1',
            attributes: {},
            children: [
              {
                type: 'element',
                name: 'h1',
                attributes: {},
                children: [{ type: 'text', value: 'Chapter Title' }],
              },
              {
                type: 'element',
                name: 'prodnote',
                attributes: { render: 'optional' },
                children: [
                  {
                    type: 'text',
                    value:
                      'This chapter includes mathematical expressions that may be difficult to read without visual formatting.',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const section = result.children[0] as Element;
      const prodnote = section.children[1] as Element;

      expect(prodnote.tagName).toBe('aside');
      expect(prodnote.properties?.['data-daisy-type']).toBe('production-note');
      expect(prodnote.properties?.['data-daisy-render']).toBe('optional');
    });

    it('should handle list structures with list components', () => {
      // Based on DAISY v3 specification list with lic examples
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'list',
            attributes: { type: 'pl' },
            children: [
              {
                type: 'element',
                name: 'hd',
                attributes: {},
                children: [{ type: 'text', value: 'Table of Contents' }],
              },
              {
                type: 'element',
                name: 'li',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'lic',
                    attributes: {},
                    children: [
                      { type: 'text', value: 'Chapter 1: Introduction' },
                    ],
                  },
                  {
                    type: 'element',
                    name: 'lic',
                    attributes: {},
                    children: [{ type: 'text', value: '1' }],
                  },
                ],
              },
              {
                type: 'element',
                name: 'li',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'lic',
                    attributes: {},
                    children: [{ type: 'text', value: 'Chapter 2: Methods' }],
                  },
                  {
                    type: 'element',
                    name: 'lic',
                    attributes: {},
                    children: [{ type: 'text', value: '15' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const list = result.children[0] as Element;
      const heading = list.children[0] as Element;
      const firstItem = list.children[1] as Element;
      const firstLic = firstItem.children[0] as Element;

      expect(list.tagName).toBe('ul');
      expect(heading.tagName).toBe('h3');
      expect(firstLic.tagName).toBe('span');
      expect(firstLic.properties?.['data-daisy-type']).toBe(
        'list-item-component',
      );
    });

    it('should handle definition lists from specification', () => {
      // Based on DAISY v3 specification dl examples
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'dl',
            attributes: {},
            children: [
              {
                type: 'element',
                name: 'dt',
                attributes: {},
                children: [{ type: 'text', value: 'Photosynthesis' }],
              },
              {
                type: 'element',
                name: 'dd',
                attributes: {},
                children: [
                  {
                    type: 'text',
                    value:
                      'The process by which plants convert light energy into chemical energy.',
                  },
                ],
              },
              {
                type: 'element',
                name: 'dt',
                attributes: {},
                children: [{ type: 'text', value: 'Chlorophyll' }],
              },
              {
                type: 'element',
                name: 'dd',
                attributes: {},
                children: [
                  {
                    type: 'text',
                    value:
                      'The green pigment found in plants that captures light energy.',
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const dl = result.children[0] as Element;

      expect(dl.tagName).toBe('dl');
      expect(dl.children).toHaveLength(4);
      expect((dl.children[0] as Element).tagName).toBe('dt');
      expect((dl.children[1] as Element).tagName).toBe('dd');
    });
  });

  describe('Edge Cases and Accessibility', () => {
    it('should preserve accessibility attributes and IDs', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'level1',
            attributes: {
              id: 'chapter-1',
              'aria-label': 'Introduction Chapter',
              class: 'introduction',
              role: 'region',
            },
            children: [
              {
                type: 'element',
                name: 'hd',
                attributes: { id: 'heading-1' },
                children: [{ type: 'text', value: 'Introduction' }],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const section = result.children[0] as Element;
      const heading = section.children[0] as Element;

      expect(section.properties?.id).toBe('chapter-1');
      expect(section.properties?.['aria-label']).toBe('Introduction Chapter');
      expect(section.properties?.className).toBe('introduction');
      expect(section.properties?.role).toBe('region');
      expect(heading.properties?.id).toBe('heading-1');
    });

    it('should handle deeply nested level hierarchy', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'level1',
            attributes: {},
            children: [
              {
                type: 'element',
                name: 'hd',
                attributes: {},
                children: [{ type: 'text', value: 'Level 1' }],
              },
              {
                type: 'element',
                name: 'level2',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'hd',
                    attributes: {},
                    children: [{ type: 'text', value: 'Level 2' }],
                  },
                  {
                    type: 'element',
                    name: 'level3',
                    attributes: {},
                    children: [
                      {
                        type: 'element',
                        name: 'hd',
                        attributes: {},
                        children: [{ type: 'text', value: 'Level 3' }],
                      },
                      {
                        type: 'element',
                        name: 'level4',
                        attributes: {},
                        children: [
                          {
                            type: 'element',
                            name: 'hd',
                            attributes: {},
                            children: [{ type: 'text', value: 'Level 4' }],
                          },
                          {
                            type: 'element',
                            name: 'level5',
                            attributes: {},
                            children: [
                              {
                                type: 'element',
                                name: 'hd',
                                attributes: {},
                                children: [{ type: 'text', value: 'Level 5' }],
                              },
                              {
                                type: 'element',
                                name: 'level6',
                                attributes: {},
                                children: [
                                  {
                                    type: 'element',
                                    name: 'hd',
                                    attributes: {},
                                    children: [
                                      { type: 'text', value: 'Level 6' },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const level1 = result.children[0] as Element;
      const h1 = level1.children[0] as Element;
      const level2 = level1.children[1] as Element;
      const h2 = level2.children[0] as Element;
      const level3 = level2.children[1] as Element;
      const h3 = level3.children[0] as Element;
      const level4 = level3.children[1] as Element;
      const h4 = level4.children[0] as Element;
      const level5 = level4.children[1] as Element;
      const h5 = level5.children[0] as Element;
      const level6 = level5.children[1] as Element;
      const h6 = level6.children[0] as Element;

      expect(h1.tagName).toBe('h1');
      expect(h2.tagName).toBe('h2');
      expect(h3.tagName).toBe('h3');
      expect(h4.tagName).toBe('h4');
      expect(h5.tagName).toBe('h5');
      expect(h6.tagName).toBe('h6');
    });

    it('should handle mixed content with inline elements', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'p',
            attributes: {},
            children: [
              { type: 'text', value: 'This is ' },
              {
                type: 'element',
                name: 'em',
                attributes: {},
                children: [{ type: 'text', value: 'emphasized text' }],
              },
              { type: 'text', value: ' and this is ' },
              {
                type: 'element',
                name: 'strong',
                attributes: {},
                children: [{ type: 'text', value: 'strong text' }],
              },
              { type: 'text', value: ' with a ' },
              {
                type: 'element',
                name: 'pagenum',
                attributes: { id: 'page123' },
                children: [{ type: 'text', value: '123' }],
              },
              { type: 'text', value: ' page break.' },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const paragraph = result.children[0] as Element;
      const pagenum = paragraph.children[5] as Element;

      expect(paragraph.tagName).toBe('p');
      expect(pagenum.tagName).toBe('span');
      expect(pagenum.properties?.['data-daisy-type']).toBe('page-number');
      expect(pagenum.properties?.id).toBe('page123');
    });

    it('should preserve existing HTML elements unchanged', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'p',
            attributes: { class: 'text' },
            children: [{ type: 'text', value: 'Regular paragraph' }],
          },
          {
            type: 'element',
            name: 'div',
            attributes: { id: 'content' },
            children: [],
          },
        ],
      };

      const result = fromDaisy(input);
      const paragraph = result.children[0] as Element;
      const div = result.children[1] as Element;

      expect(paragraph.tagName).toBe('p');
      expect(paragraph.properties?.className).toBe('text');
      expect(div.tagName).toBe('div');
      expect(div.properties?.id).toBe('content');
    });
  });

  describe('Utility Functions', () => {
    it('should identify DAISY elements correctly', () => {
      expect(isDaisyElement('level1')).toBe(true);
      expect(isDaisyElement('prodnote')).toBe(true);
      expect(isDaisyElement('bridgehead')).toBe(true);
      expect(isDaisyElement('hd')).toBe(true);
      expect(isDaisyElement('pagenum')).toBe(true);
      expect(isDaisyElement('p')).toBe(false);
      expect(isDaisyElement('div')).toBe(false);
    });

    it('should provide correct HTML mappings', () => {
      expect(getDaisyMapping('level1')).toBe('section');
      expect(getDaisyMapping('prodnote')).toBe('aside');
      expect(getDaisyMapping('bridgehead')).toBe('h3');
      expect(getDaisyMapping('hd')).toBe('h1');
      expect(getDaisyMapping('pagenum')).toBe('span');
      expect(getDaisyMapping('nonexistent')).toBeUndefined();
    });

    it('should not mutate original tree with fromDaisyClone', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'level1',
            attributes: { class: 'chapter' },
            children: [
              {
                type: 'element',
                name: 'hd',
                attributes: {},
                children: [{ type: 'text', value: 'Chapter 1' }],
              },
            ],
          },
        ],
      };

      const originalElementName = (input.children[0] as XastElement).name;
      const result = fromDaisyClone(input);

      // Original should be unchanged
      expect((input.children[0] as XastElement).name).toBe('level1');
      expect(originalElementName).toBe('level1');

      // Result should be transformed
      const section = result.children[0] as Element;
      expect(section.tagName).toBe('section');
      expect(section.properties?.['data-daisy-type']).toBe('level-1');
    });

    it('should support custom mappings through options', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'custom-element',
            attributes: { class: 'special' },
            children: [{ type: 'text', value: 'Custom content' }],
          },
        ],
      };

      const result = fromDaisy(input, {
        customMappings: {
          'custom-element': { tagName: 'article', dataType: 'custom' },
        },
      });

      const article = result.children[0] as Element;
      expect(article.tagName).toBe('article');
      expect(article.properties?.['data-daisy-type']).toBe('custom');
      expect(article.properties?.className).toBe('special');
    });

    it('should handle list type conversion correctly', () => {
      const input: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'list',
            attributes: { type: 'ol' },
            children: [
              {
                type: 'element',
                name: 'li',
                attributes: {},
                children: [{ type: 'text', value: 'Item 1' }],
              },
            ],
          },
          {
            type: 'element',
            name: 'list',
            attributes: { type: 'ul' },
            children: [
              {
                type: 'element',
                name: 'li',
                attributes: {},
                children: [{ type: 'text', value: 'Item A' }],
              },
            ],
          },
        ],
      };

      const result = fromDaisy(input);
      const orderedList = result.children[0] as Element;
      const unorderedList = result.children[1] as Element;

      expect(orderedList.tagName).toBe('ol');
      expect(unorderedList.tagName).toBe('ul');
    });
  });
});

describe('DAISY XML String Processing', () => {
  describe('fromDaisyXml', () => {
    it('should parse complete DAISY XML and return content with metadata', () => {
      const daisyXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
  "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
<dtbook version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="example-123" />
    <meta name="dc:Title" content="Example Book" />
    <meta name="dc:Creator" content="Test Author" />
    <meta name="dtb:totalTime" content="01:23:45" />
  </head>
  <book>
    <frontmatter>
      <level1>
        <hd>Introduction</hd>
        <p>This is an example DAISY book.</p>
      </level1>
    </frontmatter>
    <bodymatter>
      <level1>
        <hd>Chapter 1</hd>
        <p>Content of chapter 1.</p>
        <level2>
          <hd>Section 1.1</hd>
          <p>Subsection content.</p>
        </level2>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

      const result = fromDaisyXml(daisyXml);

      // Check that metadata is extracted
      expect(result.metadata).toBeDefined();
      expect(result.metadata['dtb:uid']).toBe('example-123');
      expect(result.metadata['dc:Title']).toBe('Example Book');
      expect(result.metadata['dc:Creator']).toBe('Test Author');
      expect(result.metadata['dtb:totalTime']).toBe('01:23:45');

      // Filter out text nodes (whitespace) to get only elements
      const elements = result.tree.children.filter(
        (child) => child.type === 'element',
      );
      expect(elements).toHaveLength(2); // frontmatter and bodymatter

      const frontmatter = elements[0] as Element;
      expect(frontmatter.tagName).toBe('section');
      expect(frontmatter.properties?.['data-daisy-type']).toBe('frontmatter');

      const level1InFrontmatter = frontmatter.children.filter(
        (child) => child.type === 'element',
      )[0] as Element;
      expect(level1InFrontmatter.tagName).toBe('section');
      expect(level1InFrontmatter.properties?.['data-daisy-type']).toBe(
        'level-1',
      );

      const headingInFrontmatter = level1InFrontmatter.children.filter(
        (child) => child.type === 'element',
      )[0] as Element;
      expect(headingInFrontmatter.tagName).toBe('h1');

      const bodymatter = elements[1] as Element;
      expect(bodymatter.tagName).toBe('main');
      expect(bodymatter.properties?.['data-daisy-type']).toBe('bodymatter');
    });

    it('should handle DAISY XML without optional elements', () => {
      const minimalDaisyXml = `<?xml version="1.0" encoding="UTF-8"?>
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="minimal-123" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Simple Chapter</hd>
        <p>Simple content.</p>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

      const result = fromDaisyXml(minimalDaisyXml);

      expect(result.metadata).toBeDefined();
      expect(result.metadata['dtb:uid']).toBe('minimal-123');

      // Filter out text nodes (whitespace) to get only elements
      const elements = result.tree.children.filter(
        (child) => child.type === 'element',
      );
      expect(elements).toHaveLength(1); // just bodymatter

      const bodymatter = elements[0] as Element;
      expect(bodymatter.tagName).toBe('main');
    });

    it('should throw error for invalid DAISY XML', () => {
      const invalidXml = `<?xml version="1.0"?>
<invalid>
  <head>
    <meta name="dtb:uid" content="test" />
  </head>
  <!-- No book element -->
</invalid>`;

      expect(() => fromDaisyXml(invalidXml)).toThrow(
        'No book content found in DAISY document',
      );
    });
  });

  describe('extractDaisyMetadata', () => {
    it('should extract metadata from XAST tree', () => {
      const xastWithMetadata: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'dtbook',
            attributes: {},
            children: [
              {
                type: 'element',
                name: 'head',
                attributes: {},
                children: [
                  {
                    type: 'element',
                    name: 'meta',
                    attributes: { name: 'dtb:uid', content: 'test-123' },
                    children: [],
                  },
                  {
                    type: 'element',
                    name: 'meta',
                    attributes: { name: 'dc:Title', content: 'Test Book' },
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      };

      const metadata = extractDaisyMetadata(xastWithMetadata);

      expect(metadata).toEqual({
        'dtb:uid': 'test-123',
        'dc:Title': 'Test Book',
      });
    });

    it('should return empty object when no metadata found', () => {
      const xastWithoutMetadata: XastRoot = {
        type: 'root',
        children: [
          {
            type: 'element',
            name: 'book',
            attributes: {},
            children: [],
          },
        ],
      };

      const metadata = extractDaisyMetadata(xastWithoutMetadata);
      expect(metadata).toEqual({});
    });
  });

  describe('HTML vs DAISY Element Handling', () => {
    it('should preserve HTML elements as-is while converting DAISY-specific elements', () => {
      const mixedXml = `<?xml version="1.0" encoding="UTF-8"?>
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="mixed-test" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Chapter Title</hd>
        <p>This is a <strong>regular</strong> HTML paragraph with <em>emphasis</em>.</p>
        <div class="custom-div">
          <span id="test-span">Regular HTML span</span>
          <pagenum page="normal">25</pagenum>
        </div>
        <prodnote render="optional">This is a DAISY production note.</prodnote>
        <blockquote>
          <p>This is a regular HTML blockquote.</p>
          <cite>Author Name</cite>
        </blockquote>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

      const result = fromDaisyXml(mixedXml);

      // Filter out text nodes for easier testing
      const elements = result.tree.children.filter(
        (child) => child.type === 'element',
      );
      expect(elements).toHaveLength(1); // bodymatter

      const bodymatter = elements[0] as Element;
      expect(bodymatter.tagName).toBe('main'); // DAISY bodymatter -> main
      expect(bodymatter.properties?.['data-daisy-type']).toBe('bodymatter');

      // Get level1 section
      const level1Elements = bodymatter.children.filter(
        (child) => child.type === 'element',
      ) as Element[];
      expect(level1Elements).toHaveLength(1);
      const level1 = level1Elements[0]!;
      expect(level1.tagName).toBe('section'); // DAISY level1 -> section
      expect(level1.properties?.['data-daisy-type']).toBe('level-1');

      // Check children of level1
      const level1Children = level1.children.filter(
        (child) => child.type === 'element',
      ) as Element[];
      expect(level1Children.length).toBeGreaterThanOrEqual(5);

      // hd should be converted to h1
      const heading = level1Children[0]!;
      expect(heading.tagName).toBe('h1'); // DAISY hd -> h1

      // p should remain as p (HTML element)
      const paragraph = level1Children[1]!;
      expect(paragraph.tagName).toBe('p'); // HTML p -> p (no conversion)

      // Check that strong and em inside p are preserved
      const pChildren = paragraph.children.filter(
        (child) => child.type === 'element',
      ) as Element[];
      expect(pChildren.some((child) => child.tagName === 'strong')).toBe(true);
      expect(pChildren.some((child) => child.tagName === 'em')).toBe(true);

      // div should remain as div (HTML element)
      const div = level1Children[2]!;
      expect(div.tagName).toBe('div'); // HTML div -> div (no conversion)
      expect(div.properties?.className).toBe('custom-div');

      // Check children of div
      const divChildren = div.children.filter(
        (child) => child.type === 'element',
      ) as Element[];
      expect(divChildren.length).toBeGreaterThanOrEqual(2);

      // span should remain as span (HTML element)
      const span = divChildren[0]!;
      expect(span.tagName).toBe('span'); // HTML span -> span (no conversion)
      expect(span.properties?.id).toBe('test-span');

      // pagenum should be converted (DAISY-specific)
      const pagenum = divChildren[1]!;
      expect(pagenum.tagName).toBe('span'); // DAISY pagenum -> span
      expect(pagenum.properties?.['data-daisy-type']).toBe('page-number');
      expect(pagenum.properties?.['data-daisy-page']).toBe('normal');

      // prodnote should be converted (DAISY-specific)
      const prodnote = level1Children[3]!;
      expect(prodnote.tagName).toBe('aside'); // DAISY prodnote -> aside
      expect(prodnote.properties?.['data-daisy-type']).toBe('production-note');
      expect(prodnote.properties?.['data-daisy-render']).toBe('optional');

      // blockquote should remain as blockquote (HTML element)
      const blockquote = level1Children[4]!;
      expect(blockquote.tagName).toBe('blockquote'); // HTML blockquote -> blockquote (no conversion)

      // cite inside blockquote should remain as cite (HTML element)
      const blockquoteChildren = blockquote.children.filter(
        (child) => child.type === 'element',
      ) as Element[];
      const cite = blockquoteChildren.find((child) => child.tagName === 'cite');
      expect(cite).toBeDefined();
      expect(cite?.tagName).toBe('cite'); // HTML cite -> cite (no conversion)
    });

    it('should handle deprecated HTML elements correctly', () => {
      const xmlWithDeprecated = `<?xml version="1.0" encoding="UTF-8"?>
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="deprecated-test" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Test</hd>
        <p>Text with <acronym title="World Health Organization">WHO</acronym> acronym.</p>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

      const result = fromDaisyXml(xmlWithDeprecated);

      // Find the acronym element
      const findAcronym = (element: Element): Element | null => {
        if (
          element.tagName === 'abbr' &&
          element.properties?.['data-daisy-type'] === 'acronym'
        ) {
          return element;
        }

        const children = element.children.filter(
          (child) => child.type === 'element',
        ) as Element[];
        // eslint-disable-next-line no-restricted-syntax
        for (const child of children) {
          const found = findAcronym(child);
          if (found) return found;
        }

        return null;
      };

      const bodymatter = result.tree.children.filter(
        (child) => child.type === 'element',
      )[0] as Element;
      const acronymElement = findAcronym(bodymatter);

      expect(acronymElement).toBeDefined();
      expect(acronymElement?.tagName).toBe('abbr'); // DAISY acronym -> abbr (converted)
      expect(acronymElement?.properties?.['data-daisy-type']).toBe('acronym');
      expect(acronymElement?.properties?.title).toBe(
        'World Health Organization',
      );
    });

    it('should convert DAISY-specific attributes to data-daisy-* format for HTML elements', () => {
      const xmlWithDaisyAttributes = `<?xml version="1.0" encoding="UTF-8"?>
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="attr-test" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Test</hd>
        <p render="optional" depth="2" custom-attr="value">Paragraph with DAISY attributes</p>
        <div page="special" class="container" id="test-div">
          <span render="required" smilref="audio.mp3">Text with DAISY attributes</span>
        </div>
        <blockquote cite="http://example.com" render="optional">
          <p>Quote with mixed attributes</p>
        </blockquote>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

      const result = fromDaisyXml(xmlWithDaisyAttributes);

      // Helper to find element by tag name and properties
      const findElement = (
        element: Element,
        tagName: string,
        testProp?: string,
      ): Element | null => {
        if (
          element.tagName === tagName &&
          (!testProp || element.properties?.[testProp])
        ) {
          return element;
        }

        const children = element.children.filter(
          (child) => child.type === 'element',
        ) as Element[];
        // eslint-disable-next-line no-restricted-syntax
        for (const child of children) {
          const found = findElement(child, tagName, testProp);
          if (found) return found;
        }

        return null;
      };

      const bodymatter = result.tree.children.filter(
        (child) => child.type === 'element',
      )[0] as Element;

      // Check paragraph with DAISY attributes
      const paragraph = findElement(bodymatter, 'p', 'data-daisy-render');
      expect(paragraph).toBeDefined();
      expect(paragraph?.tagName).toBe('p'); // HTML p preserved
      expect(paragraph?.properties?.['data-daisy-render']).toBe('optional');
      expect(paragraph?.properties?.['data-daisy-depth']).toBe('2');
      expect(paragraph?.properties?.['data-daisy-custom-attr']).toBe('value');

      // Check div with mixed attributes
      const div = findElement(bodymatter, 'div', 'data-daisy-page');
      expect(div).toBeDefined();
      expect(div?.tagName).toBe('div'); // HTML div preserved
      expect(div?.properties?.['data-daisy-page']).toBe('special');
      expect(div?.properties?.className).toBe('container'); // HTML class preserved
      expect(div?.properties?.id).toBe('test-div'); // HTML id preserved

      // Check span with DAISY attributes
      const span = findElement(bodymatter, 'span', 'data-daisy-render');
      expect(span).toBeDefined();
      expect(span?.tagName).toBe('span'); // HTML span preserved
      expect(span?.properties?.['data-daisy-render']).toBe('required');
      expect(span?.properties?.['data-daisy-smilref']).toBe('audio.mp3');

      // Check blockquote with mixed attributes
      const blockquote = findElement(bodymatter, 'blockquote', 'cite');
      expect(blockquote).toBeDefined();
      expect(blockquote?.tagName).toBe('blockquote'); // HTML blockquote preserved
      expect(blockquote?.properties?.cite).toBe('http://example.com'); // HTML cite preserved
      expect(blockquote?.properties?.['data-daisy-render']).toBe('optional'); // DAISY render converted
    });

    it('should convert all DAISY-specific attributes to data-daisy-* format', () => {
      const xmlWithDaisyAttributes = `<?xml version="1.0"?>
        <dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
          <book>
            <bodymatter>
              <prodnote render="optional" depth="2" smilref="audio.mp3" imgref="img1" pronounce="custom">
                Note with DAISY attributes
              </prodnote>
            </bodymatter>
          </book>
        </dtbook>`;

      const result = fromDaisyXml(xmlWithDaisyAttributes);

      // Find the bodymatter element (main)
      const bodymatter = result.tree.children.find(
        (child) =>
          child.type === 'element' && (child as Element).tagName === 'main',
      ) as Element | undefined;

      expect(bodymatter).toBeDefined();

      // Find the prodnote element (converted to aside)
      const prodnote = bodymatter!.children?.find(
        (child) =>
          child.type === 'element' && (child as Element).tagName === 'aside',
      ) as Element | undefined;

      expect(prodnote).toBeDefined();
      expect(prodnote?.tagName).toBe('aside');
      expect(prodnote?.properties?.['data-daisy-render']).toBe('optional');
      expect(prodnote?.properties?.['data-daisy-depth']).toBe('2');
      expect(prodnote?.properties?.['data-daisy-smilref']).toBe('audio.mp3');
      expect(prodnote?.properties?.['data-daisy-imgref']).toBe('img1');
      expect(prodnote?.properties?.['data-daisy-pronounce']).toBe('custom');
    });
  });
});
