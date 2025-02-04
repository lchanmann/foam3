/**
 * @license
 * Copyright 2018 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.auth',
  name: 'HtmlDoc',

  documentation: 'Model to store html documents',

  tableColumns: [ 'id', 'name', 'issuedDate' ],

  properties: [
    {
      class: 'Long',
      name: 'id'
    },
    {
      class: 'String',
      name: 'name'
    },
    {
      class: 'Date',
      name: 'issuedDate',
      label: 'Effective Date',
      tableCellFormatter: function(date) {
        this.add(date ? date.toLocaleDateString(foam.locale) : '');
      }
    },
    {
      class: 'String',
      name: 'body',
      documentation: 'Template body',
      view: { class: 'foam.u2.tag.TextArea', rows: 40, cols: 150 },
    }
  ]
});
