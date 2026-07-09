import React from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import { ARDUINO_FUNCTIONS, ARDUINO_CONSTANTS } from '../arduino/arduinoApiDocs';

// Self-host Monaco from the local package instead of its CDN default,
// consistent with this app's fully-local toolchain.
loader.config({ monaco });

// Only the plain editor worker is needed - this editor only ever uses the
// `cpp` language (below) with our own completion/hover providers, which run
// on the main thread, not one of Monaco's dedicated language-service
// workers (typescript/json/etc). See vite.config.js for why this is wired
// up via Vite's native `?worker` import rather than vite-plugin-monaco-editor.
self.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

let providersRegistered = false;
function registerArduinoLanguageSupport() {
  if (providersRegistered) return;
  providersRegistered = true;

  monaco.languages.registerCompletionItemProvider('cpp', {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const functionSuggestions = ARDUINO_FUNCTIONS.map((fn) => ({
        label: fn.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: fn.name,
        detail: fn.signature,
        documentation: fn.doc,
        range,
      }));
      const constantSuggestions = ARDUINO_CONSTANTS.map((c) => ({
        label: c.name,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: c.name,
        documentation: c.doc,
        range,
      }));
      return { suggestions: [...functionSuggestions, ...constantSuggestions] };
    },
  });

  monaco.languages.registerHoverProvider('cpp', {
    provideHover(model, position) {
      const word = model.getWordAtPosition(position);
      if (!word) return null;
      const fn = ARDUINO_FUNCTIONS.find((f) => f.name === word.word);
      if (fn) {
        return { contents: [{ value: `\`\`\`cpp\n${fn.signature}\n\`\`\`` }, { value: fn.doc }] };
      }
      const constant = ARDUINO_CONSTANTS.find((c) => c.name === word.word);
      if (constant) {
        return { contents: [{ value: `**${constant.name}**` }, { value: constant.doc }] };
      }
      return null;
    },
  });
}

registerArduinoLanguageSupport();

export default function CodeEditor({ value, onChange }) {
  return (
    <Editor
      height="100%"
      language="cpp"
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        automaticLayout: true,
        tabSize: 2,
      }}
    />
  );
}
