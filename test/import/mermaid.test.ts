import { describe, expect, it } from 'vitest';
import { importer, parseMermaid } from '@/io/import/mermaid';
import { isConnector, isShape, type ConnectorElement, type Doc, type ShapeElement } from '@/model/types';

const shapes = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isShape);
const conns = (d: Doc) => d.order.map((id) => d.elements[id]).filter(isConnector);
const byText = (d: Doc, t: string) => shapes(d).find((s) => s.text === t) as ShapeElement;
const docOf = (src: string) => parseMermaid(src).pages[0].doc;

describe('mermaid flowchart', () => {
  const src = `---
title: Checkout
---
flowchart LR
  %% a comment
  A([Start]) --> B{Valid?}
  B -- Yes --> C[Pay]
  B -->|No| D[[Fix input]]
  D -.-> B
  C ==> E[(Orders DB)]
  C --- F((Done)) & G{{Hex}}
  H[/In/] --> I[\\Out\\] --> J[/Trap\\]
  K>Flag] --x L(Rounded) --o M[\\Inv/]
  N <--> O
  P ~~~ Q
  R@{ shape: doc, label: "A doc" }
  subgraph pay [Payment area]
    C
    subgraph inner["Inner"]
      E
    end
  end
  classDef hot fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
  class D hot
  style G fill:#ff0,stroke-width:3px
  linkStyle 0 stroke:#f00
  click A callback`;

  it('parses nodes, kinds and labels', () => {
    const res = parseMermaid(src);
    expect(res.pages[0].name).toBe('Checkout');
    const d = res.pages[0].doc;
    expect(byText(d, 'Start').kind).toBe('flow.terminator');
    expect(byText(d, 'Valid?').kind).toBe('diamond');
    expect(byText(d, 'Fix input').kind).toBe('flow.predefined');
    expect(byText(d, 'Orders DB').kind).toBe('cylinder');
    expect(byText(d, 'Done').kind).toBe('ellipse');
    expect(byText(d, 'Hex').kind).toBe('hexagon');
    expect(byText(d, 'In').kind).toBe('parallelogram');
    expect(byText(d, 'Trap').kind).toBe('trapezoid');
    expect(byText(d, 'Rounded').style.radius).toBeGreaterThan(0);
    expect(byText(d, 'Pay').style.radius).toBe(0);
    expect(byText(d, 'A doc').kind).toBe('flow.document');
  });

  it('builds edges with arrowheads, labels and line styles', () => {
    const d = docOf(src);
    const cs = conns(d);
    expect(cs).toHaveLength(12); // 13 declared, ~~~ is layout-only
    const ids = new Map(shapes(d).map((s) => [s.id, s.text]));
    const edge = (a: string, b: string) => cs.find((c) => ids.get(c.source.elementId!) === a && ids.get(c.target.elementId!) === b) as ConnectorElement;
    expect(edge('Valid?', 'Pay').text).toBe('Yes');
    expect(edge('Valid?', 'Fix input').text).toBe('No');
    expect(edge('Fix input', 'Valid?').style.strokeStyle).toBe('dashed');
    expect(edge('Pay', 'Orders DB').style.strokeWidth).toBe(3);
    expect(edge('Pay', 'Done').endArrow).toBe('none');
    expect(edge('Pay', 'Hex').endArrow).toBe('none');
    expect(edge('Flag', 'Rounded').endArrow).toBe('cross');
    expect(edge('Rounded', 'Inv').endArrow).toBe('circle');
    expect(edge('N', 'O').startArrow).toBe('triangle');
    expect(edge('N', 'O').endArrow).toBe('triangle');
    expect(edge('Start', 'Valid?').style.stroke).toBe('#ff0000');
    for (const c of cs) expect(c.source.side).toBe('auto');
  });

  it('turns subgraphs into nested containers and applies styles', () => {
    const d = docOf(src);
    const pay = byText(d, 'Payment area');
    const inner = byText(d, 'Inner');
    expect(pay.kind).toBe('group');
    expect(inner.containerId).toBe(pay.id);
    expect(byText(d, 'Orders DB').containerId).toBe(inner.id);
    expect(byText(d, 'Pay').containerId).toBe(pay.id);
    const fix = byText(d, 'Fix input');
    expect(fix.style.fill).toBe('#fee2e2');
    expect(fix.style.textColor).toBe('#7f1d1d');
    expect(byText(d, 'Hex').style.fill).toBe('#ffff00');
    expect(byText(d, 'Hex').style.strokeWidth).toBe(3);
    // Children inside their container.
    const db = byText(d, 'Orders DB');
    expect(db.x).toBeGreaterThanOrEqual(inner.x);
    expect(db.y + db.h).toBeLessThanOrEqual(inner.y + inner.h);
  });

  it('supports one-line graphs and detection', () => {
    const d = docOf('graph TD; a-->b; b-->c');
    expect(shapes(d)).toHaveLength(3);
    expect(conns(d)).toHaveLength(2);
    expect(importer.detect!('sequenceDiagram\nA->>B: hi')).toBe(true);
    expect(importer.detect!('hello world')).toBe(false);
  });

  it('rejects unsupported diagrams', () => {
    expect(() => parseMermaid('gantt\n  title x')).toThrow(/Unsupported/);
  });
});

