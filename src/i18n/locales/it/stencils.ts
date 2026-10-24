import type en from '../../en/stencils';
import type { Translation } from '../../types';

export default {
  // StencilEditorDialog
  'stencils.editTitle': 'Modifica forma',
  'stencils.insertTitle': 'Inserisci forma',
  'stencils.stencilXml': 'XML stencil mxGraph',
  'stencils.builtIn': '{shape} è una forma predefinita',
  'stencils.insertSubtitle': 'Descrivi una forma in XML stencil mxGraph',
  'stencils.convertInfo':
    'Le forme predefinite sono disegnate dal codice. Applicando, questa viene convertita in una {customShape} modificabile con le proporzioni attuali; testo, stile e connessioni vengono mantenuti.',
  'stencils.customShapeTerm': 'forma personalizzata',
  'stencils.replaceInfo': 'Puoi comunque sostituirla con una forma personalizzata scritta da zero.',
  'stencils.startFromSample': 'Inizia da un esempio',
  'stencils.fileType': 'XML stencil',
  'stencils.customShape': 'Forma personalizzata',
  'stencils.addedToScratchpad': '“{name}” aggiunta al Blocco appunti',
  'stencils.noShape': 'Nessun <shape> in questo file.',
  'stencils.firstOfMany': 'È stata caricata la prima di {count} forme. Importa il file come libreria per ottenerle tutte.',
  'stencils.fixToPreview': 'Correggi l’XML per vedere un’anteprima',
  'stencils.nothingToPreview': 'Niente da visualizzare in anteprima',
  'stencils.aspect': 'proporzioni {aspect}',
  'stencils.connectionPoints': '{count, plural, one {# punto di connessione} other {# punti di connessione}}',
  'stencils.stroke': 'linea {width}',
  'stencils.strokeFromStyle': 'linea dallo stile',
  'stencils.ignored': 'Ignorati: {items}',
  'stencils.openXml': 'Apri XML…',
  'stencils.revert': 'Ripristina',
  'stencils.convertApply': 'Converti e applica',
  'stencils.addToScratchpad': 'Aggiungi al Blocco appunti',

  // convert.ts — why a built-in shape can't become a stencil ({shape} is the shape name)
  'stencils.convert.noStencil': 'Questa forma personalizzata non ha ancora uno stencil.',
  'stencils.convert.ownText': '{shape} disegna il proprio testo, che gli stencil non possono rappresentare.',
  'stencils.convert.unsupported': '{shape} è una forma predefinita che usa funzioni non rappresentabili dagli stencil ({why}).',
  'stencils.convert.dynamic': 'rendering dinamico',
  'stencils.convert.noOutline': '{shape} non ha un contorno da convertire.',
} satisfies Translation<typeof en>;
