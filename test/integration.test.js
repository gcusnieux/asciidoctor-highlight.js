const Asciidoctor = require('@asciidoctor/core')
const dedent = require('dedent')
const test = require('tape')

const extension = require('../lib')


const asciidoctor = Asciidoctor()
const registry = asciidoctor.Extensions.create()
extension.register(registry)


const defaultAttributes = {
  'source-highlighter': 'highlightjs-ext',
}

const testCases = {
  'Source block with language when source-highlighter is not highlightjs-ext': {
    attributes: { 'source-highlighter': 'html-pipeline' },
    given: `
      [source, ruby]
      puts 'Hello, world!'
    `,
    expected: `
      puts 'Hello, world!'
    `,
  },

  'Source block without language when highlightjs-default-lang is "none" (default)': {
    given: `
      [source]
      puts 'Hello, world!'
    `,
    expected: `
      puts 'Hello, world!'
    `,
  },

  'Source block without language when highlightjs-default-lang is "auto"': {
    attributes: { 'highlightjs-default-lang': 'auto' },
    given: `
      [source]
      puts 'Hello, world!'
    `,
    expected: `
      <span class="hljs-attribute">puts</span> <span class="hljs-string">'Hello, world!'</span>
    `,
  },

  'Source block with unsupported language': {
    given: `
      [source, foobar]
      puts 'Hello, world!'
    `,
    expected: `
      puts 'Hello, world!'
    `,
  },

  'Source block with unsupported language and callouts': {
    given: `
      [source, foobar]
      ----
      local adoc = require 'asciidoctor'  -- <1>

      print('Hello, world!')  -- <2> <3>
      print('How are you?')
      ----
    `,
    expected: `
      local adoc = require 'asciidoctor'  -- <b class="conum">(1)</b>

      print('Hello, world!')  -- <b class="conum">(2)</b> <b class="conum">(3)</b>
      print('How are you?')
    `,
  },

  'Source block with supported language': {
    given: `
      [source, ruby]
      puts 'Hello, world!'
    `,
    expected: `
      puts <span class="hljs-string">'Hello, world!'</span>
    `,
  },

  'Source block without language when source-language is set to a supported language': {
    given: `
      :source-language: ruby

      [source]
      puts 'Hello, world!'
    `,
    expected: `
      puts <span class="hljs-string">'Hello, world!'</span>
    `,
  },

  'Source block with subs="+attributes"': {
    given: `
      :message: Hello, #{subject}!

      [source, ruby, subs="+attributes"]
      puts "{message}"
    `,
    expected: `
      puts <span class="hljs-string">"Hello, #{subject}!"</span>
    `,
  },

  'Source block with subs="attributes+"': {
    given: `
      :message: Hello, #{subject}!

      [source, ruby, subs="attributes+"]
      puts "{message}"
    `,
    expected: `
      puts <span class="hljs-string">"Hello, <span class="hljs-subst">#{subject}</span>!"</span>
    `,
  },

  'Source block with callouts': {
    given: `
      [source, ruby]
      ----
      require 'asciidoctor'  # <1>

      puts 'Hello, world!'   # <2> <3>
      puts 'How are you?'
      ----
    `,
    expected: `
      <span class="hljs-keyword">require</span> <span class="hljs-string">'asciidoctor'</span>  <b class="conum">(1)</b>

      puts <span class="hljs-string">'Hello, world!'</span>    &lt;<span class="hljs-number">3</span>&gt;<b class="conum">(2)</b>
      puts <span class="hljs-string">'How are you?'</span>
    `,
  },

  'Source block with passthrough and macros substitution enabled': {
    given: `
      [source, ruby, subs="macros"]
      puts '+++<strong>Oh hai!</strong>+++'
    `,
    expected: `
      puts <span class="hljs-string">'<strong>Oh hai!</strong>'</span>
    `,
  },
}
for (let [msg, obj] of Object.entries(testCases)) {
  test(msg, t => {
    const attributes = { ...defaultAttributes, ...(obj.attributes || {}) }
    const doc = parse(obj.given, attributes)

    const actual = doc.findBy({ context: 'listing' })[0].getContent()
    const expected = dedent(obj.expected.trim())

    t.isEqual(actual, expected, `should render: ${expected}`)
    t.end()
  })
}

test('Source block inside a table cell', t => {
  const doc = parse(`
    |====
    | This is a normal cell text
    a|
    [source, ruby]
    puts "Hello from table!"
    |====
  `)

  const actual = doc
    .findBy({ context: 'table' })[0]
    .getRows().getBody()[1][0]  // cell
    .getInnerDocument().getBlocks()[0]  // listing
    .getContent()
  const expected = 'puts <span class="hljs-string">"Hello from table!"</span>'

  t.isEqual(actual, expected, `should render: ${expected}`)
  t.end()
})


function parse (text, attributes = defaultAttributes) {
  text = dedent(text.trim())
  return asciidoctor.load(text, { attributes, 'extension_registry': registry })
}
