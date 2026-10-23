import { describe, expect, it } from 'vitest';
import { plainText, umlEnterEdit } from '@/canvas/umlEnter';

const CLASS = 'User\n--\n+ id: UUID\n- name: string\n--\n+ save(): void';
const at = (text: string, needle: string) => text.indexOf(needle) + needle.length;

describe('UML class smart Enter', () => {
  it('continues the visibility marker on an attribute row', () => {
    expect(umlEnterEdit(CLASS, at(CLASS, '+ id: UUID'))).toEqual({ remove: 0, insert: '\n+ ' });
    expect(umlEnterEdit(CLASS, at(CLASS, '- name: string'))).toEqual({ remove: 0, insert: '\n- ' });
    expect(umlEnterEdit(CLASS, CLASS.length)).toEqual({ remove: 0, insert: '\n+ ' });
  });

  it('keeps indentation and normalises the marker spacing', () => {
    const t = 'A\n--\n  #count:int';
    expect(umlEnterEdit(t, t.length)).toEqual({ remove: 0, insert: '\n  # ' });
    const plainIndent = 'A\n--\n    value';
    expect(umlEnterEdit(plainIndent, plainIndent.length)).toEqual({ remove: 0, insert: '\n    ' });
  });

  it('drops the marker when Enter is pressed on an empty row', () => {
    const t = 'A\n--\n+ id\n+ ';
    expect(umlEnterEdit(t, t.length)).toEqual({ remove: 2, insert: '' });
  });

  it('falls back to a plain newline elsewhere', () => {
    expect(umlEnterEdit(CLASS, at(CLASS, 'User\n--'))).toBeNull(); // on a separator
    expect(umlEnterEdit('A\n--\nname', 'A\n--\nname'.length)).toBeNull(); // no marker / indent
    expect(umlEnterEdit(CLASS, at(CLASS, 'User\n--\n+'))).toBeNull(); // caret inside the marker
    expect(umlEnterEdit(CLASS, 2)).toBeNull(); // header of a class that has compartments
  });

  it('adds the attribute compartment from the header of a bare class', () => {
    expect(umlEnterEdit('Order', 5)).toEqual({ remove: 0, insert: '\n--\n+ ' });
    expect(umlEnterEdit('«interface»\nRepo', '«interface»'.length)).toBeNull(); // not at the end of the header
  });

  it('serialises <br> line breaks and the caret offset', () => {
    const root = document.createElement('div');
    root.innerHTML = 'A<br>--<br>+ id';
    const last = root.lastChild!;
    expect(plainText(root, last, 2)).toEqual({ text: 'A\n--\n+ id', caret: 7 });
    expect(plainText(root, root, 2)).toEqual({ text: 'A\n--\n+ id', caret: 2 });
  });
});
