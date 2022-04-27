/**
 * @license
 * Copyright 2022 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

 foam.CLASS({
  package: 'foam.u2.wizard.wao',
  name: 'PrerequisiteWAO',
  implements: [ 'foam.u2.wizard.wao.WAO' ],
  flags: ['web'],
  extends: 'foam.u2.wizard.wao.ProxyWAO',
  issues: [
    'Explore an efficient way to be able to load from any prequisite descendent of a wizardlet'
  ],

  imports: [
    'wizardlets',
    'capabilityToPrerequisite'
  ],
  requires: [
    'foam.u2.wizard.FObjectHolder'
  ],

  documentation: `
  A WAO that loads from a direct (for now) prerequisite wizardlet's data
  `,
  
  properties: [
    {
      class: 'String',
      name: 'prerequisiteCapabilityId'
    },
    {
      class: 'foam.u2.wizard.PathProperty',
      documentation: `
        OPTIONAL: For loading from the CapabilityJunction's data using a path
      `,
      name: 'loadFromPath'
    },
    {
      class: 'foam.u2.wizard.PathProperty',
      documentation: `
        OPTIONAL: For loading into the CapabilityJunction's data using a path
      `,
      name: 'loadIntoPath'
    },
    {
      class: 'Boolean',
      name: 'isWrappedInFObjectHolder'
    },
    {
      class: 'Class',
      name: 'of'
    }
  ],

  methods: [
    async function load(wizardlet) {
      wizardlet.isLoaded = false;

      const isDescendantCheck = this.capabilityToPrerequisite[`${wizardlet.id}:${this.prerequisiteCapabilityId}`];

      if ( ! isDescendantCheck ) {
        console.error(
          `prerequisiteCapabilityId: ${this.prerequisiteCapabilityId} is not a prerequisite to ${wizardlet.id}`
        );
        return;
      }

      const prereqWizardlet = this.wizardlets.filter( wizardlet => wizardlet.id === this.prerequisiteCapabilityId )[0];


      if ( ! prereqWizardlet.of ) {
        console.error(
          `prerequisiteCapabilityId: ${this.prerequisiteCapabilityId} has no data`
        );
        return;
    }

      let prereqWizardletData = prereqWizardlet.data;

      if ( ! prereqWizardletData ) {
        // if data is undefined then create a fresh instance
        prereqWizardletData = this.of.create({}, this)
      }

      let clonedPrereqWizardletData;

      if ( this.loadFromPath  ){
        var loadedFromData = this.loadFromPath.f(prereqWizardletData);

        if ( ! loadedFromData ){
          console.error(
            `prerequisiteCapabilityId: ${this.prerequisiteCapabilityId}'s data returns null for the path ${this.loadFromPath.toSummary()}`
          );
          if ( this.of ) {
            wizardlet.data = this.of.create({}, this);
            return;
          }
        }

        clonedPrereqWizardletData = loadedFromData.clone();
      } else {
        clonedPrereqWizardletData = prereqWizardletData.clone();
      }

      if ( this.isWrappedInFObjectHolder ){
        const fObjectHolder = this.FObjectHolder.create({ fobject: clonedPrereqWizardletData });

        wizardlet.data = fObjectHolder;

        wizardlet.isLoaded = true;

        return fObjectHolder;
      }

      if ( this.loadIntoPath ){

        if ( ! wizardlet.data ){
          wizardlet.data = this.of.create({}, this);
        }

        this.loadIntoPath$set(wizardlet.data, clonedPrereqWizardletData);
        wizardlet.isLoaded = true;

        return;
      }

      wizardlet.data = clonedPrereqWizardletData;
      wizardlet.isLoaded = true;

      return clonedPrereqWizardletData;
    }
  ]
});