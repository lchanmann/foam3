/**
 * @license
 * Copyright 2023 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.nanos.ticket',
  name: 'TicketCommentCompactionSink',
  extends: 'foam.dao.ProxySink',
  implements: ['foam.core.ContextAware'],

  documentation: `Sink which controls which Tickets comments can be compacted. Predicate is evaluated on owning Ticket.`,

  javaImports: [
    'foam.core.X',
    'foam.dao.DAO',
    'foam.nanos.medusa.MedusaEntry'
  ],

  properties: [
    {
      documentation: `Compact (keep) tickets comments which satisfy this predicate`,
      name: 'predicate',
      class: 'FObjectProperty',
      of: 'foam.mlang.predicate.Predicate',
      view: { class: 'foam.u2.view.JSONTextView' },
      javaFactory: `
      return foam.mlang.MLang.TRUE;
      `
    }
  ],

  methods: [
    {
      name: 'put',
      args: 'Any obj, foam.core.Detachable sub',
      javaCode: `
      X x = getX();
      MedusaEntry entry = (MedusaEntry) obj;
      DAO dao = (DAO) x.get(entry.getNSpecName());
      TicketComment comment = (TicketComment) dao.find_(x, entry.getObjectId());
      if ( comment != null ) {
        Ticket ticket = comment.findTicket(x);
        if ( getPredicate().f(ticket) ) {
          getDelegate().put(obj, sub);
        } else {
          ((foam.nanos.logger.Logger) x.get("logger")).info("TicketCommentCompactionSink,discard", comment.getId(), ticket.getId());
        }
      }
      `
    }
  ]
});