describe('mermaid sequence', () => {
  const src = `sequenceDiagram
  autonumber
  actor U as User
  participant W as Web App
  participant DB
  U->>+W: Login
  W->>DB: Query user
  DB-->>W: Row
  Note right of DB: Indexed lookup
  alt valid
    W-->>U: Welcome
  else invalid
    W--xU: Error
  end
  loop Every minute
    W-)W: Heartbeat
  end
  Note over U,W: Session started
  W->>-U: Done`;

  it('creates lifelines, messages, notes and frames', () => {
    const d = docOf(src);
    const s = shapes(d);
    const lifelines = s.filter((x) => x.kind === 'uml.lifeline');
    expect(lifelines.map((l) => l.text)).toEqual(['«actor»\nUser', 'Web App', 'DB']);
    const msgs = conns(d).filter((c) => c.text);
    expect(msgs).toHaveLength(7);
    expect(msgs[0].text).toBe('1. Login');
    expect(msgs[2].style.strokeStyle).toBe('dashed');
    expect(msgs[4].endArrow).toBe('cross');
    expect(msgs[5].endArrow).toBe('arrow');
    expect(msgs[5].waypoints).toHaveLength(2);
    expect(s.filter((x) => x.kind === 'uml.note')).toHaveLength(2);
    const frames = s.filter((x) => x.kind === 'uml.frame');
    expect(frames.map((f) => f.text).sort()).toEqual(['alt', 'loop']);
    expect(s.some((x) => x.text === '[invalid]')).toBe(true);
    // activation bar from +W ... -W
    expect(s.some((x) => x.kind === 'rectangle' && x.w === 12)).toBe(true);
    // messages go downwards in order
    for (let i = 1; i < msgs.length; i++) expect(msgs[i].source.y).toBeGreaterThan(msgs[i - 1].source.y);
    // message endpoints sit on lifeline centers
    const web = lifelines[1];
    expect(msgs[1].source.x).toBe(Math.round(web.x + web.w / 2));
  });
});

describe('mermaid class diagram', () => {
  it('maps classes, members and relations', () => {
    const d = docOf(`classDiagram
  direction LR
  class Animal {
    <<abstract>>
    +String name
    +int age
    +makeSound() void
  }
  class List~T~
  Animal <|-- Dog
  Animal <|-- Cat
  Zoo "1" *-- "many" Animal : contains
  Zoo o-- Keeper
  Dog ..> Bone : chews
  Cat ..|> Pet
  Dog --> Owner
  Dog : +bark()
  note for Dog "Good boy"`);
    const animal = shapes(d).find((s) => s.text.includes('\nAnimal\n'))!;
    expect(animal.kind).toBe('uml.class');
    expect(animal.text).toBe('«abstract»\nAnimal\n--\n+String name\n+int age\n--\n+makeSound() void');
    expect(shapes(d).find((s) => s.text.startsWith('List<T>'))).toBeTruthy();
    expect(shapes(d).find((s) => s.text.startsWith('Dog'))!.text).toContain('+bark()');
    const cs = conns(d);
    expect(cs).toHaveLength(8);
    const find = (from: string, to: string) => {
      const f = shapes(d).find((s) => s.text.split('\n').includes(from))!;
      const t = shapes(d).find((s) => s.text.split('\n').includes(to))!;
      return cs.find((c) => c.source.elementId === f.id && c.target.elementId === t.id)!;
    };
    expect(find('Animal', 'Dog').startArrow).toBe('triangleOpen');
    expect(find('Zoo', 'Animal').startArrow).toBe('diamond');
    expect(find('Zoo', 'Animal').text).toBe('1  contains  many');
    expect(find('Zoo', 'Keeper').startArrow).toBe('diamondOpen');
    expect(find('Dog', 'Bone').endArrow).toBe('arrow');
    expect(find('Dog', 'Bone').style.strokeStyle).toBe('dashed');
    expect(find('Cat', 'Pet').endArrow).toBe('triangleOpen');
    expect(find('Dog', 'Owner').endArrow).toBe('arrow');
    expect(shapes(d).some((s) => s.kind === 'uml.note' && s.text === 'Good boy')).toBe(true);
  });
});

