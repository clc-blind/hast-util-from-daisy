# hast-util-from-daisy

[![Build](https://github.com/clc-blind/hast-util-from-daisy/actions/workflows/ci.yml/badge.svg)](https://github.com/clc-blind/hast-util-from-daisy/actions)
[![Coverage](https://codecov.io/github/clc-blind/hast-util-from-daisy/branch/main/graph/badge.svg)](https://codecov.io/github/clc-blind/hast-util-from-daisy)
[![Downloads](https://img.shields.io/npm/dm/@clc-blind/hast-util-from-daisy.svg)](https://www.npmjs.com/package/@clc-blind/hast-util-from-daisy)
[![Size](https://bundlejs.com/?q=@clc-blind/hast-util-from-daisy&badge=detailed)](https://bundlejs.com/?q=@clc-blind/hast-util-from-daisy)

[hast](https://github.com/syntax-tree/hast) utility to transform complete DAISY v3 XML documents to semantic HTML with metadata preservation.

## Contents

- [What is this?](#what-is-this)
- [When should I use this?](#when-should-i-use-this)
- [Install](#install)
- [Use](#use)
- [API](#api)
  - [`fromDaisyXml(xmlString[, options])`](#fromdaisyxmlxmlstring-options)
  - [`fromDaisy(tree[, options])`](#fromdaisytree-options)
  - [`fromDaisyClone(tree[, options])`](#fromdaisyclonetree-options)
  - [`extractDaisyMetadata(tree)`](#extractdaisymetadatatree)
  - [`isDaisyElement(tagName)`](#isdaisyelementtagname)
  - [`getDaisyMapping(tagName)`](#getdaisymappingtagname)
  - [`Options`](#options)
- [Examples](#examples)
  - [Complete DAISY document conversion](#complete-daisy-document-conversion)
  - [Working with metadata](#working-with-metadata)
  - [XAST tree conversion](#xast-tree-conversion)
  - [Custom mappings](#custom-mappings)
- [DAISY to HTML Mapping](#daisy-to-html-mapping)
  - [Element Conversion Philosophy](#element-conversion-philosophy)
  - [Document Structure Elements](#document-structure-elements)
  - [Navigation and Hierarchy Elements](#navigation-and-hierarchy-elements)
  - [Text Structure Elements](#text-structure-elements)
  - [Notes and Annotations](#notes-and-annotations)
  - [Specialized Content Elements](#specialized-content-elements)
  - [List Elements](#list-elements)
- [Types](#types)
- [Compatibility](#compatibility)
- [Security](#security)
- [Related](#related)
- [Contribute](#contribute)
- [License](#license)

## What is this?

This package is a utility that transforms complete DAISY v3 XML documents to semantic HTML elements in HAST (HTML AST), with full metadata preservation. It intelligently converts DAISY-specific elements while preserving standard HTML elements as-is.

The utility handles the complete DAISY v3 specification including:

- **Complete document parsing**: XML declaration, DOCTYPE, and full document structure
- **Metadata extraction**: Preserves Dublin Core and DAISY-specific metadata from document head
- **Smart element mapping**: Only converts DAISY-specific elements, leaving standard HTML unchanged
- **Accessibility preservation**: Maintains semantic meaning and accessibility features
- **Attribute handling**: Preserves ARIA labels, IDs, classes, and other important attributes

## When should I use this?

This utility is ideal when you need to:

- Convert complete DAISY v3 XML documents to web-ready HTML
- Preserve document metadata alongside transformed content
- Build accessibility-focused web applications from DAISY content
- Transform DAISY audiobooks for web presentation while maintaining semantic structure
- Create tools that bridge DAISY and modern web standards

This is particularly valuable for digital publishing platforms, educational technology, accessibility tools, and any application that needs to work with both DAISY and HTML content standards.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
In Node.js (version 16+), install with [npm](https://docs.npmjs.com/cli/install):

```sh
npm install @clc-blind/hast-util-from-daisy
```

In Deno with [esm.sh](https://esm.sh/):

```js
import { fromDaisy } from 'https://esm.sh/@clc-blind/hast-util-from-daisy@1';
```

In browsers with [esm.sh](https://esm.sh/):

```html
<script type="module">
  import { fromDaisy } from 'https://esm.sh/@clc-blind/hast-util-from-daisy@1?bundle';
</script>
```

## Use

Say we have the following complete DAISY v3 XML document `example.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
  "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
<dtbook version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="example-123" />
    <meta name="dc:Title" content="Example DAISY Book" />
    <meta name="dc:Creator" content="Jane Doe" />
    <meta name="dtb:totalTime" content="01:23:45" />
  </head>
  <book>
    <frontmatter>
      <level1>
        <hd>Table of Contents</hd>
        <list type="ol">
          <li><a href="#ch1">Chapter 1: Introduction</a></li>
          <li><a href="#ch2">Chapter 2: Methods</a></li>
        </list>
      </level1>
    </frontmatter>
    <bodymatter>
      <level1 id="ch1">
        <pagenum id="page1">1</pagenum>
        <hd>Chapter 1: Introduction</hd>
        <p>This is the <strong>introduction</strong> chapter with <em>emphasis</em>.</p>
        <prodnote render="optional">
          This chapter contains technical diagrams.
        </prodnote>
      </level1>
    </bodymatter>
  </book>
</dtbook>
```

…and our module `example.js` looks as follows:

```js
import { fromDaisyXml } from '@clc-blind/hast-util-from-daisy';
import { toHtml } from 'hast-util-to-html';
import { readFileSync } from 'node:fs';

const xml = readFileSync('example.xml', 'utf8');
const result = fromDaisyXml(xml);

console.log('Metadata:', result.metadata);
console.log('HTML:', toHtml(result));
```

…then running `node example.js` yields:

```js
// Metadata output:
{
  'dtb:uid': 'example-123',
  'dc:Title': 'Example DAISY Book',
  'dc:Creator': 'Jane Doe',
  'dtb:totalTime': '01:23:45'
}
```

```html
<!-- HTML output: -->
<section data-daisy-type="frontmatter">
  <section data-daisy-type="level-1">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="#ch1">Chapter 1: Introduction</a></li>
      <li><a href="#ch2">Chapter 2: Methods</a></li>
    </ol>
  </section>
</section>
<main data-daisy-type="bodymatter">
  <section data-daisy-type="level-1" id="ch1">
    <span id="page1" data-daisy-type="page-number">1</span>
    <h1>Chapter 1: Introduction</h1>
    <p
      >This is the <strong>introduction</strong> chapter with
      <em>emphasis</em>.</p
    >
    <aside data-daisy-type="production-note" data-daisy-render="optional">
      This chapter contains technical diagrams.
    </aside>
  </section>
</main>
```

## API

This package exports the identifiers [`fromDaisyXml`](#fromdaisyxmlxmlstring-options), [`fromDaisy`](#fromdaisytree-options), [`fromDaisyClone`](#fromdaisyclonetree-options), [`extractDaisyMetadata`](#extractdaisymetadatatree), [`isDaisyElement`](#isdaisyelementtagname), and [`getDaisyMapping`](#getdaisymappingtagname).
There is no default export.

### `fromDaisyXml(xmlString[, options])`

Convert a complete DAISY v3 XML document string to HTML semantic elements in HAST with metadata extraction.

This is the **recommended approach** for working with complete DAISY documents.

###### Parameters

- `xmlString` (`string`) — Complete DAISY XML document as string
- `options` ([`Options`](#options), optional) — configuration

###### Returns

Transform result with metadata ([`Root & { metadata: Record<string, string> }`](https://github.com/syntax-tree/hast#root)).

###### Example

```js
import { fromDaisyXml } from '@clc-blind/hast-util-from-daisy';

const daisyXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
  "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
<dtbook version="2005-1" xml:lang="en" xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="example-123" />
    <meta name="dc:Title" content="Example Book" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Chapter 1</hd>
        <p>Content here</p>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

const result = fromDaisyXml(daisyXml);

console.log(result.metadata['dtb:uid']); // => 'example-123'
console.log(result.metadata['dc:Title']); // => 'Example Book'
// result also contains the transformed HAST tree
```

### `fromDaisy(tree[, options])`

Convert DAISY elements to HTML semantic elements in a HAST tree.

Use this when you already have an XAST tree (from `xast-util-from-xml`) and want to transform just the content portion.

###### Parameters

- `tree` ([`Root`](https://github.com/syntax-tree/xast#root)) — XAST tree to transform
- `options` ([`Options`](#options), optional) — configuration

###### Returns

Transform result ([`Root`](https://github.com/syntax-tree/hast#root)).

###### Example

```js
import { fromXml } from 'xast-util-from-xml';
import { fromDaisy } from '@clc-blind/hast-util-from-daisy';

const xml = '<level1><hd>Chapter 1</hd><p>Content</p></level1>';
const xast = fromXml(xml);
const hast = fromDaisy(xast);

console.log(hast);
// {
//   type: 'root',
//   children: [{
//     type: 'element',
//     tagName: 'section',
//     properties: {'data-daisy-type': 'level-1'},
//     children: [
//       {
//         type: 'element',
//         tagName: 'h1',
//         properties: {},
//         children: [{type: 'text', value: 'Chapter 1'}]
//       },
//       {
//         type: 'element',
//         tagName: 'p',
//         properties: {},
//         children: [{type: 'text', value: 'Content'}]
//       }
//     ]
//   }]
// }
```

### `fromDaisyClone(tree[, options])`

Convert DAISY elements to HTML semantic elements in a cloned XAST tree (non-mutating version).

###### Parameters

- `tree` ([`Root`](https://github.com/syntax-tree/xast#root)) — XAST tree to transform (will not be modified)
- `options` ([`Options`](#options), optional) — configuration

###### Returns

Transform result ([`Root`](https://github.com/syntax-tree/hast#root)).

This function deep clones the input tree before transformation, ensuring the original XAST remains unchanged.

### `extractDaisyMetadata(tree)`

Extract metadata from a DAISY XAST tree.

Use this when you need to extract metadata from a DAISY document that's already been parsed to XAST.

###### Parameters

- `tree` ([`Root`](https://github.com/syntax-tree/xast#root)) — XAST tree to extract metadata from

###### Returns

Metadata as key-value pairs (`Record<string, string>`).

###### Example

```js
import { fromXml } from 'xast-util-from-xml';
import { extractDaisyMetadata } from '@clc-blind/hast-util-from-daisy';

const daisyXml = `<?xml version="1.0"?>
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="book-123" />
    <meta name="dc:Title" content="My Book" />
    <meta name="dc:Creator" content="Author Name" />
  </head>
  <book>
    <!-- content -->
  </book>
</dtbook>`;

const xast = fromXml(daisyXml);
const metadata = extractDaisyMetadata(xast);

console.log(metadata);
// {
//   'dtb:uid': 'book-123',
//   'dc:Title': 'My Book',
//   'dc:Creator': 'Author Name'
// }
```

### `isDaisyElement(tagName)`

Check if an element is a DAISY-specific element that needs conversion.

###### Parameters

- `tagName` (`string`) — element name to check

###### Returns

Whether the element is a DAISY element (`boolean`).

###### Example

```js
import { isDaisyElement } from '@clc-blind/hast-util-from-daisy';

console.log(isDaisyElement('level1')); // => true
console.log(isDaisyElement('prodnote')); // => true
console.log(isDaisyElement('p')); // => false
```

### `getDaisyMapping(tagName)`

Get the HTML equivalent tag name for a DAISY element.

###### Parameters

- `tagName` (`string`) — DAISY element name

###### Returns

HTML tag name (`string`) or `undefined` if not a DAISY element.

###### Example

```js
import { getDaisyMapping } from '@clc-blind/hast-util-from-daisy';

console.log(getDaisyMapping('level1')); // => 'section'
console.log(getDaisyMapping('prodnote')); // => 'aside'
console.log(getDaisyMapping('hd')); // => 'h1'
```

### `Options`

Configuration for the transformation (TypeScript type).

###### Fields

- `preserveDataAttributes` (`boolean`, default: `false`) — whether to preserve data attributes from source
- `customMappings` (`Record<string, DaisyElementMapping>`, optional) — custom element mappings to override defaults

The `DaisyElementMapping` type has these fields:

- `tagName` (`string`) — target HTML element name
- `dataType` (`string`, optional) — value for `data-daisy-type` attribute
- `preserveAttributes` (`Array<string>`, optional) — attributes to preserve from source
- `roleAttribute` (`string`, optional) — ARIA role to add

###### Example

```js
import { fromDaisy } from '@clc-blind/hast-util-from-daisy';

const options = {
  customMappings: {
    'special-element': {
      tagName: 'article',
      dataType: 'special',
      preserveAttributes: ['id', 'class'],
      roleAttribute: 'region',
    },
  },
};

const result = fromDaisy(tree, options);
```

## Examples

### Complete DAISY document conversion

Transform a complete DAISY v3 XML document with metadata:

```js
import { fromDaisyXml } from '@clc-blind/hast-util-from-daisy';
import { toHtml } from 'hast-util-to-html';
import { readFileSync } from 'node:fs';

const daisyXml = readFileSync('book.xml', 'utf8');
const result = fromDaisyXml(daisyXml);

// Access metadata
console.log('Book ID:', result.metadata['dtb:uid']);
console.log('Title:', result.metadata['dc:Title']);
console.log('Author:', result.metadata['dc:Creator']);
console.log('Duration:', result.metadata['dtb:totalTime']);

// Convert to HTML
const html = toHtml(result);
console.log(html);
```

### Working with metadata

Extract and use metadata separately:

```js
import {
  fromDaisyXml,
  extractDaisyMetadata,
} from '@clc-blind/hast-util-from-daisy';
import { fromXml } from 'xast-util-from-xml';

const daisyXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE dtbook PUBLIC "-//NISO//DTD dtbook 2005-1//EN"
  "http://www.daisy.org/z3986/2005/dtbook-2005-1.dtd">
<dtbook xmlns="http://www.daisy.org/z3986/2005/dtbook/">
  <head>
    <meta name="dtb:uid" content="unique-book-id" />
    <meta name="dc:Title" content="Advanced Topics" />
    <meta name="dc:Language" content="en" />
    <meta name="dtb:totalTime" content="02:15:30" />
  </head>
  <book>
    <bodymatter>
      <level1>
        <hd>Introduction</hd>
        <p>Welcome to this comprehensive guide.</p>
      </level1>
    </bodymatter>
  </book>
</dtbook>`;

// Method 1: Using fromDaisyXml (recommended for complete documents)
const result = fromDaisyXml(daisyXml);
console.log('Complete transformation:', {
  metadata: result.metadata,
  hasContent: result.children.length > 0,
});

// Method 2: Extract metadata separately
const xast = fromXml(daisyXml);
const metadata = extractDaisyMetadata(xast);
console.log('Metadata only:', metadata);
```

### XAST tree conversion

Work with pre-parsed XAST trees:

```js
import { fromXml } from 'xast-util-from-xml';
import { fromDaisy, fromDaisyClone } from '@clc-blind/hast-util-from-daisy';

const daisyFragment = `
  <level1>
    <hd>Chapter Title</hd>
    <p>This is a <strong>paragraph</strong> with <pagenum>42</pagenum> content.</p>
    <prodnote render="optional">Producer note here.</prodnote>
    <level2>
      <hd>Subsection</hd>
      <p>More content here.</p>
    </level2>
  </level1>
`;

const xast = fromXml(daisyFragment);

// Mutating conversion
const hast1 = fromDaisy(xast);

// Non-mutating conversion (original xast preserved)
const hast2 = fromDaisyClone(xast);

console.log(
  'Both results are equivalent:',
  JSON.stringify(hast1) === JSON.stringify(hast2),
);
```

### Custom mappings

Override default mappings for specific elements:

```js
import { fromDaisy } from '@clc-blind/hast-util-from-daisy';

const customMappings = {
  // Convert custom DAISY elements
  'special-note': {
    tagName: 'aside',
    dataType: 'special-note',
    roleAttribute: 'note',
  },
  // Override default mapping for production notes
  prodnote: {
    tagName: 'div',
    dataType: 'producer-note',
    preserveAttributes: ['render', 'id'],
  },
};

const result = fromDaisy(xast, { customMappings });
```

## DAISY to HTML Mapping

This section provides a comprehensive reference for how DAISY v3 elements are
transformed to semantic HTML. The library follows a **smart conversion philosophy**:
only DAISY-specific elements are converted, while standard HTML elements are preserved as-is.

### Element Conversion Philosophy

The transformation strategy prioritizes semantic preservation and web standards compliance:

- **HTML elements preserved**: Standard HTML elements (`<p>`, `<div>`, `<span>`, `<strong>`, `<em>`, `<blockquote>`, `<table>`, etc.) are left unchanged
- **DAISY elements converted**: Only DAISY-specific elements that don't exist in HTML are transformed
- **Deprecated elements modernized**: Deprecated HTML elements like `<acronym>` are converted to modern equivalents (`<abbr>`)
- **Attributes preserved**: All important attributes (IDs, classes, ARIA labels) are maintained
- **Data attributes added**: DAISY-specific information is preserved via `data-daisy-*` attributes

**Example of mixed content handling:**

```xml
<!-- Input DAISY -->
<level1>
  <hd>Chapter Title</hd>
  <p>Regular <strong>HTML</strong> content.</p>
  <pagenum>42</pagenum>
  <prodnote>DAISY-specific note</prodnote>
</level1>
```

```html
<!-- Output HTML -->
<section data-daisy-type="level-1">
  <h1>Chapter Title</h1>
  <p>Regular <strong>HTML</strong> content.</p>
  <!-- HTML preserved -->
  <span data-daisy-type="page-number">42</span>
  <!-- DAISY converted -->
  <aside data-daisy-type="production-note">DAISY-specific note</aside>
  <!-- DAISY converted -->
</section>
```

### Document Structure Elements

| DAISY Element   | HTML Mapping | Semantic Role          | Primary Attributes              | Rationale                                                       |
| --------------- | ------------ | ---------------------- | ------------------------------- | --------------------------------------------------------------- |
| `<dtbook>`      | `<main>`     | `role="document"`      | `data-daisy-type="dtbook"`      | Main represents primary content, role clarifies document nature |
| `<book>`        | `<article>`  | Self-contained content | `data-daisy-type="book"`        | Article represents complete, independent content                |
| `<frontmatter>` | `<section>`  | Document section       | `data-daisy-type="frontmatter"` | Section with semantic identifier maintains structure            |
| `<bodymatter>`  | `<main>`     | Primary content        | `data-daisy-type="bodymatter"`  | Main for primary content area                                   |
| `<rearmatter>`  | `<section>`  | Document section       | `data-daisy-type="rearmatter"`  | Section maintains document structure semantics                  |

### Navigation and Hierarchy Elements

| DAISY Element           | HTML Mapping     | Semantic Role          | Primary Attributes               | Implementation Notes                                  |
| ----------------------- | ---------------- | ---------------------- | -------------------------------- | ----------------------------------------------------- |
| `<level>`, `<level1-6>` | `<section>`      | Hierarchical sections  | `data-daisy-type="level-1"` etc. | Section preserves hierarchy with level indication     |
| `<hd>`                  | `<h1>` to `<h6>` | Heading based on level | Dynamic based on nesting         | Native HTML headings maintain accessibility hierarchy |
| `<bridgehead>`          | `<h3>`           | Subheading             | `data-daisy-type="bridgehead"`   | Consistent h3 for bridgeheads regardless of context   |
| `<pagenum>`             | `<span>`         | Page marker            | `data-daisy-type="page-number"`  | Span with data attributes for screen reader control   |

### Document Metadata Elements

| DAISY Element  | HTML Mapping | Semantic Role   | Primary Attributes                  | Usage Context          |
| -------------- | ------------ | --------------- | ----------------------------------- | ---------------------- |
| `<doctitle>`   | `<h1>`       | Document title  | `data-daisy-type="document-title"`  | Main document title    |
| `<docauthor>`  | `<div>`      | Document author | `data-daisy-type="document-author"` | Document author info   |
| `<covertitle>` | `<h2>`       | Cover title     | `data-daisy-type="cover-title"`     | Cover/title page title |
| `<author>`     | `<cite>`     | Author citation | `data-daisy-type="author"`          | Author attribution     |

### Text Structure Elements

| DAISY Element | HTML Mapping | Semantic Role     | Primary Attributes            | Usage Context                      |
| ------------- | ------------ | ----------------- | ----------------------------- | ---------------------------------- |
| `<linegroup>` | `<div>`      | Text grouping     | `data-daisy-type="linegroup"` | Poetry, drama, structured text     |
| `<line>`      | `<span>`     | Text line         | `data-daisy-type="line"`      | Individual lines within linegroup  |
| `<linenum>`   | `<span>`     | Line numbering    | `data-daisy-type="linenum"`   | Line numbers for reference         |
| `<sent>`      | `<span>`     | Sentence boundary | `data-daisy-type="sentence"`  | Sentence-level markup for TTS      |
| `<w>`         | `<span>`     | Word boundary     | `data-daisy-type="word"`      | Word-level markup for fine control |

### Notes and Annotations

| DAISY Element  | HTML Mapping | Semantic Role         | Primary Attributes                  | Accessibility Features                           |
| -------------- | ------------ | --------------------- | ----------------------------------- | ------------------------------------------------ |
| `<prodnote>`   | `<aside>`    | Supplementary content | `data-daisy-type="production-note"` | Aside semantically represents producer notes     |
| `<noteref>`    | `<a>`        | Note reference link   | `data-daisy-type="note-ref"`        | Anchor maintains linking with enhanced semantics |
| `<annoref>`    | `<a>`        | Annotation ref link   | `data-daisy-type="annotation-ref"`  | Links to annotations with semantic marking       |
| `<annotation>` | `<aside>`    | Annotation content    | `data-daisy-type="annotation"`      | Aside for supplementary annotation content       |
| `<note>`       | `<aside>`    | Note content          | `data-daisy-type="note"`            | General note content as aside                    |

### Specialized Content Elements

| DAISY Element | HTML Mapping   | Semantic Role       | Primary Attributes           | Content Type                  |
| ------------- | -------------- | ------------------- | ---------------------------- | ----------------------------- |
| `<sidebar>`   | `<aside>`      | Sidebar content     | `data-daisy-type="sidebar"`  | Tangential content            |
| `<epigraph>`  | `<blockquote>` | Quotation           | `data-daisy-type="epigraph"` | Opening quotations            |
| `<poem>`      | `<article>`    | Self-contained poem | `data-daisy-type="poem"`     | Poetic content                |
| `<byline>`    | `<div>`        | Author attribution  | `data-daisy-type="byline"`   | Author/byline information     |
| `<dateline>`  | `<div>`        | Date information    | `data-daisy-type="dateline"` | Date and location information |

### List Elements

| DAISY Element | HTML Mapping     | Semantic Role       | Primary Attributes                      | List Type Handling                     |
| ------------- | ---------------- | ------------------- | --------------------------------------- | -------------------------------------- |
| `<list>`      | `<ul>` or `<ol>` | List container      | Based on `type` attribute               | `type="ol"` → `<ol>`, otherwise `<ul>` |
| `<lic>`       | `<span>`         | List item component | `data-daisy-type="list-item-component"` | Components within list items           |

### Special Element Handling

| DAISY Element | HTML Mapping | Conversion Rule                  | Rationale                               |
| ------------- | ------------ | -------------------------------- | --------------------------------------- |
| `<acronym>`   | `<abbr>`     | Converted with `data-daisy-type` | `<acronym>` is deprecated in HTML5      |
| `<imggroup>`  | `<figure>`   | Semantic figure container        | Figure better represents grouped images |

### Preserved HTML Elements

The following elements are **not converted** and remain as standard HTML:

**Text content**: `<p>`, `<div>`, `<span>`, `<blockquote>`, `<pre>`
**Inline semantics**: `<strong>`, `<em>`, `<code>`, `<kbd>`, `<samp>`, `<cite>`, `<q>`, `<abbr>`, `<dfn>`, `<sub>`, `<sup>`, `<bdo>`
**Lists**: `<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`
**Tables**: `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`, `<caption>`, `<col>`, `<colgroup>`
**Media**: `<img>`, `<audio>`, `<video>`
**Links**: `<a>`, `<link>`
**Forms**: `<form>`, `<input>`, `<button>`, `<select>`, `<textarea>`, etc.
**Sectioning**: `<section>`, `<article>`, `<aside>`, `<nav>`, `<header>`, `<footer>`, `<main>`
**Headings**: `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`
**Metadata**: `<head>`, `<title>`, `<meta>`, `<style>`, `<script>`

> **Note**: The transformation preserves all original attributes from DAISY
> elements while adding semantic HTML equivalents. Custom attributes are
> converted to `data-daisy-*` format to maintain information while ensuring HTML
> validity.

## Types

This package is fully typed with [TypeScript](https://www.typescriptlang.org/).
It exports the additional types [`Options`](#options) and `DaisyElementMapping`.

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

This package is compatible with Node.js 16+.
It works with `xast-util-from-xml` version 4+, and integrates well with the
broader unified ecosystem including `rehype` and `hast-util-*` packages.

## Security

This utility processes XML content and generates HTML. When working with
untrusted content, consider using appropriate sanitization tools like
[`hast-util-sanitize`](https://github.com/syntax-tree/hast-util-sanitize) on the
output.

The transformation preserves most attributes and content from the source DAISY
document, including IDs and classes, which could potentially be used for DOM
clobbering attacks if not properly sanitized.

## Related

- [`xast-util-from-xml`](https://github.com/syntax-tree/xast-util-from-xml) —
  parse XML to xast
- [`hast-util-to-html`](https://github.com/syntax-tree/hast-util-to-html) —
  serialize hast to HTML
- [`hast-util-sanitize`](https://github.com/syntax-tree/hast-util-sanitize) —
  sanitize hast
- [`rehype`](https://github.com/rehypejs/rehype) — HTML processor powered by plugins
- [`unified`](https://github.com/unifiedjs/unified) — interface for parsing,
  inspecting, transforming, and serializing content through syntax trees

## Contribute

See [`CONTRIBUTING.md`](CONTRIBUTING.md) in
[`clc-blind/hast-util-from-daisy`](https://github.com/clc-blind/hast-util-from-daisy)
for ways to get started.
See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for how to interact with this project.

## License

[MIT](LICENSE) © [clc-blind](https://github.com/clc-blind)
