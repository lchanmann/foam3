/**
* @license
* Copyright 2021 The FOAM Authors. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

foam.CLASS({
  package: 'foam.box.sf',
  name: 'SFEntry',
  extends: 'foam.nanos.medusa.MedusaEntry',

  properties: [
    {
      class: 'FObjectProperty',
      of: 'foam.core.FObject',
      name: 'object',
      storageTransient: false
    },
    {
      class: 'Long',
      name: 'scheduledTime',
      storageTransient: true,
      clusterTransient: true,
      value: 0
    },
    {
      class: 'Long',
      name: 'curStep',
      value: 0,
      storageTransient: true,
      clusterTransient: true,
    },
    {
      class: 'Int',
      name: 'retryAttempt',
      value: 0,
      storageTransient: true,
      clusterTransient: true,
    },
    {
      class: 'FObjectProperty',
      of: 'foam.box.sf.SF',
      name: 'sf',
      storageTransient: true,
      clusterTransient: true,
    },
    {
      class: 'FObjectProperty',
      of: 'foam.box.sf.SFFileJournal',
      name: 'journal',
      storageTransient: true,
      clusterTransient: true,
    },
    {
      class: 'String',
      name: 'fileName',
      storageTransient: true,
      clusterTransient: true,
    },
    {
      name: 'retryStrategy',
      class: 'FObjectProperty',
      of: 'foam.util.retry.RetryStrategy',
      storageTransient: true,
      clusterTransient: true,
    },
    {
      class: 'Long',
      name: 'fileOffset',
      clusterTransient: true,
    },
    {
      name: 'status',
      class: 'Enum',
      of: 'foam.box.sf.SFStatus',
      value: 'FAILURE',
      clusterTransient: true,
    },
  ]
})