describe('mermaid ER diagram', () => {
  it('maps entities, attributes and crow\'s feet', () => {
    const d = docOf(`erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
  PRODUCT |o--o| LINE-ITEM : "is in"
  CUSTOMER {
    string id PK
    string name "full name"
    string email UK
  }
  ORDER {
    int id PK
    string customerId FK
  }
  CAR one or more to zero or one DRIVER : drives`);
    const s = shapes(d);
    expect(s.every((x) => x.kind === 'erd.entity')).toBe(true);
    expect(s).toHaveLength(7);
    expect(s.find((x) => x.text.startsWith('CUSTOMER'))!.text).toBe('CUSTOMER\n--\nPK id  string\nname  string\nUK email  string');
    const cs = conns(d);
    expect(cs).toHaveLength(5);
    expect([cs[0].startArrow, cs[0].endArrow]).toEqual(['erOnlyOne', 'erZeroMany']);
    expect([cs[1].startArrow, cs[1].endArrow]).toEqual(['erOnlyOne', 'erOneMany']);
    expect([cs[2].startArrow, cs[2].endArrow]).toEqual(['erOneMany', 'erOneMany']);
    expect(cs[2].style.strokeStyle).toBe('dashed');
    expect([cs[3].startArrow, cs[3].endArrow]).toEqual(['erZeroOne', 'erZeroOne']);
    expect(cs[3].text).toBe('is in');
    expect([cs[4].startArrow, cs[4].endArrow]).toEqual(['erOneMany', 'erZeroOne']);
  });
});

describe('mermaid state diagram', () => {
  it('maps states, pseudo states and composites', () => {
    const d = docOf(`stateDiagram-v2
  [*] --> Idle
  Idle --> Running : start
  Running --> Idle : stop
  Running --> Check
  state Check <<choice>>
  Check --> Done : ok
  Check --> Failed
  state Failed {
    [*] --> Retry
    Retry --> [*]
  }
  Done --> [*]
  Idle : waiting for work
  note right of Running : busy`);
    const s = shapes(d);
    expect(s.filter((x) => x.kind === 'uml.initial')).toHaveLength(2);
    expect(s.filter((x) => x.kind === 'uml.final')).toHaveLength(2);
    expect(s.find((x) => x.kind === 'diamond')).toBeTruthy();
    const failed = s.find((x) => x.text === 'Failed')!;
    expect(failed.kind).toBe('group');
    expect(s.find((x) => x.text === 'Retry')!.containerId).toBe(failed.id);
    expect(s.find((x) => x.text.startsWith('Idle'))!.text).toBe('Idle\nwaiting for work');
    expect(s.find((x) => x.kind === 'uml.note')!.text).toBe('busy');
    const cs = conns(d);
    expect(cs).toHaveLength(10);
    expect(cs.filter((c) => c.text === 'start')).toHaveLength(1);
  });
});

describe('mermaid mindmap', () => {
  it('builds a tree from indentation', () => {
    const d = docOf(`mindmap
  root((Project))
    Goals
      Speed
      [Quality]
    Risks
      ::icon(fa fa-bomb)
      {{Budget}}`);
    const s = shapes(d);
    expect(s).toHaveLength(6);
    expect(s.find((x) => x.text === 'Project')!.kind).toBe('ellipse');
    expect(s.find((x) => x.text === 'Budget')!.kind).toBe('hexagon');
    const cs = conns(d);
    expect(cs).toHaveLength(5);
    expect(cs.every((c) => c.endArrow === 'none')).toBe(true);
    const goals = s.find((x) => x.text === 'Goals')!;
    const speed = s.find((x) => x.text === 'Speed')!;
    expect(cs.some((c) => c.source.elementId === goals.id && c.target.elementId === speed.id)).toBe(true);
  });
});
